import { GEOFENCE } from "./seed";
import type { Alert, AlertSeverity, AlertType, MaintenanceRecord, TelemetryReading, Vehicle } from "./types";
import { haversineKm } from "./validation";

/**
 * Rules Engine.
 *
 * Each rule is an isolated, side-effect free predicate over
 * (vehicle, reading, context). Adding a rule never touches the pipeline —
 * open/closed principle. The engine returns alert candidates; de-duplication
 * and cooldown are the store's responsibility.
 */
export interface RuleContext {
  previous: TelemetryReading | null;
  idleSeconds: number;
  maintenance: MaintenanceRecord | undefined;
}

export interface AlertCandidate {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
}

export interface Rule {
  type: AlertType;
  description: string;
  threshold: string;
  evaluate: (v: Vehicle, r: TelemetryReading, ctx: RuleContext) => AlertCandidate | null;
}

export const THRESHOLDS = {
  speedLimitKph: 105,
  hardSpeedKph: 125,
  lowFuelPct: 15,
  criticalFuelPct: 8,
  engineTempC: 105,
  criticalEngineTempC: 115,
  lowBatteryV: 12.0,
  criticalBatteryV: 11.6,
  idleSeconds: 180,
  tireMinPsi: 28,
  maintenanceOdometerBufferKm: 500,
};

