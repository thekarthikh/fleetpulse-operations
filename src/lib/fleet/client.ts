import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Alert, Driver, FleetAnalytics, MaintenanceRecord, ServiceHistoryEntry, TelemetryReading, Vehicle } from "./types";

const BASE = "/api/public";

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  sort: string | null;
  order: "asc" | "desc";
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${path}`);
  return (await res.json()) as T;
}

export type VehicleRow = Vehicle & {
  driverName: string;
  speedKph: number;
  fuelLevelPct: number;
  engineTempC: number;
  batteryVoltage: number;
  odometerKm: number;
};

export interface DashboardPayload {
  analytics: FleetAnalytics;
  vehicles: (Pick<Vehicle, "id" | "plate" | "make" | "model" | "depot" | "fuelType" | "status" | "healthScore" | "lastSeenAt" | "latest"> & {
    driverName: string;
  })[];
  alerts: Alert[];
  maintenance: MaintenanceRecord[];
  serverTime: string;
}

/** Realtime channel: 2s polling of the composite read-model. */
export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => get<DashboardPayload>("/dashboard"),
    refetchInterval: 2000,
    refetchIntervalInBackground: false,
  });
}

export function useVehicles(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "") as [string, string][],
  ).toString();
  return useQuery({
    queryKey: ["vehicles", qs],
    queryFn: () => get<Page<VehicleRow>>(`/vehicles?${qs}`),
    refetchInterval: 3000,
    placeholderData: (prev) => prev,
  });
}

export interface VehicleDetail {
  vehicle: Vehicle;
  driver: Driver | null;
  telemetry: TelemetryReading[];
  alerts: Alert[];
  maintenance: MaintenanceRecord[];
  serviceHistory: ServiceHistoryEntry[];
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: ["vehicle", id],
    queryFn: () => get<VehicleDetail>(`/vehicles/${id}?history=90`),
    refetchInterval: 2000,
  });
}

export function useTelemetry(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "") as [string, string][],
  ).toString();
  return useQuery({
    queryKey: ["telemetry", qs],
    queryFn: () => get<Page<TelemetryReading>>(`/telemetry?${qs}`),
    refetchInterval: 2500,
    placeholderData: (prev) => prev,
  });
}

export function useAlerts(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "") as [string, string][],
  ).toString();
  return useQuery({
    queryKey: ["alerts", qs],
    queryFn: () => get<Page<Alert>>(`/alerts?${qs}`),
    refetchInterval: 2500,
    placeholderData: (prev) => prev,
  });
}

export function useMaintenance(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "") as [string, string][],
  ).toString();
  return useQuery({
    queryKey: ["maintenance", qs],
    queryFn: () =>
      get<Page<MaintenanceRecord> & { serviceHistory: ServiceHistoryEntry[] }>(`/maintenance?${qs}`),
    refetchInterval: 5000,
    placeholderData: (prev) => prev,
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: () => get<FleetAnalytics>("/analytics"),
    refetchInterval: 3000,
  });
}

export interface HealthPayload {
  status: string;
  components: Record<string, { status: string } & Record<string, unknown>>;
  uptimeSeconds: number;
  version: string;
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => get<HealthPayload>("/health"),
    refetchInterval: 5000,
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${BASE}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to acknowledge alert");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useSimulateTick() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticks: number = 3) => {
      const res = await fetch(`${BASE}/simulate/tick?ticks=${ticks}`, { method: "POST" });
      if (!res.ok) throw new Error("Simulation tick failed");
      return res.json() as Promise<{ accepted: number; rejected: number; alerts: number; durationMs: number }>;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
