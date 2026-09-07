import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTelemetry } from "@/lib/fleet/client";
import { EmptyState, PageHeader, Panel, SkeletonGrid } from "@/components/fleet/ui";

export const Route = createFileRoute("/telemetry")({
  head: () => ({
    meta: [
      { title: "Telemetry Explorer | FleetPulse" },
      {
        name: "description",
        content: "Query raw telemetry readings ingested from the fleet: speed, GPS, fuel, RPM, engine temperature and tire pressure.",
      },
      { property: "og:title", content: "Telemetry Explorer | FleetPulse" },
      { property: "og:description", content: "Paginated raw sensor readings straight from the ingestion pipeline." },
    ],
  }),
  component: TelemetryPage,
});

function TelemetryPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const { data, isLoading } = useTelemetry({ search, page, size: 25, sort: "recordedAt", order: "desc" });

  return (
    <>
      <PageHeader
        title="Telemetry Explorer"
        subtitle="GET /api/public/telemetry — every reading is schema-validated and range-checked before it lands in the store."
      />

      <Panel
        title="Raw readings"
        subtitle={data ? `${data.totalElements.toLocaleString()} readings retained · page ${data.page + 1}/${data.totalPages}` : "loading…"}
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Filter by vehicle id…"
              className="h-8 w-56 pl-7 text-xs"
            />
          </div>
        }
        bodyClassName="p-0"
      >
        {isLoading && !data ? (
          <SkeletonGrid rows={10} className="p-4" />
        ) : !data || data.content.length === 0 ? (
          <div className="p-4"><EmptyState title="No readings" description="No telemetry matched this query." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/80 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {["Recorded", "Vehicle", "Speed", "Lat", "Lng", "Heading", "Fuel", "Volts", "RPM", "Temp", "Tire", "Odometer", "Ignition"].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.content.map((t) => (
                  <tr key={t.id} className="num transition-colors hover:bg-accent/40">
                    <td className="px-3 py-1.5 text-muted-foreground">{new Date(t.recordedAt).toLocaleTimeString()}</td>
                    <td className="px-3 py-1.5 text-primary">{t.vehicleId}</td>
                    <td className="px-3 py-1.5">{t.speedKph.toFixed(1)}</td>
                    <td className="px-3 py-1.5">{t.latitude.toFixed(4)}</td>
                    <td className="px-3 py-1.5">{t.longitude.toFixed(4)}</td>
                    <td className="px-3 py-1.5">{t.heading.toFixed(0)}°</td>
                    <td className="px-3 py-1.5">{t.fuelLevelPct.toFixed(1)}%</td>
                    <td className="px-3 py-1.5">{t.batteryVoltage.toFixed(2)}</td>
                    <td className="px-3 py-1.5">{t.rpm.toFixed(0)}</td>
                    <td className={`px-3 py-1.5 ${t.engineTempC > 105 ? "text-critical" : ""}`}>{t.engineTempC.toFixed(1)}</td>
                    <td className="px-3 py-1.5">{t.tirePressurePsi.toFixed(1)}</td>
                    <td className="px-3 py-1.5">{Math.round(t.odometerKm).toLocaleString()}</td>
                    <td className="px-3 py-1.5">{t.ignitionOn ? "ON" : "OFF"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
            <span className="num">page {data.page + 1} of {data.totalPages}</span>
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
