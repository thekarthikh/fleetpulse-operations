import { createFileRoute } from "@tanstack/react-router";
import { handle, json, queryOf } from "@/lib/fleet/http";
import { paginate, repo } from "@/lib/fleet/store";

export const Route = createFileRoute("/api/public/vehicles")({
  server: {
    handlers: {
      GET: ({ request }) =>
        handle("GET /api/public/vehicles", () => {
          const { get, num } = queryOf(request);
          const search = get("search")?.toLowerCase();
          const status = get("status");
          const depot = get("depot");

          let rows = repo.vehicles();
          if (status && status !== "ALL") rows = rows.filter((v) => v.status === status);
          if (depot && depot !== "ALL") rows = rows.filter((v) => v.depot === depot);
          if (search)
            rows = rows.filter((v) =>
              [v.plate, v.make, v.model, v.vin, v.depot].join(" ").toLowerCase().includes(search),
            );

          const flat = rows.map((v) => ({
            ...v,
            driverName: repo.driver(v.driverId)?.name ?? "Unassigned",
            speedKph: v.latest?.speedKph ?? 0,
            fuelLevelPct: v.latest?.fuelLevelPct ?? 0,
            engineTempC: v.latest?.engineTempC ?? 0,
            batteryVoltage: v.latest?.batteryVoltage ?? 0,
            odometerKm: v.latest?.odometerKm ?? 0,
          }));

          return json(
            paginate(flat as unknown as Record<string, unknown>[], {
              page: num("page"),
              size: num("size") ?? 25,
              sort: get("sort"),
              order: get("order") as "asc" | "desc" | undefined,
            }),
          );
        }),
    },
  },
});
