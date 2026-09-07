import { createFileRoute } from "@tanstack/react-router";
import { computeAnalytics } from "@/lib/fleet/analytics";
import { handle, json } from "@/lib/fleet/http";
import { repo } from "@/lib/fleet/store";

/** Aggregated read-model for the operations dashboard (one round trip). */
export const Route = createFileRoute("/api/public/dashboard")({
  server: {
    handlers: {
      GET: () =>
        handle("GET /api/public/dashboard", () => {
          const vehicles = repo.vehicles();
          return json({
            analytics: computeAnalytics(),
            vehicles: vehicles.map((v) => ({
              id: v.id,
              plate: v.plate,
              make: v.make,
              model: v.model,
              depot: v.depot,
              fuelType: v.fuelType,
              status: v.status,
              healthScore: v.healthScore,
              driverName: repo.driver(v.driverId)?.name ?? "Unassigned",
              lastSeenAt: v.lastSeenAt,
              latest: v.latest,
            })),
            alerts: repo.allAlerts().slice(0, 40),
            maintenance: repo
              .maintenance()
              .filter((m) => m.status !== "COMPLETED")
              .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))
              .slice(0, 10),
            serverTime: new Date().toISOString(),
          });
        }),
    },
  },
});
