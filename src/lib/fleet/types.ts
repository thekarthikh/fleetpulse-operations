/**
 * FleetPulse domain model.
 *
 * These types are the shared contract between the telemetry pipeline
 * (simulator -> ingestion -> validation -> rules engine -> store -> analytics)
 * and the REST layer / dashboard.
 */

export type VehicleStatus = "MOVING" | "IDLE" | "PARKED" | "MAINTENANCE" | "OFFLINE";
export type FuelType = "DIESEL" | "PETROL" | "ELECTRIC" | "HYBRID";
export type AlertSeverity = "CRITICAL" | "WARNING" | "INFO";

export type AlertType =
  | "SPEEDING"
  | "LOW_FUEL"
  | "OVERHEATING"
  | "LOW_BATTERY"
  | "GEOFENCE_VIOLATION"
  | "IDLE_VEHICLE"
  | "MAINTENANCE_REQUIRED"
  | "TIRE_PRESSURE";

export interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  phone: string;
  rating: number;
  assignedVehicleId: string;
}

export interface Vehicle {
  id: string;
  vin: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  fuelType: FuelType;
  depot: string;
  driverId: string;
  status: VehicleStatus;
  healthScore: number;
  lastSeenAt: string;
  latest: TelemetryReading | null;
}

export interface TelemetryReading {
  id: string;
  vehicleId: string;
  recordedAt: string;
  speedKph: number;
  latitude: number;
  longitude: number;
  heading: number;
  fuelLevelPct: number;
  batteryVoltage: number;
  rpm: number;
  engineTempC: number;
  tirePressurePsi: number;
  odometerKm: number;
  ignitionOn: boolean;
}

export interface Alert {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  createdAt: string;
  acknowledged: boolean;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  task: string;
  dueAtOdometerKm: number;
  dueDate: string;
  status: "SCHEDULED" | "DUE" | "OVERDUE" | "COMPLETED";
  costUsd: number;
}

export interface ServiceHistoryEntry {
  id: string;
  vehicleId: string;
  performedAt: string;
  workshop: string;
  description: string;
  odometerKm: number;
  costUsd: number;
}

export interface Geofence {
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}

export interface FleetAnalytics {
  generatedAt: string;
  totalVehicles: number;
  activeVehicles: number;
  idleVehicles: number;
  offlineVehicles: number;
  inMaintenance: number;
  avgSpeedKph: number;
  avgFuelPct: number;
  avgHealthScore: number;
  totalDistanceKm: number;
  fleetUtilizationPct: number;
  openAlerts: number;
  criticalAlerts: number;
  alertsByType: { type: AlertType; count: number }[];
  fuelByDepot: { depot: string; avgFuelPct: number; vehicles: number }[];
  speedHistogram: { bucket: string; count: number }[];
  utilizationTrend: { t: string; active: number; idle: number; alerts: number }[];
  topAlertVehicles: { plate: string; vehicleId: string; alerts: number }[];
  ingestion: IngestionStats;
}

export interface IngestionStats {
  totalIngested: number;
  totalRejected: number;
  lastTickDurationMs: number;
  ticks: number;
  uptimeSeconds: number;
}
