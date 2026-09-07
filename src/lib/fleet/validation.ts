import { z } from "zod";
import { GEOFENCE } from "./seed";

/**
 * Validation layer.
 *
 * Everything entering the ingestion API is schema-validated *and*
 * range-validated before it can reach the rules engine. Rejected payloads
 * never mutate vehicle state; they are counted for observability.
 */
export const telemetryPayloadSchema = z.object({
  vehicleId: z.string().min(3).max(32),
  recordedAt: z.string().datetime().optional(),
  speedKph: z.number().min(0).max(260),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).default(0),
  fuelLevelPct: z.number().min(0).max(100),
  batteryVoltage: z.number().min(0).max(60),
  rpm: z.number().min(0).max(9000),
  engineTempC: z.number().min(-40).max(200),
  tirePressurePsi: z.number().min(0).max(120),
  odometerKm: z.number().min(0).max(3_000_000),
  ignitionOn: z.boolean().default(true),
});

export type TelemetryPayload = z.infer<typeof telemetryPayloadSchema>;

export interface ValidationIssue {
  field: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; value: TelemetryPayload }
  | { ok: false; issues: ValidationIssue[] };

export function validateTelemetry(input: unknown): ValidationResult {
  const parsed = telemetryPayloadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({
        field: i.path.join(".") || "payload",
        message: i.message,
      })),
    };
  }

  const issues: ValidationIssue[] = [];
  const v = parsed.data;

  // Cross-field plausibility checks the schema cannot express.
  if (!v.ignitionOn && v.rpm > 0) {
    issues.push({ field: "rpm", message: "RPM must be 0 while ignition is off" });
  }
  if (v.speedKph > 5 && v.rpm < 300) {
    issues.push({ field: "rpm", message: "Implausible RPM for reported speed" });
  }
  if (haversineKm(v.latitude, v.longitude, GEOFENCE.centerLat, GEOFENCE.centerLng) > 1500) {
    issues.push({ field: "latitude", message: "GPS fix outside plausible operating region" });
  }

  return issues.length ? { ok: false, issues } : { ok: true, value: v };
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
