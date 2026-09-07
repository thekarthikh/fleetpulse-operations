import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVehicles } from "@/lib/fleet/client";
import { EmptyState, PageHeader, Panel, SkeletonGrid, StatusBadge, timeAgo } from "@/components/fleet/ui";

export const Route = createFileRoute("/vehicles/")({
  head: () => ({
    meta: [
      { title: "Fleet Registry | FleetPulse" },
      {
        name: "description",
        content: "Browse all 25 connected vehicles with server-side search, filtering, sorting and pagination.",
      },
      { property: "og:title", content: "Fleet Registry | FleetPulse" },
      { property: "og:description", content: "Vehicle registry with live state projections from the telemetry pipeline." },
    ],
  }),
  component: VehiclesPage,
});

const COLUMNS = [
  { key: "plate", label: "Vehicle" },
  { key: "driverName", label: "Driver" },
  { key: "depot", label: "Depot" },
  { key: "status", label: "Status" },
  { key: "speedKph", label: "Speed" },
  { key: "fuelLevelPct", label: "Energy" },
  { key: "engineTempC", label: "Engine" },
  { key: "odometerKm", label: "Odometer" },
  { key: "healthScore", label: "Health" },
  { key: "lastSeenAt", label: "Last seen" },
] as const;

function VehiclesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [depot, setDepot] = useState("ALL");
  const [sort, setSort] = useState<string>("plate");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useVehicles({ search, status, depot, sort, order, page, size: 10 });

  const toggleSort = (key: string) => {
    if (sort === key) setOrder(order === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setOrder("asc");
    }
  };

  return (
    <>
      <PageHeader
        title="Fleet Registry"
        subtitle="GET /api/public/vehicles — paginated, filterable and sortable projections of vehicle state."
      />

      <Panel
        title="Vehicles"
        subtitle={data ? `${data.totalElements} results · page ${data.page + 1}/${data.totalPages}` : "loading…"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Search…"
                className="h-8 w-44 pl-7 text-xs"
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["ALL", "MOVING", "IDLE", "PARKED", "MAINTENANCE"].map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={depot} onValueChange={(v) => { setDepot(v); setPage(0); }}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["ALL", "SFO North Depot", "Oakland Yard", "San Mateo Hub"].map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        bodyClassName="p-0"
      >
        {isLoading && !data ? (
          <SkeletonGrid rows={8} className="p-4" />
        ) : !data || data.content.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No vehicles found" description="Try clearing the search or filters." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/80 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {COLUMNS.map((c) => (
                    <th key={c.key} className="px-4 py-2 font-medium">
                      <button
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {c.label}
                        <ArrowUpDown className={sort === c.key ? "size-3 text-primary" : "size-3 opacity-40"} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.content.map((v) => (
                  <tr key={v.id} className="transition-colors hover:bg-accent/40">
                    <td className="px-4 py-2">
                      <Link to="/vehicles/$id" params={{ id: v.id }} className="num text-primary hover:underline">
                        {v.plate}
                      </Link>
                      <div className="text-[10px] text-muted-foreground">{v.make} {v.model} · {v.year}</div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{v.driverName}</td>
                    <td className="px-4 py-2 text-muted-foreground">{v.depot}</td>
                    <td className="px-4 py-2"><StatusBadge status={v.status} /></td>
                    <td className="num px-4 py-2">{v.speedKph.toFixed(0)}</td>
                    <td className="num px-4 py-2">{v.fuelLevelPct.toFixed(0)}%</td>
                    <td className="num px-4 py-2">{v.engineTempC.toFixed(0)} °C</td>
                    <td className="num px-4 py-2">{Math.round(v.odometerKm).toLocaleString()} km</td>
                    <td className="num px-4 py-2">
                      <span className={v.healthScore > 75 ? "text-success" : v.healthScore > 50 ? "text-warning" : "text-critical"}>
                        {v.healthScore}
                      </span>
                    </td>
                    <td className="num px-4 py-2 text-muted-foreground">{timeAgo(v.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
            <span className="num">
              showing {data.content.length} of {data.totalElements}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={data.page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={data.page >= data.totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}
