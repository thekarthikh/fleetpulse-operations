import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, Fuel, Gauge, Thermometer, Wrench } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useVehicle } from "@/lib/fleet/client";
import {
  EmptyState,
  KpiCard,
  Meter,
  PageHeader,
  Panel,
  SeverityBadge,
  StatusBadge,
  timeAgo,
  tooltipStyle,
} from "@/components/fleet/ui";

export const Route = createFileRoute("/vehicles/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Vehicle ${params.id} diagnostics | FleetPulse` },
      {
        name: "description",
        content: "Per-vehicle diagnostics: live telemetry charts, driver assignment, alert history and service records.",
      },
      { property: "og:title", content: "Vehicle diagnostics | FleetPulse" },
      { property: "og:description", content: "Deep-dive telemetry and maintenance history for a single fleet vehicle." },
    ],
  }),
  component: VehicleDetailPage,
  errorComponent: ({ error }) => (
    <EmptyState title="Could not load vehicle" description={error.message} />
  ),
  notFoundComponent: () => <EmptyState title="Vehicle not found" description="No vehicle exists with that identifier." />,
});

function VehicleDetailPage() {
  const { id } = Route.useParams();
  const { data, isLoading, isError, error } = useVehicle(id);

  if (isError)
    return <EmptyState title="Could not load vehicle" description={(error as Error).message} />;

  if (isLoading || !data)
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 bg-muted/50" />
        <Skeleton className="h-28 bg-muted/50" />
        <Skeleton className="h-72 bg-muted/50" />
      </div>
    );

  const { vehicle, driver, telemetry, alerts, maintenance, serviceHistory } = data;
  const latest = vehicle.latest;
  const series = telemetry.map((t) => ({
    label: new Date(t.recordedAt).toLocaleTimeString(),
    speed: Math.round(t.speedKph),
    fuel: Math.round(t.fuelLevelPct),
    temp: Math.round(t.engineTempC),
    rpm: Math.round(t.rpm),
    volts: Number(t.batteryVoltage.toFixed(2)),
  }));

  return (
    <>
      <Link to="/vehicles" className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to registry
      </Link>

      <PageHeader
        title={`${vehicle.plate} · ${vehicle.make} ${vehicle.model}`}
        subtitle={`VIN ${vehicle.vin} · ${vehicle.year} · ${vehicle.fuelType} · ${vehicle.depot}`}
        actions={<StatusBadge status={vehicle.status} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label="Speed" value={latest?.speedKph.toFixed(0) ?? "—"} unit="km/h" tone="primary" icon={<Gauge className="size-4" />} />
        <KpiCard label="Energy" value={latest?.fuelLevelPct.toFixed(0) ?? "—"} unit="%" tone={(latest?.fuelLevelPct ?? 100) < 20 ? "critical" : "default"} icon={<Fuel className="size-4" />} />
        <KpiCard label="Engine temp" value={latest?.engineTempC.toFixed(0) ?? "—"} unit="°C" tone={(latest?.engineTempC ?? 0) > 105 ? "critical" : "default"} icon={<Thermometer className="size-4" />} />
        <KpiCard label="Odometer" value={Math.round(latest?.odometerKm ?? 0).toLocaleString()} unit="km" />
        <KpiCard label="Health" value={vehicle.healthScore} unit="/100" tone={vehicle.healthScore > 75 ? "success" : "warning"} hint={`last seen ${timeAgo(vehicle.lastSeenAt)}`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Speed & engine load" subtitle="Rolling telemetry window" className="xl:col-span-2">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="vSpeed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} minTickGap={40} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={30} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="speed" stroke="var(--chart-1)" fill="url(#vSpeed)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Driver" subtitle="Assigned operator">
          {driver ? (
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-sm font-medium text-foreground">{driver.name}</p>
                <p className="text-muted-foreground">Licence {driver.licenseNumber}</p>
                <p className="num text-muted-foreground">{driver.phone}</p>
              </div>
              <Meter label="Safety rating" value={driver.rating * 20} suffix="%" tone="success" />
              <Meter label="Vehicle health" value={vehicle.healthScore} suffix="/100" tone={vehicle.healthScore > 75 ? "success" : "warning"} />
              <Meter
                label="Tire pressure"
                value={Math.min(100, ((latest?.tirePressurePsi ?? 0) / 90) * 100)}
                suffix={`${(latest?.tirePressurePsi ?? 0).toFixed(1)} psi`}
                tone={(latest?.tirePressurePsi ?? 0) < 28 ? "warning" : "success"}
              />
            </div>
          ) : (
            <EmptyState title="Unassigned" description="No driver is currently assigned to this vehicle." />
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Fuel & battery" subtitle="Energy consumption over the window">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} minTickGap={40} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={30} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="fuel" stroke="var(--chart-2)" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="volts" stroke="var(--chart-4)" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Engine temperature" subtitle="Thermal profile">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} minTickGap={40} />
                <YAxis domain={["dataMin - 5", "dataMax + 5"]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={30} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="temp" stroke="var(--chart-3)" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Alert history" subtitle="Rules triggered for this vehicle" bodyClassName="p-0">
          <div className="max-h-[280px] overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-4"><EmptyState title="No alerts" description="This vehicle has a clean record." /></div>
            ) : (
              <ul className="divide-y divide-border/60">
                {alerts.map((al) => (
                  <li key={al.id} className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={al.severity} />
                      <span className="num ml-auto text-[10px] text-muted-foreground">{timeAgo(al.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-foreground/85">{al.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel title="Scheduled maintenance" subtitle="Upcoming and overdue tasks" bodyClassName="p-0">
          <div className="max-h-[280px] overflow-y-auto">
            {maintenance.length === 0 ? (
              <div className="p-4"><EmptyState title="Nothing scheduled" description="No maintenance tasks on the books." /></div>
            ) : (
              <ul className="divide-y divide-border/60">
                {maintenance.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                    <Wrench className="size-3.5 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-foreground/90">{m.task}</p>
                      <p className="num text-[10px] text-muted-foreground">
                        due {new Date(m.dueDate).toLocaleDateString()} · {Math.round(m.dueAtOdometerKm).toLocaleString()} km
                      </p>
                    </div>
                    <span className={`num text-[10px] ${m.status === "OVERDUE" ? "text-critical" : m.status === "DUE" ? "text-warning" : "text-muted-foreground"}`}>
                      {m.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel title="Service history" subtitle="Completed workshop visits" bodyClassName="p-0">
          <div className="max-h-[280px] overflow-y-auto">
            {serviceHistory.length === 0 ? (
              <div className="p-4"><EmptyState title="No history" description="This vehicle has not been serviced yet." /></div>
            ) : (
              <ul className="divide-y divide-border/60">
                {serviceHistory.map((s) => (
                  <li key={s.id} className="px-4 py-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground/90">{s.description}</span>
                      <span className="num text-muted-foreground">${s.costUsd.toLocaleString()}</span>
                    </div>
                    <p className="num text-[10px] text-muted-foreground">
                      {new Date(s.performedAt).toLocaleDateString()} · {s.workshop} · {Math.round(s.odometerKm).toLocaleString()} km
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
