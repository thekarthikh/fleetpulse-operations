import { createFileRoute } from "@tanstack/react-router";
import { computeAnalytics } from "@/lib/fleet/analytics";
import { handle, json } from "@/lib/fleet/http";

export const Route = createFileRoute("/api/public/analytics")({
  server: {
    handlers: {
      GET: () => handle("GET /api/public/analytics", () => json(computeAnalytics())),
    },
  },
});
