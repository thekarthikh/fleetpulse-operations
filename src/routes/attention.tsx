import { createFileRoute, Link } from "@tanstack/react-router";
import { useVehicles, useAlerts } from "@/lib/fleet/client";
import { Panel, EmptyState, PageHeader, SkeletonGrid, timeAgo } from "@/components/fleet/ui";

export const Route = createFileRoute("/attention")({
  component: AttentionPage,
});

function AttentionPage() {
  const { data: vehiclesData, isLoading: vehiclesLoading } = useVehicles({});
  const { data: alertsData, isLoading: alertsLoading } = useAlerts({});

  if (vehiclesLoading || alertsLoading) {
    return (
      <Panel title="Vehicles Needing Attention" subtitle="loading…" bodyClassName="p-0">
        <SkeletonGrid rows={8} className="p-4" />
      </Panel>
    );
  }

  if (!vehiclesData || !alertsData) {
    return (
      <Panel title="Vehicles Needing Attention" subtitle="Error loading data" bodyClassName="p-0">
        <EmptyState title="Error" description="Unable to load vehicle or alert data." />
      </Panel>
    );
  }

  const alerts = alertsData.content;
  const vehicles = vehiclesData.content;

  const attentionVehicles = vehicles.filter(v => {
    const lowFuel = v.latest?.fuelLevelPct !== undefined && v.latest.fuelLevelPct < 20;
    const highTemp = v.latest?.engineTempC !== undefined && v.latest.engineTempC > 90;
    const hasAlert = alerts.some(a => a.vehicleId === v.id && (a.severity === "CRITICAL" || a.severity === "WARNING"));
    return lowFuel || highTemp || hasAlert;
  });

  const count = attentionVehicles.length;

  return (
    <>
      <PageHeader
        title="Vehicles Needing Attention"
        subtitle={`${count} vehicle${count !== 1 ? "s" : ""} require immediate or monitoring attention`}
      />
      <Panel title={`Attention Vehicles (${count})`} bodyClassName="p-0">
        {count === 0 ? (
          <EmptyState title="All Clear" description="No vehicles currently need attention." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/80 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Vehicle</th>
                  <th className="px-4 py-2">Issue</th>
                  <th className="px-4 py-2">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {attentionVehicles.map(v => {
                  const lowFuel = v.latest?.fuelLevelPct !== undefined && v.latest.fuelLevelPct < 20;
                  const highTemp = v.latest?.engineTempC !== undefined && v.latest.engineTempC > 90;
                  const issues = [] as string[];
                  const alert = alerts.find(a => a.vehicleId === v.id && (a.severity === "CRITICAL" || a.severity === "WARNING"));
                  if (alert) issues.push(`${alert.severity}: ${alert.type.replace(/_/g, " ")}`);
                  if (lowFuel) issues.push(`Low fuel (${v.latest?.fuelLevelPct?.toFixed(0)}%)`);
                  if (highTemp) issues.push(`High engine temp (${v.latest?.engineTempC?.toFixed(0)}°C)`);
                  return (
                    <tr key={v.id} className="hover:bg-accent/30">
                      <td className="px-4 py-2">
                        <Link to="/vehicles/$id" params={{ id: v.id }} className="text-primary underline">
                          {v.plate}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {issues.join(", ")}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {timeAgo(v.lastSeenAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
