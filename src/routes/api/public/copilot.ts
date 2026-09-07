import { createFileRoute } from "@tanstack/react-router";
import type { RequestHandler } from "@tanstack/react-router";
import { get } from "@/lib/fleet/client"; // reuse fetch helper
import type { DashboardPayload } from "@/lib/fleet/client";

// Simple intent detection based on keywords
function detectIntent(question: string) {
  const q = question.toLowerCase();
  if (q.includes("attention") || q.includes("need attention")) return "attention";
  if (q.includes("low fuel") || q.includes("fuel")) return "low_fuel";
  if (q.includes("overheat") || q.includes("overheating") || q.includes("temperature")) return "overheat";
  if (q.includes("most serious") && q.includes("alert")) return "serious_alerts";
  if (q.includes("alert")) return "alerts";
  if (q.includes("summar") && q.includes("health")) return "summary_health";
  if (q.includes("priorit")) return "prioritize";
  if (q.includes("risk")) return "risk";
  if (q.includes("abnormal") && q.includes("telemetry")) return "abnormal_telemetry";
  return "unknown";
}

function formatVehicles(vehicles: DashboardPayload["vehicles"]) {
  return vehicles.map(v => `${v.plate} (id:${v.id})`).join(", ");
}

function handleIntent(intent: string, data: DashboardPayload) {
  const { vehicles, alerts, analytics } = data;
  switch (intent) {
    case "attention": {
      const attentionVehicles = vehicles.filter(v => {
        const lowFuel = v.latest?.fuelLevelPct !== undefined && v.latest.fuelLevelPct < 20;
        const highTemp = v.latest?.engineTempC !== undefined && v.latest.engineTempC > 90;
        const hasCriticalAlert = alerts.some(a => a.vehicleId === v.id && a.severity === "CRITICAL");
        return lowFuel || highTemp || hasCriticalAlert;
      });
      if (attentionVehicles.length === 0) return "No vehicles currently require immediate attention.";
      return `Vehicles needing attention: ${formatVehicles(attentionVehicles)}.`;
    }
    case "low_fuel": {
      const lowFuelVehicles = vehicles.filter(v => v.latest?.fuelLevelPct !== undefined && v.latest.fuelLevelPct < 20);
      if (lowFuelVehicles.length === 0) return "All vehicles have sufficient fuel.";
      return `Vehicles with low fuel (<20%): ${formatVehicles(lowFuelVehicles)}.`;
    }
    case "overheat": {
      const hotVehicles = vehicles.filter(v => v.latest?.engineTempC !== undefined && v.latest.engineTempC > 90);
      if (hotVehicles.length === 0) return "No vehicles are currently overheating.";
      return `Overheating vehicles (engineTemp > 90°C): ${formatVehicles(hotVehicles)}.`;
    }
    case "serious_alerts": {
      const severityOrder = { CRITICAL: 3, WARNING: 2, INFO: 1 } as const;
      const sorted = [...alerts].sort((a, b) => (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0));
      const top = sorted.slice(0, 3);
      if (top.length === 0) return "There are no active alerts.";
      return `Most serious active alerts: ${top.map(a => `${a.severity} – ${a.type} on vehicle ${a.vehiclePlate}`).join(", ")}.`;
    }
    case "alerts": {
      if (alerts.length === 0) return "There are no active alerts.";
      return `Current alerts (${alerts.length}): ${alerts.map(a => `${a.severity} – ${a.type} on ${a.vehiclePlate}`).join(", ")}.`;
    }
    case "summary_health": {
      const avg = analytics?.avgHealthScore ?? null;
      if (avg === null) return "Health data is unavailable.";
      return `Average fleet health score is ${avg.toFixed(1)}/100.`;
    }
    case "prioritize": {
      const priority = vehicles.filter(v => {
        const lowFuel = v.latest?.fuelLevelPct !== undefined && v.latest.fuelLevelPct < 20;
        const highTemp = v.latest?.engineTempC !== undefined && v.latest.engineTempC > 90;
        const critical = alerts.some(a => a.vehicleId === v.id && a.severity === "CRITICAL");
        return lowFuel || highTemp || critical;
      });
      if (priority.length === 0) return "No urgent priorities detected at this time.";
      return `Prioritize these vehicles: ${formatVehicles(priority)}.`;
    }
    case "risk": {
      const scored = vehicles.map(v => {
        let score = 0;
        if (v.healthScore !== undefined) score += (100 - v.healthScore);
        if (v.latest?.fuelLevelPct !== undefined && v.latest.fuelLevelPct < 20) score += 20;
        if (v.latest?.engineTempC !== undefined && v.latest.engineTempC > 90) score += 20;
        if (alerts.some(a => a.vehicleId === v.id && a.severity === "CRITICAL")) score += 30;
        return { v, score };
      });
      const sorted = scored.sort((a, b) => b.score - a.score).slice(0, 5);
      if (sorted.length === 0) return "No vehicles at high operational risk.";
      return `Highest risk vehicles: ${formatVehicles(sorted.map(s => s.v))}.`;
    }
    case "abnormal_telemetry": {
      // Detect vehicles with readings outside normal ranges
      const abnormalVehicles = vehicles.filter(v => {
        const t = v.latest;
        if (!t) return false;
        const lowFuel = t.fuelLevelPct !== undefined && t.fuelLevelPct < 10;
        const highTemp = t.engineTempC !== undefined && t.engineTempC > 100;
        const lowBattery = t.batteryVoltage !== undefined && t.batteryVoltage < 11.5;
        const highRpm = t.rpm !== undefined && t.rpm > 3000;
        const lowPressure = t.tirePressurePsi !== undefined && t.tirePressurePsi < 30;
        const highPressure = t.tirePressurePsi !== undefined && t.tirePressurePsi > 40;
        return lowFuel || highTemp || lowBattery || highRpm || lowPressure || highPressure;
      });
      if (abnormalVehicles.length === 0) return "No vehicles with abnormal telemetry detected.";
      return `Vehicles with abnormal telemetry: ${formatVehicles(abnormalVehicles)}.`;
    }
    // stray brace removed
    default:
      return "I can help with questions about vehicles needing attention, low fuel, overheating, active alerts, fleet health summary, prioritization, and risk ranking.";
  }
}

export const Route = createFileRoute("/api/public/copilot")({
  component: CopilotRoute,
});

function CopilotRoute() {
  // Not rendered client‑side; loader provides the response.
  return null;
}

export const loader = (async ({ request }) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  try {
    const { question } = await request.json();
    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'question' in request body" }), { status: 400 });
    }
    const data = await get<DashboardPayload>("/dashboard");
    const intent = detectIntent(question);
    const answer = handleIntent(intent, data);
    return new Response(JSON.stringify({ answer }));
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}) satisfies RequestHandler;
