import { repo } from "./store";
import type { AlertType, FleetAnalytics } from "./types";

/**
 * Analytics Engine.
 *
 * Pure read-model derived from the store. In a Postgres deployment these are
 * materialised aggregates / continuous rollups; here they are computed on read
 * over the hot window.
 */
export function computeAnalytics(): FleetAnalytics {
  const vehicles = repo.vehicles();
  const alerts = repo.allAlerts();
  const open = alerts.filter((a) => !a.acknowledged);

  const readings = vehicles.map((v) => v.latest!).filter(Boolean);
  const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

  const byType = new Map<AlertType, number>();
  for (const a of open) byType.set(a.type, (byType.get(a.type) ?? 0) + 1);

  const depots = new Map<string, { sum: number; n: number }>();
  for (const v of vehicles) {
    const d = depots.get(v.depot) ?? { sum: 0, n: 0 };
    d.sum += v.latest?.fuelLevelPct ?? 0;
    d.n++;
    depots.set(v.depot, d);
  }

  const buckets = [
    { bucket: "0", min: 0, max: 1 },
    { bucket: "1-30", min: 1, max: 30 },
    { bucket: "30-60", min: 30, max: 60 },
    { bucket: "60-90", min: 60, max: 90 },
    { bucket: "90-105", min: 90, max: 105 },
    { bucket: "105+", min: 105, max: Infinity },
  ];

  const perVehicleAlerts = new Map<string, number>();
  for (const a of open) perVehicleAlerts.set(a.vehicleId, (perVehicleAlerts.get(a.vehicleId) ?? 0) + 1);

  const active = vehicles.filter((v) => v.status === "MOVING").length;
  const idle = vehicles.filter((v) => v.status === "IDLE").length;

  return {
    generatedAt: new Date().toISOString(),
    totalVehicles: vehicles.length,
    activeVehicles: active,
    idleVehicles: idle,
    offlineVehicles: vehicles.filter((v) => v.status === "PARKED" || v.status === "OFFLINE").length,
    inMaintenance: vehicles.filter((v) => v.status === "MAINTENANCE").length,
    avgSpeedKph: Number(avg(readings.map((r) => r.speedKph)).toFixed(1)),
    avgFuelPct: Number(avg(readings.map((r) => r.fuelLevelPct)).toFixed(1)),
    avgHealthScore: Number(avg(vehicles.map((v) => v.healthScore)).toFixed(1)),
    totalDistanceKm: Number(readings.reduce((s, r) => s + r.odometerKm, 0).toFixed(0)),
    fleetUtilizationPct: Number(((active / Math.max(1, vehicles.length)) * 100).toFixed(1)),
    openAlerts: open.length,
    criticalAlerts: open.filter((a) => a.severity === "CRITICAL").length,
    alertsByType: [...byType.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    fuelByDepot: [...depots.entries()].map(([depot, d]) => ({
      depot,
      avgFuelPct: Number((d.sum / d.n).toFixed(1)),
      vehicles: d.n,
    })),
    speedHistogram: buckets.map((b) => ({
      bucket: b.bucket,
      count: readings.filter((r) => r.speedKph >= b.min && r.speedKph < b.max).length,
    })),
    utilizationTrend: repo.trend().slice(-40),
    topAlertVehicles: [...perVehicleAlerts.entries()]
      .map(([vehicleId, count]) => ({
        vehicleId,
        plate: vehicles.find((v) => v.id === vehicleId)?.plate ?? vehicleId,
        alerts: count,
      }))
      .sort((a, b) => b.alerts - a.alerts)
      .slice(0, 6),
    ingestion: repo.stats(),
  };
}
