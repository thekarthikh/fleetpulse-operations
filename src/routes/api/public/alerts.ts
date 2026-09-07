import { createFileRoute } from "@tanstack/react-router";
import { handle, json, problem, queryOf } from "@/lib/fleet/http";
import { paginate, repo } from "@/lib/fleet/store";

export const Route = createFileRoute("/api/public/alerts")({
  server: {
    handlers: {
      GET: ({ request }) =>
        handle("GET /api/public/alerts", () => {
          const { get, num } = queryOf(request);
          const severity = get("severity");
          const type = get("type");
          const vehicleId = get("vehicleId");
          const search = get("search")?.toLowerCase();
          const ack = get("acknowledged");

          let rows = repo.allAlerts();
          if (severity && severity !== "ALL") rows = rows.filter((a) => a.severity === severity);
          if (type && type !== "ALL") rows = rows.filter((a) => a.type === type);
          if (vehicleId) rows = rows.filter((a) => a.vehicleId === vehicleId);
          if (ack === "true" || ack === "false")
            rows = rows.filter((a) => String(a.acknowledged) === ack);
          if (search) rows = rows.filter((a) => a.message.toLowerCase().includes(search));

          return json(
            paginate(rows as unknown as Record<string, unknown>[], {
              page: num("page"),
              size: num("size") ?? 30,
              sort: get("sort") ?? "createdAt",
              order: (get("order") as "asc" | "desc") ?? "desc",
            }),
          );
        }),

      POST: ({ request }) =>
        handle("POST /api/public/alerts", async () => {
          const body = (await request.json().catch(() => null)) as { id?: string } | null;
          if (!body?.id) return problem(400, "BAD_REQUEST", "Field 'id' is required");
          const ackd = repo.acknowledge(body.id);
          if (!ackd) return problem(404, "NOT_FOUND", `Alert ${body.id} not found`);
          return json(ackd);
        }),
    },
  },
});
