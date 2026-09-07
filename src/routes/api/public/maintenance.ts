import { createFileRoute } from "@tanstack/react-router";
import { handle, json, queryOf } from "@/lib/fleet/http";
import { paginate, repo } from "@/lib/fleet/store";

export const Route = createFileRoute("/api/public/maintenance")({
  server: {
    handlers: {
      GET: ({ request }) =>
        handle("GET /api/public/maintenance", () => {
          const { get, num } = queryOf(request);
          const status = get("status");
          const search = get("search")?.toLowerCase();

          let rows = repo.maintenance();
          if (status && status !== "ALL") rows = rows.filter((m) => m.status === status);
          if (search)
            rows = rows.filter((m) =>
              `${m.vehiclePlate} ${m.task}`.toLowerCase().includes(search),
            );

          return json({
            ...paginate(rows as unknown as Record<string, unknown>[], {
              page: num("page"),
              size: num("size") ?? 25,
              sort: get("sort") ?? "dueDate",
              order: (get("order") as "asc" | "desc") ?? "asc",
            }),
            serviceHistory: repo
              .serviceHistory()
              .sort((a, b) => +new Date(b.performedAt) - +new Date(a.performedAt))
              .slice(0, 40),
          });
        }),
    },
  },
});
