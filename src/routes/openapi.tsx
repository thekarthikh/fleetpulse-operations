import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/fleet/ui";

export const Route = createFileRoute("/openapi")({
  head: () => ({
    meta: [
      { title: "API Reference | FleetPulse" },
      {
        name: "description",
        content: "OpenAPI 3.1 reference for the FleetPulse telemetry API: vehicles, telemetry ingestion, alerts, maintenance and analytics.",
      },
      { property: "og:title", content: "API Reference | FleetPulse" },
      { property: "og:description", content: "Browse every FleetPulse REST endpoint and its request/response contract." },
    ],
  }),
  component: OpenApiPage,
});

interface OpenApiDoc {
  info: { title: string; version: string; description?: string };
  paths: Record<string, Record<string, { summary?: string; description?: string; tags?: string[] }>>;
}

const METHOD_TONE: Record<string, string> = {
  get: "text-success border-success/40",
  post: "text-primary border-primary/40",
  put: "text-warning border-warning/40",
  delete: "text-critical border-critical/40",
};

function OpenApiPage() {
  const { data } = useQuery({
    queryKey: ["openapi"],
    queryFn: async () => {
      const res = await fetch("/api/public/openapi.json");
      if (!res.ok) throw new Error("Failed to load the API specification");
      return (await res.json()) as OpenApiDoc;
    },
  });
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="API Reference"
        subtitle="Machine-readable contract served at /api/public/openapi.json — import it into Postman, Insomnia or a codegen pipeline."
        actions={
          <Button size="sm" variant="outline" asChild>
            <a href="/api/public/openapi.json" target="_blank" rel="noreferrer">Download spec</a>
          </Button>
        }
      />

      <Panel title={data?.info.title ?? "Specification"} subtitle={data ? `OpenAPI 3.1 · version ${data.info.version}` : "loading…"} bodyClassName="p-0">
        {!data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 bg-muted/50" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {Object.entries(data.paths).flatMap(([path, ops]) =>
              Object.entries(ops).map(([method, op]) => {
                const key = `${method}:${path}`;
                return (
                  <li key={key}>
                    <button
                      onClick={() => setOpen(open === key ? null : key)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/40"
                    >
                      <span className={`num rounded border px-1.5 py-0.5 text-[10px] uppercase ${METHOD_TONE[method] ?? "text-muted-foreground border-border"}`}>
                        {method}
                      </span>
                      <span className="num text-xs text-foreground">{path}</span>
                      <span className="ml-auto truncate text-[11px] text-muted-foreground">{op.summary}</span>
                    </button>
                    {open === key && (
                      <div className="border-t border-border/60 bg-surface-2/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                        {op.description ?? op.summary}
                        {op.tags && <p className="num mt-2 text-[10px] text-primary/80">tags: {op.tags.join(", ")}</p>}
                      </div>
                    )}
                  </li>
                );
              }),
            )}
          </ul>
        )}
      </Panel>
    </>
  );
}
