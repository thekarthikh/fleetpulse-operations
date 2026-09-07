import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Activity, Fuel, Gauge, HeartPulse, Search, Signal, Truck } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/lib/fleet/client";
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
// Lazy load the map component on the client only
import { lazy, Suspense } from "react";
const FleetMap = lazy(() => import("@/components/fleet/fleet-map"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fleet Operations Dashboard | FleetPulse" },
      {
        name: "description",
        content:
          "Realtime command center for a 25-vehicle fleet: live map, KPIs, alert feed, fleet health score and fuel analytics.",
      },
      { property: "og:title", content: "Fleet Operations Dashboard | FleetPulse" },
      {
        property: "og:description",
        content: "Realtime command center for a 25-vehicle fleet: live map, KPIs, alert feed, fleet health score and fuel analytics.",
      },
    ],
  }),
  component: DashboardPage,
});

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  // Toast on genuinely new critical alerts (skip the initial hydration batch).
  useEffect(() => {
    if (!data) return;
    const critical = data.alerts.filter((a) => a.severity === "CRITICAL");
    if (!primed.current) {
      data.alerts.forEach((a) => seen.current.add(a.id));
      primed.current = true;
      return;
    }
    for (const a of critical) {
      if (seen.current.has(a.id)) continue;
      seen.current.add(a.id);
      toast.error(a.type.replace(/_/g, " "), { description: a.message });
    }
    data.alerts.forEach((a) => seen.current.add(a.id));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.vehicles.filter(
      (v) =>
        (status === "ALL" || v.status === status) &&
        (!q || `${v.plate} ${v.make} ${v.model} ${v.driverName} ${v.depot}`.toLowerCase().includes(q)),
    );
  }, [data, search, status]);

  if (isError)
    return <EmptyState title="Telemetry stream unavailable" description="The ingestion API did not respond. Retrying automatically." />;

  const a = data?.analytics;

  return (
    <>
      <PageHeader
        title="Fleet Operations"
        subtitle="Live command center backed by the telemetry ingestion pipeline, rules engine and analytics service."
        actions={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Signal className="size-3.5 text-success" />
            <span className="num">
              {a ? `${a.ingestion.totalIngested.toLocaleString()} readings · ${a.ingestion.lastTickDurationMs}ms/tick` : "connecting…"}
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {isLoading || !a
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[104px] bg-muted/50" />)
          : [
              <KpiCard key="1" label="Fleet size" value={a.totalVehicles} hint={`${a.inMaintenance} in workshop`} icon={<Truck className="size-4" />} />,
              <KpiCard key="2" label="Active now" value={a.activeVehicles} tone="success" hint={`${a.fleetUtilizationPct}% utilization`} icon={<Activity className="size-4" />} />,
              <KpiCard key="3" label="Avg speed" value={a.avgSpeedKph} unit="km/h" tone="primary" hint="rolling fleet mean" icon={<Gauge className="size-4" />} />,
              <KpiCard key="4" label="Avg energy" value={a.avgFuelPct} unit="%" tone={a.avgFuelPct < 30 ? "warning" : "default"} hint="fuel / state of charge" icon={<Fuel className="size-4" />} />,
              <KpiCard key="5" label="Open alerts" value={a.openAlerts} tone={a.criticalAlerts ? "critical" : "default"} hint={`${a.criticalAlerts} critical`} icon={<AlertTriangle className="size-4" />} />,
              <KpiCard key="6" label="Health score" value={a.avgHealthScore} unit="/100" tone={a.avgHealthScore > 75 ? "success" : "warning"} hint="weighted penalty model" icon={<HeartPulse className="size-4" />} />,
            ]}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel
          title="Live fleet map"
          subtitle="Positions integrated from speed + heading every tick"
          className="xl:col-span-2"
          bodyClassName="p-0"
        >
          <div className="h-[420px] w-full">
            <FleetMap
              geofence={{ lat: 37.7749, lng: -122.4194, radiusKm: 42, name: "Bay Area Operating Zone" }}
              vehicles={filtered
                .filter((v) => v.latest)
                .map((v) => ({
                  id: v.id,
                  plate: v.plate,
                  status: v.status,
                  speedKph: v.latest!.speedKph,
                  fuelLevelPct: v.latest!.fuelLevelPct,
                  lat: v.latest!.latitude,
                  lng: v.latest!.longitude,
                  driverName: v.driverName,
                  healthScore: v.healthScore,
                }))}
            />
          </div>
        </Panel>

        <Panel title="Live alert feed" subtitle="Rules engine output, newest first" bodyClassName="p-0">
          <div className="max-h-[420px] overflow-y-auto">
            {!data ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 bg-muted/50" />
                ))}
              </div>
            ) : data.alerts.length === 0 ? (
              <div className="p-4">
                <EmptyState title="No alerts" description="Every rule is currently within threshold." />
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {data.alerts.slice(0, 24).map((al) => (
                  <li key={al.id} className="rise px-4 py-2.5 transition-colors hover:bg-accent/40">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={al.severity} />
                      <Link
                        to="/vehicles/$id"
                        params={{ id: al.vehicleId }}
                        className="num text-xs text-primary hover:underline"
                      >
                        {al.vehiclePlate}
                      </Link>
                      <span className="num ml-auto text-[10px] text-muted-foreground">
                        {timeAgo(al.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-foreground/85">{al.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel
          title="Vehicle activity timeline"
          subtitle="Active vs idle vehicles and alerts generated per tick"
          className="xl:col-span-2"
        >
          <div className="h-[240px]">
            {a ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={a.utilizationTrend.map((p) => ({ ...p, label: new Date(p.t).toLocaleTimeString() }))}>
                  <defs>
                    <linearGradient id="gActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gIdle" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={28} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="active" stroke="var(--chart-1)" fill="url(#gActive)" strokeWidth={2} />
                  <Area type="monotone" dataKey="idle" stroke="var(--chart-3)" fill="url(#gIdle)" strokeWidth={2} />
                  <Line type="monotone" dataKey="alerts" stroke="var(--chart-4)" dot={false} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full bg-muted/50" />
            )}
          </div>
        </Panel>

        <Panel title="Fleet health score" subtitle="Distribution across the fleet">
          <div className="space-y-3">
            {!data
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 bg-muted/50" />)
              : [...data.vehicles]
                  .sort((x, y) => x.healthScore - y.healthScore)
                  .slice(0, 7)
                  .map((v) => (
                    <Meter
                      key={v.id}
                      label={`${v.plate} · ${v.make}`}
                      value={v.healthScore}
                      suffix="/100"
                      tone={v.healthScore > 75 ? "success" : v.healthScore > 50 ? "warning" : "critical"}
                    />
                  ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Fuel analytics by depot" subtitle="Average energy level per operating base">
          <div className="h-[220px]">
            {a ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={a.fuelByDepot}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="depot" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={28} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)", opacity: 0.3 }} />
                  <Bar dataKey="avgFuelPct" radius={[4, 4, 0, 0]}>
                    {a.fuelByDepot.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full bg-muted/50" />
            )}
          </div>
        </Panel>

        <Panel title="Alerts by rule" subtitle="Open alerts grouped by rule type">
          <div className="h-[220px]">
            {a && a.alertsByType.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={a.alertsByType}
                    dataKey="count"
                    nameKey="type"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {a.alertsByType.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="var(--surface)" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No open alerts" description="Rules engine reports all vehicles within thresholds." />
            )}
          </div>
        </Panel>

        <Panel title="Speed distribution" subtitle="Latest reading per vehicle, bucketed">
          <div className="h-[220px]">
            {a ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={a.speedHistogram}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={24} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="count" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full bg-muted/50" />
            )}
          </div>
        </Panel>
      </div>

      <Panel
        className="mt-4"
        title="Live vehicle status"
        subtitle={`${filtered.length} of ${data?.vehicles.length ?? 0} vehicles`}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search plate, driver, depot…"
                className="h-8 w-52 pl-7 text-xs"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["ALL", "MOVING", "IDLE", "PARKED", "MAINTENANCE"].map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        bodyClassName="p-0"
      >
        <div className="max-h-[460px] overflow-auto">
          {!data ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 bg-muted/50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No vehicles match" description="Adjust the search term or status filter." />
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface-2/95 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur">
                <tr>
                  {["Vehicle", "Driver", "Status", "Speed", "Energy", "Engine", "Health", "Last seen"].map((h) => (
                    <th key={h} className="px-4 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((v) => (
                  <tr key={v.id} className="transition-colors hover:bg-accent/40">
                    <td className="px-4 py-2">
                      <Link to="/vehicles/$id" params={{ id: v.id }} className="num text-primary hover:underline">
                        {v.plate}
                      </Link>
                      <div className="text-[10px] text-muted-foreground">
                        {v.make} {v.model}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{v.driverName}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="num px-4 py-2">{v.latest?.speedKph.toFixed(0)} km/h</td>
                    <td className="num px-4 py-2">{v.latest?.fuelLevelPct.toFixed(0)}%</td>
                    <td className="num px-4 py-2">{v.latest?.engineTempC.toFixed(0)} °C</td>
                    <td className="num px-4 py-2">
                      <span
                        className={
                          v.healthScore > 75 ? "text-success" : v.healthScore > 50 ? "text-warning" : "text-critical"
                        }
                      >
                        {v.healthScore}
                      </span>
                    </td>
                    <td className="num px-4 py-2 text-muted-foreground">{timeAgo(v.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </>
  );
}
