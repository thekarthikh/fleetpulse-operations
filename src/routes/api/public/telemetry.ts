import { createFileRoute } from "@tanstack/react-router";
import { handle, json, problem, queryOf } from "@/lib/fleet/http";
import { ingest, paginate, repo } from "@/lib/fleet/store";

export const Route = createFileRoute("/api/public/telemetry")({
  server: {
    handlers: {
      /** Telemetry Ingestion API. Accepts a single reading or a batch. */
      POST: ({ request }) =>
        handle("POST /api/public/telemetry", async () => {
          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return problem(400, "BAD_REQUEST", "Request body must be valid JSON");
          }

          const batch = Array.isArray(body) ? body : [body];
          if (batch.length > 500)
            return problem(413, "PAYLOAD_TOO_LARGE", "Batch limited to 500 readings");

          const results = batch.map((item) => ingest(item));
          const accepted = results.filter((r) => r.accepted);
          const rejected = results.filter((r) => !r.accepted);

          return json(
            {
              accepted: accepted.length,
              rejected: rejected.length,
              alertsGenerated: results.flatMap((r) => r.alerts),
              errors: rejected.map((r) => r.issues),
            },
            rejected.length && !accepted.length ? 422 : 202,
          );
        }),

      /** Recent readings across the fleet, filterable + paginated. */
      GET: ({ request }) =>
        handle("GET /api/public/telemetry", () => {
          const { get, num } = queryOf(request);
          const vehicleId = get("vehicleId");
          const rows = (
            vehicleId
              ? repo.history(vehicleId)
              : repo.vehicles().flatMap((v) => repo.history(v.id).slice(-8))
          )
            .slice()
            .sort((a, b) => +new Date(b.recordedAt) - +new Date(a.recordedAt));

          const minSpeed = num("minSpeed");
          const filtered = minSpeed ? rows.filter((r) => r.speedKph >= minSpeed) : rows;

          return json(
            paginate(filtered as unknown as Record<string, unknown>[], {
              page: num("page"),
              size: num("size") ?? 50,
              sort: get("sort") ?? "recordedAt",
              order: (get("order") as "asc" | "desc") ?? "desc",
            }),
          );
        }),
    },
  },
});
