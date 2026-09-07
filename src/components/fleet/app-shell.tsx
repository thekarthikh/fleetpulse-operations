import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Braces,
  Gauge,
  LayoutDashboard,
  Network,
  Radio,
  Truck,
  Wrench,
  Bot,
} from "lucide-react";
import type { ReactNode } from "react";
import { useHealth, useSimulateTick } from "@/lib/fleet/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/vehicles", label: "Vehicles", icon: Truck },
  { to: "/telemetry", label: "Telemetry", icon: Radio },
  { to: "/alerts", label: "Alerts", icon: AlertTriangle },
  { to: "/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/architecture", label: "Architecture", icon: Network },
  { to: "/openapi", label: "OpenAPI", icon: Braces },
  { to: "/copilot", label: "Fleet Copilot", icon: Bot },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data: health } = useHealth();
  const tick = useSimulateTick();

  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
            <Gauge className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold tracking-tight">FleetPulse</div>
            <div className="num text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              telemetry ops
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item ? item.exact : false }}
              className="group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-primary"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="m-3 rounded-md border border-sidebar-border bg-surface-2/60 p-3">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>Pipeline</span>
            <span className={cn("num", health?.status === "UP" ? "text-success" : "text-critical")}>
              {health?.status ?? "…"}
            </span>
          </div>
          <dl className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            <Row label="ingested" value={num(health?.components?.ingestion?.ingested)} />
            <Row label="rejected" value={num(health?.components?.ingestion?.rejected)} />
            <Row label="ticks" value={num(health?.components?.simulator?.ticks)} />
            <Row label="uptime" value={`${health?.uptimeSeconds ?? 0}s`} />
          </dl>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Gauge className="size-5 text-primary" />
            <span className="font-display text-sm font-semibold">FleetPulse</span>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
            <span className="live-dot" />
            <span className="num uppercase tracking-[0.16em]">live · 25 vehicles · 2s cadence</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={tick.isPending}
              onClick={() =>
                tick.mutate(3, {
                  onSuccess: (r) =>
                    toast.success("Simulator tick processed", {
                      description: `${r.accepted} accepted · ${r.rejected} rejected · ${r.alerts} alerts · ${r.durationMs}ms`,
                    }),
                  onError: () => toast.error("Simulation tick failed"),
                })
              }
            >
              <Activity className="size-3.5" />
              Force tick
            </Button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item ? item.exact : false }}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-muted-foreground data-[status=active]:bg-accent data-[status=active]:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function num(v: unknown) {
  return typeof v === "number" ? v.toLocaleString() : "—";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt>{label}</dt>
      <dd className="num text-foreground/80">{value}</dd>
    </div>
  );
}
