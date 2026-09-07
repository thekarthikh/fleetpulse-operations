import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Gauge, Route as RouteIcon, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/lib/fleet/client";
import { EmptyState, KpiCard, Meter, PageHeader, Panel, tooltipStyle } from "@/components/fleet/ui";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Fleet Analytics | FleetPulse" },
      {
        name: "description",
        content: "Utilization trends, distance travelled, fuel efficiency by depot and alert distribution computed from live telemetry.",
      },
      { property: "og:title", content: "Fleet Analytics | FleetPulse" },
      { property: "og:description", content: "KPI rollups and trend analysis across the connected fleet." },
    ],
  }),
  component: AnalyticsPage,
});

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function AnalyticsPage() {
  const { data: a, isLoading, isError } = useAnalytics();

  if (isError) return <EmptyState title="Analytics unavailable" description="The analytics service did not respond." />;

  return (
    <>
      <PageHeader
        title="Fleet Analytics"
        subtitle="GET /api/public/analytics — aggregations recomputed from the telemetry store on every request."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {!a ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] bg-muted/50" />)
        ) : (
          <>
            <KpiCard label="Utilization" value={a.fleetUtilizationPct} unit="%" tone="primary" hint={`${a.activeVehicles}/${a.totalVehicles} active`} icon={<Activity className="size-4" />} />
            <KpiCard label="Distance logged" value={Math.round(a.totalDistanceKm).toLocaleString()} unit="km" hint="cumulative odometer" icon={<RouteIcon className="size-4" />} />
            <KpiCard label="Avg speed" value={a.avgSpeedKph} unit="km/h" icon={<Gauge className="size-4" />} />
            <KpiCard label="Avg health" value={a.avgHealthScore} unit="/100" tone={a.avgHealthScore > 75 ? "success" : "warning"} icon={<TrendingUp className="size-4" />} />
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Utilization trend" subtitle="Active vs idle vehicles per pipeline tick">
          <div className="h-[260px]">
            {a ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={a.utilizationTrend.map((p) => ({ ...p, label: new Date(p.t).toLocaleTimeString() }))}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={28} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="active" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="idle" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="alerts" stroke="var(--chart-4)" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full bg-muted/50" />
            )}
          </div>
        </Panel>

        <Panel title="Fleet composition" subtitle="Vehicles by operational state">
          <div className="h-[260px]">
            {a ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Active", value: a.activeVehicles },
                      { name: "Idle", value: a.idleVehicles },
                      { name: "Maintenance", value: a.inMaintenance },
                      { name: "Offline", value: a.offlineVehicles },
                    ].filter((d) => d.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {CHART_COLORS.map((c, i) => (
                      <Cell key={i} fill={c} stroke="var(--surface)" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full bg-muted/50" />
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Fuel efficiency by depot" subtitle="Average energy level and fleet size">
          <div className="h-[230px]">
            {a ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={a.fuelByDepot}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="depot" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={28} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)", opacity: 0.3 }} />
                  <Bar dataKey="avgFuelPct" radius={[4, 4, 0, 0]} fill="var(--chart-2)" />
                  <Bar dataKey="vehicles" radius={[4, 4, 0, 0]} fill="var(--chart-5)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full bg-muted/50" />
            )}
          </div>
        </Panel>

        <Panel title="Alert profile" subtitle="Open alerts per rule type">
          <div className="h-[230px]">
            {a && a.alertsByType.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={a.alertsByType.map((d) => ({ subject: d.type.replace(/_/g, " "), count: d.count }))}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                  <Radar dataKey="count" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.35} />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No open alerts" description="Nothing to profile right now." />
            )}
          </div>
        </Panel>

        <Panel title="Top alerting vehicles" subtitle="Highest alert counts in the retention window">
          <div className="space-y-3">
            {!a ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 bg-muted/50" />)
            ) : a.topAlertVehicles.length === 0 ? (
              <EmptyState title="Quiet fleet" description="No vehicle has raised alerts yet." />
            ) : (
              a.topAlertVehicles.map((v) => {
                const max = a.topAlertVehicles[0].alerts || 1;
                return (
                  <Link key={v.vehicleId} to="/vehicles/$id" params={{ id: v.vehicleId }} className="block">
                    <Meter label={v.plate} value={(v.alerts / max) * 100} suffix={`${v.alerts} alerts`} tone="critical" />
                  </Link>
                );
              })
            )}
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" title="Ingestion pipeline statistics" subtitle="Throughput and validation metrics">
        {!a ? (
          <Skeleton className="h-16 bg-muted/50" />
        ) : (
          <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-5">
            {[
              ["Readings ingested", a.ingestion.totalIngested.toLocaleString()],
              ["Rejected by validation", a.ingestion.totalRejected.toLocaleString()],
              ["Pipeline ticks", a.ingestion.ticks.toLocaleString()],
              ["Last tick duration", `${a.ingestion.lastTickDurationMs} ms`],
              ["Uptime", `${Math.round(a.ingestion.uptimeSeconds)} s`],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
                <p className="num mt-1 text-lg text-foreground">{v}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
