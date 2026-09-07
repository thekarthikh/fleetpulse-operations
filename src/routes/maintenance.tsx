import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarClock, Wrench } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMaintenance } from "@/lib/fleet/client";
import { EmptyState, KpiCard, PageHeader, Panel, SkeletonGrid } from "@/components/fleet/ui";

export const Route = createFileRoute("/maintenance")({
  head: () => ({
    meta: [
      { title: "Maintenance Scheduler | FleetPulse" },
      {
        name: "description",
        content: "Track scheduled, due and overdue service tasks plus completed workshop history across the fleet.",
      },
      { property: "og:title", content: "Maintenance Scheduler | FleetPulse" },
      { property: "og:description", content: "Odometer- and date-driven service scheduling for every vehicle." },
    ],
  }),
  component: MaintenancePage,
});

const STATUS_TONE: Record<string, string> = {
  OVERDUE: "text-critical",
  DUE: "text-warning",
  SCHEDULED: "text-muted-foreground",
  COMPLETED: "text-success",
};

function MaintenancePage() {
  const [status, setStatus] = useState("ALL");
  const { data, isLoading } = useMaintenance({ status, size: 50 });

  const counts = (data?.content ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] ?? 0) + 1;
    return acc;
  }, {});
  const spend = (data?.serviceHistory ?? []).reduce((s, e) => s + e.costUsd, 0);

  return (
    <>
      <PageHeader
        title="Maintenance"
        subtitle="Service tasks generated from odometer thresholds and time intervals, joined with completed workshop history."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Overdue" value={counts.OVERDUE ?? 0} tone="critical" icon={<CalendarClock className="size-4" />} />
        <KpiCard label="Due soon" value={counts.DUE ?? 0} tone="warning" icon={<Wrench className="size-4" />} />
        <KpiCard label="Scheduled" value={counts.SCHEDULED ?? 0} />
        <KpiCard label="Historic spend" value={`$${Math.round(spend).toLocaleString()}`} hint="recent workshop invoices" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Service schedule"
          subtitle={data ? `${data.totalElements} tasks` : "loading…"}
          actions={
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["ALL", "OVERDUE", "DUE", "SCHEDULED", "COMPLETED"].map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          bodyClassName="p-0"
        >
          {isLoading && !data ? (
            <SkeletonGrid rows={8} className="p-4" />
          ) : !data || data.content.length === 0 ? (
            <div className="p-4"><EmptyState title="Nothing scheduled" description="No maintenance tasks match this filter." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2/80 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {["Vehicle", "Task", "Due date", "Due odometer", "Est. cost", "Status"].map((h) => (
                      <th key={h} className="px-4 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.content.map((m) => (
                    <tr key={m.id} className="transition-colors hover:bg-accent/40">
                      <td className="px-4 py-2">
                        <Link to="/vehicles/$id" params={{ id: m.vehicleId }} className="num text-primary hover:underline">
                          {m.vehiclePlate}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-foreground/85">{m.task}</td>
                      <td className="num px-4 py-2 text-muted-foreground">{new Date(m.dueDate).toLocaleDateString()}</td>
                      <td className="num px-4 py-2 text-muted-foreground">{Math.round(m.dueAtOdometerKm).toLocaleString()} km</td>
                      <td className="num px-4 py-2">${m.costUsd.toLocaleString()}</td>
                      <td className={`num px-4 py-2 ${STATUS_TONE[m.status]}`}>{m.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Workshop history" subtitle="Most recent completed services" bodyClassName="p-0">
          <div className="max-h-[440px] overflow-y-auto">
            {!data ? (
              <SkeletonGrid rows={6} className="p-4" />
            ) : data.serviceHistory.length === 0 ? (
              <div className="p-4"><EmptyState title="No history" description="No completed services recorded." /></div>
            ) : (
              <ul className="divide-y divide-border/60">
                {data.serviceHistory.map((s) => (
                  <li key={s.id} className="px-4 py-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-foreground/90">{s.description}</span>
                      <span className="num text-muted-foreground">${s.costUsd.toLocaleString()}</span>
                    </div>
                    <p className="num text-[10px] text-muted-foreground">
                      {new Date(s.performedAt).toLocaleDateString()} · {s.workshop}
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
