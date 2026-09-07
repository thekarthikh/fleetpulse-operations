import { seedFleet, FLEET_SIZE } from "./seed";
import { computeHealthScore, runRules } from "./rules";
import { generateReading } from "./simulator";
import { validateTelemetry } from "./validation";
import type {
  Alert,
  Driver,
  IngestionStats,
  MaintenanceRecord,
  ServiceHistoryEntry,
  TelemetryReading,
  Vehicle,
} from "./types";

/**
 * In-memory persistence + processing store.
 *
 * Stands in for the PostgreSQL repository layer: same access shape
 * (findAll / findById / save / query with pagination + filters), so the
 * service layer above it is storage-agnostic.
 */

const HISTORY_PER_VEHICLE = 180;
const MAX_ALERTS = 600;
const ALERT_COOLDOWN_MS = 45_000;
const TICK_INTERVAL_MS = 2_000;

interface FleetState {
  vehicles: Map<string, Vehicle>;
  drivers: Map<string, Driver>;
  history: Map<string, TelemetryReading[]>;
  alerts: Alert[];
  maintenance: Map<string, MaintenanceRecord>;
  serviceHistory: ServiceHistoryEntry[];
  idleSince: Map<string, number>;
  alertCooldown: Map<string, number>;
  trend: { t: string; active: number; idle: number; alerts: number }[];
  stats: IngestionStats;
  startedAt: number;
  lastTickAt: number;
  telemetrySeq: number;
}

function createState(): FleetState {
  const { vehicles, drivers, maintenance, serviceHistory } = seedFleet();
  return {
    vehicles: new Map(vehicles.map((v) => [v.id, v])),
    drivers: new Map(drivers.map((d) => [d.id, d])),
    history: new Map(vehicles.map((v) => [v.id, [v.latest!]])),
    alerts: [],
    maintenance: new Map(maintenance.map((m) => [m.vehicleId, m])),
    serviceHistory,
    idleSince: new Map(),
    alertCooldown: new Map(),
    trend: [],
    stats: { totalIngested: 0, totalRejected: 0, lastTickDurationMs: 0, ticks: 0, uptimeSeconds: 0 },
    startedAt: Date.now(),
    lastTickAt: 0,
    telemetrySeq: 0,
  };
}

const globalRef = globalThis as unknown as { __fleetpulse__?: FleetState };
function state(): FleetState {
  if (!globalRef.__fleetpulse__) {
    globalRef.__fleetpulse__ = createState();
    // Warm the pipeline so first paint already has a few minutes of history.
    for (let i = 0; i < 40; i++) tick(3);
  }
  return globalRef.__fleetpulse__;
}

export interface IngestResult {
  accepted: boolean;
  reading?: TelemetryReading;
  alerts: Alert[];
  issues?: { field: string; message: string }[];
}

/** Telemetry Ingestion API core: validate -> persist -> rules -> state update. */
export function ingest(payload: unknown): IngestResult {
  const s = state();
  const result = validateTelemetry(payload);
  if (!result.ok) {
    s.stats.totalRejected++;
    return { accepted: false, alerts: [], issues: result.issues };
  }

  const v = s.vehicles.get(result.value.vehicleId);
  if (!v) {
    s.stats.totalRejected++;
    return { accepted: false, alerts: [], issues: [{ field: "vehicleId", message: "Unknown vehicle" }] };
  }

  const p = result.value;
  const reading: TelemetryReading = {
    id: `tel_${++s.telemetrySeq}`,
    vehicleId: p.vehicleId,
    recordedAt: p.recordedAt ?? new Date().toISOString(),
    speedKph: p.speedKph,
    latitude: p.latitude,
    longitude: p.longitude,
    heading: p.heading,
    fuelLevelPct: p.fuelLevelPct,
    batteryVoltage: p.batteryVoltage,
    rpm: p.rpm,
    engineTempC: p.engineTempC,
    tirePressurePsi: p.tirePressurePsi,
    odometerKm: p.odometerKm,
    ignitionOn: p.ignitionOn,
  };

  const hist = s.history.get(v.id)!;
  const previous = hist[hist.length - 1] ?? null;
  hist.push(reading);
  if (hist.length > HISTORY_PER_VEHICLE) hist.splice(0, hist.length - HISTORY_PER_VEHICLE);
  s.stats.totalIngested++;

  // Idle tracking feeds the idle rule.
  const now = Date.now();
  if (reading.ignitionOn && reading.speedKph < 1) {
    if (!s.idleSince.has(v.id)) s.idleSince.set(v.id, now);
  } else s.idleSince.delete(v.id);
  const idleSeconds = s.idleSince.has(v.id) ? (now - s.idleSince.get(v.id)!) / 1000 : 0;

  const candidates = runRules(v, reading, {
    previous,
    idleSeconds,
    maintenance: s.maintenance.get(v.id),
  });

  const created: Alert[] = [];
  for (const c of candidates) {
    const key = `${v.id}:${c.type}`;
    if ((s.alertCooldown.get(key) ?? 0) > now) continue;
    s.alertCooldown.set(key, now + ALERT_COOLDOWN_MS);
    const alert: Alert = {
      id: `alr_${v.id}_${c.type}_${now}`,
      vehicleId: v.id,
      vehiclePlate: v.plate,
      type: c.type,
      severity: c.severity,
      message: c.message,
      value: c.value,
      threshold: c.threshold,
      createdAt: new Date(now).toISOString(),
      acknowledged: false,
    };
    s.alerts.unshift(alert);
    created.push(alert);
  }
  if (s.alerts.length > MAX_ALERTS) s.alerts.length = MAX_ALERTS;

  // Vehicle state projection.
  const openAlerts = s.alerts.filter((a) => a.vehicleId === v.id && !a.acknowledged).slice(0, 12);
  v.latest = reading;
  v.lastSeenAt = reading.recordedAt;
  v.healthScore = computeHealthScore(reading, openAlerts);
  if (v.status !== "MAINTENANCE") {
    v.status = reading.speedKph > 1 ? "MOVING" : reading.ignitionOn ? "IDLE" : "PARKED";
  }

  const m = s.maintenance.get(v.id);
  if (m && m.status !== "COMPLETED") {
    m.status =
      reading.odometerKm >= m.dueAtOdometerKm || new Date(m.dueDate).getTime() < now
        ? "OVERDUE"
        : reading.odometerKm >= m.dueAtOdometerKm - 500
          ? "DUE"
          : "SCHEDULED";
  }

  return { accepted: true, reading, alerts: created };
}