export const RULES: Rule[] = [
  {
    type: "SPEEDING",
    description: "Flags vehicles exceeding the fleet speed policy.",
    threshold: `> ${THRESHOLDS.speedLimitKph} km/h`,
    evaluate: (v, r) =>
      r.speedKph > THRESHOLDS.speedLimitKph
        ? {
            type: "SPEEDING",
            severity: r.speedKph > THRESHOLDS.hardSpeedKph ? "CRITICAL" : "WARNING",
            message: `${v.plate} travelling at ${r.speedKph.toFixed(0)} km/h`,
            value: r.speedKph,
            threshold: THRESHOLDS.speedLimitKph,
          }
        : null,
  },
  {
    type: "LOW_FUEL",
    description: "Fuel or state-of-charge below reserve level.",
    threshold: `< ${THRESHOLDS.lowFuelPct}%`,
    evaluate: (v, r) =>
      r.fuelLevelPct < THRESHOLDS.lowFuelPct
        ? {
            type: "LOW_FUEL",
            severity: r.fuelLevelPct < THRESHOLDS.criticalFuelPct ? "CRITICAL" : "WARNING",
            message: `${v.plate} energy reserve at ${r.fuelLevelPct.toFixed(1)}%`,
            value: r.fuelLevelPct,
            threshold: THRESHOLDS.lowFuelPct,
          }
        : null,
  },
  {
    type: "OVERHEATING",
    description: "Coolant / powertrain temperature above safe operating band.",
    threshold: `> ${THRESHOLDS.engineTempC} °C`,
    evaluate: (v, r) =>
      r.engineTempC > THRESHOLDS.engineTempC
        ? {
            type: "OVERHEATING",
            severity: r.engineTempC > THRESHOLDS.criticalEngineTempC ? "CRITICAL" : "WARNING",
            message: `${v.plate} engine temperature ${r.engineTempC.toFixed(1)} °C`,
            value: r.engineTempC,
            threshold: THRESHOLDS.engineTempC,
          }
        : null,
  },
  {
    type: "LOW_BATTERY",
    description: "Auxiliary battery voltage below crank threshold.",
    threshold: `< ${THRESHOLDS.lowBatteryV} V`,
    evaluate: (v, r) =>
      r.batteryVoltage < THRESHOLDS.lowBatteryV
        ? {
            type: "LOW_BATTERY",
            severity: r.batteryVoltage < THRESHOLDS.criticalBatteryV ? "CRITICAL" : "WARNING",
            message: `${v.plate} battery at ${r.batteryVoltage.toFixed(2)} V`,
            value: r.batteryVoltage,
            threshold: THRESHOLDS.lowBatteryV,
          }
        : null,
  },
  {
    type: "GEOFENCE_VIOLATION",
    description: "Vehicle left the authorised operating polygon.",
    threshold: `> ${GEOFENCE.radiusKm} km from zone centre`,
    evaluate: (v, r) => {
      const d = haversineKm(r.latitude, r.longitude, GEOFENCE.centerLat, GEOFENCE.centerLng);
      return d > GEOFENCE.radiusKm
        ? {
            type: "GEOFENCE_VIOLATION",
            severity: "CRITICAL",
            message: `${v.plate} exited ${GEOFENCE.name} (${d.toFixed(1)} km out)`,
            value: Number(d.toFixed(1)),
            threshold: GEOFENCE.radiusKm,
          }
        : null;
    },
  },
  {
    type: "IDLE_VEHICLE",
    description: "Ignition on with no movement for a sustained window.",
    threshold: `> ${THRESHOLDS.idleSeconds}s stationary`,
    evaluate: (v, r, ctx) =>
      r.ignitionOn && r.speedKph < 1 && ctx.idleSeconds > THRESHOLDS.idleSeconds
        ? {
            type: "IDLE_VEHICLE",
            severity: "INFO",
            message: `${v.plate} idling for ${Math.round(ctx.idleSeconds / 60)} min`,
            value: ctx.idleSeconds,
            threshold: THRESHOLDS.idleSeconds,
          }
        : null,
  },
  {
    type: "MAINTENANCE_REQUIRED",
    description: "Odometer or calendar service interval reached.",
    threshold: `odometer >= due - ${THRESHOLDS.maintenanceOdometerBufferKm} km`,
    evaluate: (v, r, ctx) => {
      const m = ctx.maintenance;
      if (!m || m.status === "COMPLETED") return null;
      const due =
        r.odometerKm >= m.dueAtOdometerKm - THRESHOLDS.maintenanceOdometerBufferKm ||
        new Date(m.dueDate).getTime() <= Date.now();
      return due
        ? {
            type: "MAINTENANCE_REQUIRED",
            severity: m.status === "OVERDUE" ? "CRITICAL" : "WARNING",
            message: `${v.plate} due for ${m.task}`,
            value: r.odometerKm,
            threshold: m.dueAtOdometerKm,
          }
        : null;
    },
  },
  {
    type: "TIRE_PRESSURE",
    description: "Any axle below minimum cold tyre pressure.",
    threshold: `< ${THRESHOLDS.tireMinPsi} psi`,
    evaluate: (v, r) =>
      r.tirePressurePsi < THRESHOLDS.tireMinPsi
        ? {
            type: "TIRE_PRESSURE",
            severity: "WARNING",
            message: `${v.plate} tyre pressure ${r.tirePressurePsi.toFixed(1)} psi`,
            value: r.tirePressurePsi,
            threshold: THRESHOLDS.tireMinPsi,
          }
        : null,
  },
];

export function runRules(v: Vehicle, r: TelemetryReading, ctx: RuleContext): AlertCandidate[] {
  const out: AlertCandidate[] = [];
  for (const rule of RULES) {
    try {
      const hit = rule.evaluate(v, r, ctx);
      if (hit) out.push(hit);
    } catch {
      // A misbehaving rule must never take down the ingestion pipeline.
    }
  }
  return out;
}

/** Health score is a weighted penalty model over the latest reading. */
export function computeHealthScore(r: TelemetryReading, openAlerts: Alert[]): number {
  let score = 100;
  if (r.engineTempC > 95) score -= (r.engineTempC - 95) * 1.8;
  if (r.batteryVoltage < 12.4) score -= (12.4 - r.batteryVoltage) * 22;
  if (r.fuelLevelPct < 25) score -= (25 - r.fuelLevelPct) * 0.5;
  if (r.tirePressurePsi < 32) score -= (32 - r.tirePressurePsi) * 2.2;
  score -= openAlerts.filter((a) => a.severity === "CRITICAL").length * 8;
  score -= openAlerts.filter((a) => a.severity === "WARNING").length * 3;
  return Math.max(1, Math.min(100, Math.round(score)));
}
