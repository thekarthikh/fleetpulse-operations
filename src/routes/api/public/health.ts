import { createFileRoute } from "@tanstack/react-router";
import { handle, json } from "@/lib/fleet/http";
import { repo } from "@/lib/fleet/store";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: () =>
        handle("GET /api/public/health", () => {
          const stats = repo.stats();
          return json({
            status: "UP",
            components: {
              ingestion: { status: "UP", ingested: stats.totalIngested, rejected: stats.totalRejected },
              rulesEngine: { status: "UP" },
              simulator: { status: "UP", ticks: stats.ticks, lastTickMs: stats.lastTickDurationMs },
              store: { status: "UP", vehicles: repo.fleetSize },
            },
            uptimeSeconds: stats.uptimeSeconds,
            version: "1.0.0",
          });
        }),
    },
  },
});