/** One simulation tick: generate + ingest a reading for all 25 vehicles. */
export function tick(dtSeconds = 2) {
  const s = globalRef.__fleetpulse__!;
  const started = Date.now();
  let accepted = 0;
  let rejected = 0;
  const alerts: Alert[] = [];

  for (const v of s.vehicles.values()) {
    const payload = generateReading(v, dtSeconds);
    const res = ingest(payload);
    if (res.accepted) accepted++;
    else rejected++;
    alerts.push(...res.alerts);
  }

  s.stats.ticks++;
  s.stats.lastTickDurationMs = Date.now() - started;
  s.lastTickAt = Date.now();

  const vehicles = [...s.vehicles.values()];
  s.trend.push({
    t: new Date().toISOString(),
    active: vehicles.filter((v) => v.status === "MOVING").length,
    idle: vehicles.filter((v) => v.status === "IDLE").length,
    alerts: alerts.length,
  });
  if (s.trend.length > 90) s.trend.splice(0, s.trend.length - 90);

  return { accepted, rejected, alerts: alerts.length, durationMs: s.stats.lastTickDurationMs };
}

/** Lazily advance the simulation on read — keeps the demo live without a cron. */
export function ensureFresh() {
  const s = state();
  const elapsed = Date.now() - s.lastTickAt;
  if (elapsed >= TICK_INTERVAL_MS) {
    const ticks = Math.min(4, Math.floor(elapsed / TICK_INTERVAL_MS));
    for (let i = 0; i < ticks; i++) tick(TICK_INTERVAL_MS / 1000);
  }
  s.stats.uptimeSeconds = Math.round((Date.now() - s.startedAt) / 1000);
  return s;
}

// ---- Repository-style accessors -----------------------------------------

export const repo = {
  vehicles: () => [...ensureFresh().vehicles.values()],
  vehicle: (id: string) => ensureFresh().vehicles.get(id) ?? null,
  driver: (id: string) => ensureFresh().drivers.get(id) ?? null,
  history: (id: string) => [...(ensureFresh().history.get(id) ?? [])],
  allAlerts: () => [...ensureFresh().alerts],
  maintenance: () => [...ensureFresh().maintenance.values()],
  serviceHistory: (id?: string) => {
    const all = ensureFresh().serviceHistory;
    return id ? all.filter((s) => s.vehicleId === id) : [...all];
  },
  trend: () => [...ensureFresh().trend],
  stats: () => ({ ...ensureFresh().stats }),
  fleetSize: FLEET_SIZE,
  runTick: (n = 1) => {
    ensureFresh();
    let last = { accepted: 0, rejected: 0, alerts: 0, durationMs: 0 };
    for (let i = 0; i < Math.max(1, Math.min(20, n)); i++) last = tick(2);
    return last;
  },
  acknowledge: (id: string) => {
    const a = ensureFresh().alerts.find((x) => x.id === id);
    if (a) a.acknowledged = true;
    return a ?? null;
  },
};

// ---- Generic query helpers (pagination / filtering / sorting) -------------

export interface PageQuery {
  page?: number;
  size?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  sort: string | null;
  order: "asc" | "desc";
}

export function paginate<T extends Record<string, unknown>>(rows: T[], q: PageQuery): Page<T> {
  const page = Math.max(0, q.page ?? 0);
  const size = Math.min(200, Math.max(1, q.size ?? 20));
  const order = q.order === "asc" ? "asc" : "desc";
  const sorted = q.sort
    ? [...rows].sort((a, b) => {
        const av = a[q.sort!] as never;
        const bv = b[q.sort!] as never;
        if (av === bv) return 0;
        return (av > bv ? 1 : -1) * (order === "asc" ? 1 : -1);
      })
    : rows;
  const start = page * size;
  return {
    content: sorted.slice(start, start + size),
    page,
    size,
    totalElements: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / size)),
    sort: q.sort ?? null,
    order,
  };
}
