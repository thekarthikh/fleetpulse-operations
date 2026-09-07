/** OpenAPI 3.1 description of the FleetPulse REST surface. */
export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "FleetPulse Telemetry API",
    version: "1.0.0",
    description:
      "Ingestion, query and analytics API for a 25-vehicle connected fleet. Pipeline: simulator → ingestion → validation → rules engine → store → analytics → REST → realtime dashboard.",
  },
  servers: [{ url: "/api/public", description: "FleetPulse edge runtime" }],
  tags: [
    { name: "Telemetry", description: "High-volume ingestion and historical reads" },
    { name: "Fleet", description: "Vehicle registry and state projections" },
    { name: "Alerts", description: "Rules-engine output" },
    { name: "Analytics", description: "Aggregated fleet KPIs" },
    { name: "Maintenance", description: "Service plan and history" },
    { name: "Ops", description: "Health and simulation control" },
  ],
  paths: {
    "/telemetry": {
      post: {
        tags: ["Telemetry"],
        summary: "Ingest one reading or a batch (max 500)",
        responses: {
          "202": { description: "Accepted; returns counts and generated alerts" },
          "400": { description: "Malformed JSON body" },
          "422": { description: "All readings failed validation" },
        },
      },
      get: {
        tags: ["Telemetry"],
        summary: "Query telemetry history",
        parameters: ["vehicleId", "minSpeed", "page", "size", "sort", "order"],
        responses: { "200": { description: "Paged telemetry readings" } },
      },
    },
    "/vehicles": {
      get: {
        tags: ["Fleet"],
        summary: "List vehicles with search, filter, sort, pagination",
        parameters: ["search", "status", "depot", "page", "size", "sort", "order"],
        responses: { "200": { description: "Paged vehicle projections" } },
      },
    },
    "/vehicles/{id}": {
      get: {
        tags: ["Fleet"],
        summary: "Vehicle aggregate: state, driver, telemetry, alerts, service history",
        parameters: ["id", "history"],
        responses: { "200": { description: "Vehicle aggregate" }, "404": { description: "Unknown vehicle" } },
      },
    },
    "/alerts": {
      get: {
        tags: ["Alerts"],
        summary: "Query alerts",
        parameters: ["severity", "type", "vehicleId", "acknowledged", "search", "page", "size"],
        responses: { "200": { description: "Paged alerts" } },
      },
      post: {
        tags: ["Alerts"],
        summary: "Acknowledge an alert",
        responses: { "200": { description: "Acknowledged alert" }, "404": { description: "Not found" } },
      },
    },
    "/analytics": {
      get: {
        tags: ["Analytics"],
        summary: "Fleet-wide KPI rollup",
        responses: { "200": { description: "FleetAnalytics document" } },
      },
    },
    "/dashboard": {
      get: {
        tags: ["Analytics"],
        summary: "Composite dashboard read-model (single round trip)",
        responses: { "200": { description: "Analytics + vehicles + alerts + maintenance" } },
      },
    },
    "/maintenance": {
      get: {
        tags: ["Maintenance"],
        summary: "Service plan with status filter and recent service history",
        parameters: ["status", "search", "page", "size", "sort", "order"],
        responses: { "200": { description: "Paged maintenance records" } },
      },
    },
    "/simulate/tick": {
      post: {
        tags: ["Ops"],
        summary: "Advance the vehicle simulator by N ticks",
        parameters: ["ticks"],
        responses: { "202": { description: "Tick result" } },
      },
    },
    "/health": {
      get: {
        tags: ["Ops"],
        summary: "Liveness/readiness with per-component status",
        responses: { "200": { description: "Health document" } },
      },
    },
  },
} as const;
