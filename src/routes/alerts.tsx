import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAcknowledgeAlert, useAlerts } from "@/lib/fleet/client";
import { EmptyState, PageHeader, Panel, SeverityBadge, SkeletonGrid, timeAgo } from "@/components/fleet/ui";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alert Console | FleetPulse" },
      {
        name: "description",
        content: "Triage speeding, low fuel, overheating, geofence and maintenance alerts produced by the fleet rules engine.",
      },
      { property: "og:title", content: "Alert Console | FleetPulse" },
      { property: "og:description", content: "Acknowledge and filter rules-engine alerts across the fleet." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const [severity, setSeverity] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [ack, setAck] = useState("open");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useAlerts({ severity, type, acknowledged: ack, page, size: 20 });
  const acknowledge = useAcknowledgeAlert();

  return (
    <>
      <PageHeader
        title="Alert Console"
        subtitle="Deduplicated, cooldown-throttled output of the rules engine. Acknowledge to clear from the active feed."
      />

      <Panel
        title="Alerts"
        subtitle={data ? `${data.totalElements} matching alerts` : "loading…"}
        actions={
          <div className="flex flex-wrap gap-2">
            <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(0); }}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["ALL", "CRITICAL", "WARNING", "INFO"].map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={(v) => { setType(v); setPage(0); }}>
              <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["ALL", "SPEEDING", "LOW_FUEL", "OVERHEATING", "LOW_BATTERY", "GEOFENCE_VIOLATION", "IDLE_VEHICLE", "MAINTENANCE_REQUIRED", "TIRE_PRESSURE"].map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ack} onValueChange={(v) => { setAck(v); setPage(0); }}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open" className="text-xs">Open only</SelectItem>
                <SelectItem value="true" className="text-xs">Acknowledged</SelectItem>
                <SelectItem value="ALL" className="text-xs">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        bodyClassName="p-0"
      >
        {isLoading && !data ? (
          <SkeletonGrid rows={8} className="p-4" />
        ) : !data || data.content.length === 0 ? (
          <div className="p-4"><EmptyState title="No alerts" description="Nothing matches these filters right now." /></div>
        ) : (
          <ul className="divide-y divide-border/60">
            {data.content.map((al) => (
              <li key={al.id} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/30">
                <SeverityBadge severity={al.severity} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Link to="/vehicles/$id" params={{ id: al.vehicleId }} className="num text-primary hover:underline">
                      {al.vehiclePlate}
                    </Link>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {al.type.replace(/_/g, " ")}
                    </span>
                    <span className="num text-[10px] text-muted-foreground">{timeAgo(al.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-foreground/85">{al.message}</p>
                  <p className="num mt-0.5 text-[10px] text-muted-foreground">
                    observed {al.value} · threshold {al.threshold}
                  </p>
                </div>
                {al.acknowledged ? (
                  <span className="num flex items-center gap-1 text-[10px] text-success"><Check className="size-3" /> acknowledged</span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={acknowledge.isPending}
                    onClick={() =>
                      acknowledge.mutate(al.id, {
                        onSuccess: () => toast.success(`Acknowledged ${al.vehiclePlate}`),
                        onError: (e) => toast.error((e as Error).message),
                      })
                    }
                  >
                    Acknowledge
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {data && (
          <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
            <span className="num">page {data.page + 1} of {Math.max(1, data.totalPages)}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={data.page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={data.page >= data.totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}
