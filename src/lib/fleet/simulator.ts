import { GEOFENCE, mulberry32 } from "./seed";
import type { Vehicle } from "./types";
import type { TelemetryPayload } from "./validation";

/**
 * Vehicle Simulator + Telemetry Generator.
 *
 * Produces physically-coherent readings: speed follows a drive cycle,
 * position integrates from speed + heading, fuel drains with load,
 * temperature tracks RPM, odometer is monotonic.
 * ~2% of payloads are deliberately corrupted so the validation layer
 * has real rejects to report.
 */
let seq = 0;
const rnd = mulberry32(987654321);

export interface SimState {
  driveCyclePhase: number;
  idleSince: number | null;
}

export function generateReading(
  vehicle: Vehicle,
  dtSeconds: number,
  faultInjection = true,
): TelemetryPayload & { __corrupt?: boolean } {
  const prev = vehicle.latest!;
  seq++;

  const parked = vehicle.status === "MAINTENANCE" || vehicle.status === "PARKED";
  const wantsToMove = !parked && rnd() > 0.18;

  // --- speed: smoothed random-walk drive cycle -----------------------------
  let speed = prev.speedKph;
  if (!wantsToMove) speed = Math.max(0, speed - 18 * (dtSeconds / 3));
  else {
    const target = 25 + rnd() * 85 + (rnd() > 0.96 ? 35 : 0); // occasional speeding
    speed += (target - speed) * 0.35;
  }
  speed = Math.max(0, Math.min(160, speed));

  const ignitionOn = !parked && (speed > 0.5 || rnd() > 0.35);
  const rpm = ignitionOn ? Math.round(650 + speed * 22 + rnd() * 220) : 0;

  // --- position: integrate along heading ----------------------------------
  const heading = (prev.heading + (rnd() - 0.5) * 40 + 360) % 360;
  const km = (speed * dtSeconds) / 3600;
  const lat = prev.latitude + (km / 111) * Math.cos((heading * Math.PI) / 180);
  const lng =
    prev.longitude +
    (km / (111 * Math.cos((prev.latitude * Math.PI) / 180))) * Math.sin((heading * Math.PI) / 180);

  // --- consumables ---------------------------------------------------------
  const drain = ignitionOn ? (0.02 + speed / 2600) * dtSeconds : 0.001 * dtSeconds;
  let fuel = prev.fuelLevelPct - drain;
  if (fuel <= 3) fuel = 92 + rnd() * 8; // refuel / recharge event

  const targetTemp = ignitionOn ? 84 + rpm / 90 + (rnd() > 0.985 ? 30 : 0) : 30;
  const engineTempC = prev.engineTempC + (targetTemp - prev.engineTempC) * 0.25;

  const batteryVoltage = ignitionOn
    ? Math.min(14.6, prev.batteryVoltage + 0.05 + rnd() * 0.05)
    : Math.max(10.9, prev.batteryVoltage - 0.02 - rnd() * 0.03);

  const tirePressurePsi = Math.max(
    22,
    Math.min(40, prev.tirePressurePsi + (rnd() - 0.52) * 0.35),
  );

  const payload: TelemetryPayload & { __corrupt?: boolean } = {
    vehicleId: vehicle.id,
    recordedAt: new Date().toISOString(),
    speedKph: Number(speed.toFixed(1)),
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
    heading: Number(heading.toFixed(1)),
    fuelLevelPct: Number(Math.max(0, Math.min(100, fuel)).toFixed(1)),
    batteryVoltage: Number(batteryVoltage.toFixed(2)),
    rpm,
    engineTempC: Number(engineTempC.toFixed(1)),
    tirePressurePsi: Number(tirePressurePsi.toFixed(1)),
    odometerKm: Number((prev.odometerKm + km).toFixed(2)),
    ignitionOn,
  };

  // Occasional geofence escape so the rule actually fires.
  if (rnd() > 0.997) {
    payload.latitude = GEOFENCE.centerLat + 0.9;
    payload.longitude = GEOFENCE.centerLng - 0.9;
  }

  // Fault injection: sensor glitches that must be rejected upstream.
  if (faultInjection && rnd() > 0.98) {
    payload.__corrupt = true;
    const mode = seq % 3;
    if (mode === 0) payload.speedKph = -12;
    else if (mode === 1) payload.engineTempC = 940;
    else payload.fuelLevelPct = 168;
  }

  return payload;
}
