import { createFileRoute } from "@tanstack/react-router";
import { useHealth } from "@/lib/fleet/client";
import { PageHeader, Panel } from "@/components/fleet/ui";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "System Architecture | FleetPulse" },
      {
        name: "description",
        content: "How FleetPulse ingests telemetry: simulator, validation, rules engine, repository, analytics and REST API layers.",
      },
      { property: "og:title", content: "System Architecture | FleetPulse" },
      { property: "og:description", content: "Clean-architecture breakdown of the FleetPulse telemetry pipeline." },
    ],
  }),
  component: ArchitecturePage,
});

const STAGES = [
  {
    name: "Device simulator",
    file: "lib/fleet/simulator.ts",
    detail:
      "Physically coherent telemetry per vehicle: speed integrates into position via heading, RPM tracks load, fuel burns as a function of work done. Injects malformed payloads to exercise validation.",
  },
  {
    name: "Ingestion endpoint",
    file: "routes/api/public/telemetry.ts",
    detail: "Accepts single or batched readings, enforces payload limits and returns per-record accept/reject results.",
  },
  {
    name: "Validation layer",
    file: "lib/fleet/validation.ts",
    detail:
      "Zod schema validation plus semantic checks: sensor ranges, monotonic odometer, timestamp skew and Haversine GPS jump plausibility.",
  },
  {
    name: "Rules engine",
    file: "lib/fleet/rules.ts",
    detail:
      "Pure predicates for speeding, low fuel, low battery, overheating, tire pressure, idling, geofence breach and maintenance due. Emits severity-scored alerts and the weighted health score.",
  },
  {
    name: "Repository & state store",
    file: "lib/fleet/store.ts",
    detail:
      "In-memory event store with bounded retention, vehicle state projection, alert deduplication with cooldown windows and generic pagination/sorting.",
  },
  {
    name: "Analytics service",
    file: "lib/fleet/analytics.ts",
    detail: "Fleet KPI rollups, depot aggregation, speed histogram and rolling utilization trend snapshots.",
  },
  {
    name: "REST API",
    file: "routes/api/public/*",
    detail: "Documented endpoints with consistent envelopes, structured errors and an OpenAPI 3.1 contract.",
  },
  {
    name: "Dashboard",
    file: "routes/*.tsx",
    detail: "React Query polls the composite read-model every 2s; optimistic acknowledgements and toast notifications for critical events.",
  },
];

function ArchitecturePage() {
  const { data: health } = useHealth();

  return (
    <>
      <PageHeader
        title="System Architecture"
        subtitle="FleetPulse is layered as a clean-architecture service: domain, application, infrastructure and delivery are kept strictly separate."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Telemetry pipeline" subtitle="Data flows top to bottom; each stage is independently testable">
          <ol className="relative space-y-4 border-l border-border/70 pl-6">
            {STAGES.map((s, i) => (
              <li key={s.name} className="relative">
                <span className="num absolute -left-[31px] flex size-6 items-center justify-center rounded-full border border-border bg-surface-2 text-[10px] text-primary">
                  {i + 1}
                </span>
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                <p className="num text-[10px] text-primary/80">src/{s.file}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.detail}</p>
              </li>
            ))}
          </ol>
        </Panel>

        <div className="space-y-4">
          <Panel title="Component health" subtitle="GET /api/public/health">
            <div className="space-y-2 text-xs">
              {health ? (
                Object.entries(health.components).map(([name, c]) => (
                  <div key={name} className="flex items-center justify-between rounded-md border border-border/60 bg-surface-2/60 px-3 py-2">
                    <span className="text-foreground/85">{name}</span>
                    <span className={`num text-[10px] ${c.status === "UP" ? "text-success" : "text-critical"}`}>{c.status}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">connecting…</p>
              )}
              {health && (
                <p className="num pt-1 text-[10px] text-muted-foreground">
                  v{health.version} · uptime {Math.round(health.uptimeSeconds)}s
                </p>
              )}
            </div>
          </Panel>

          <Panel title="Design decisions" subtitle="Trade-offs worth calling out">
            <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li>• <span className="text-foreground/85">Deterministic seeding</span> — a seeded PRNG makes the fleet reproducible across restarts and test runs.</li>
              <li>• <span className="text-foreground/85">Bounded retention</span> — the store keeps a rolling window per vehicle so memory stays flat under continuous ingest.</li>
              <li>• <span className="text-foreground/85">Alert cooldowns</span> — deduplication prevents a single sustained condition from flooding the console.</li>
              <li>• <span className="text-foreground/85">Composite read-model</span> — the dashboard hits one endpoint instead of six, keeping realtime polling cheap.</li>
              <li>• <span className="text-foreground/85">Pure rules</span> — the rules engine has no I/O, so each predicate is trivially unit-testable.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
