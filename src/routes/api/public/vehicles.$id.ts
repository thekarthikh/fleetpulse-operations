import { createFileRoute } from "@tanstack/react-router";
import { handle, json, problem, queryOf } from "@/lib/fleet/http";
import { repo } from "@/lib/fleet/store";

export const Route = createFileRoute("/api/public/vehicles/$id")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        handle("GET /api/public/vehicles/{id}", () => {
          const vehicle = repo.vehicle(params.id);
          if (!vehicle) return problem(404, "NOT_FOUND", `Vehicle ${params.id} does not exist`);
          const { num } = queryOf(request);
          const limit = Math.min(180, num("history") ?? 60);

          return json({
            vehicle,
            driver: repo.driver(vehicle.driverId),
            telemetry: repo.history(vehicle.id).slice(-limit),
            alerts: repo.allAlerts().filter((a) => a.vehicleId === vehicle.id).slice(0, 25),
            maintenance: repo.maintenance().filter((m) => m.vehicleId === vehicle.id),
            serviceHistory: repo
              .serviceHistory(vehicle.id)
              .sort((a, b) => +new Date(b.performedAt) - +new Date(a.performedAt)),
          });
        }),
    },
  },
});
