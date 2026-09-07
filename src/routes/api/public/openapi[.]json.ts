import { createFileRoute } from "@tanstack/react-router";
import { handle, json } from "@/lib/fleet/http";
import { openApiSpec } from "@/lib/fleet/openapi";

export const Route = createFileRoute("/api/public/openapi.json")({
  server: {
    handlers: {
      GET: () => handle("GET /api/public/openapi.json", () => json(openApiSpec)),
    },
  },
});
