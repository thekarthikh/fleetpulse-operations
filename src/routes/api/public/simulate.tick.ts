import { createFileRoute } from "@tanstack/react-router";
import { handle, json, queryOf } from "@/lib/fleet/http";
import { repo } from "@/lib/fleet/store";

/** Manually advance the vehicle simulator by N ticks (25 readings per tick). */
export const Route = createFileRoute("/api/public/simulate/tick")({
  server: {
    handlers: {
      POST: ({ request }) =>
        handle("POST /api/public/simulate/tick", () => {
          const { num } = queryOf(request);
          const result = repo.runTick(num("ticks") ?? 1);
          return json({ ...result, fleetSize: repo.fleetSize, at: new Date().toISOString() }, 202);
        }),
    },
  },
});
