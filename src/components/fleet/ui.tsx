import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { AlertSeverity, VehicleStatus } from "@/lib/fleet/types";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {actions}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("panel rise flex flex-col overflow-hidden", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="truncate text-sm font-semibold">{title}</h2>}
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={cn("min-w-0 flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "critical" | "primary";
  icon?: ReactNode;
}) {
  const toneClass = {
    default: "text-foreground",
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    critical: "text-critical",
  }[tone];

  return (
    <div className="panel rise group relative overflow-hidden p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--glow-primary)]">
      <div className="flex items-start justify-between">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        <span className="text-muted-foreground/70 transition-colors group-hover:text-primary">{icon}</span>
      </div>
      <div className={cn("num mt-2 flex items-baseline gap-1 text-2xl font-semibold", toneClass)}>
        {value}
        {unit && <span className="text-sm font-normal text-muted-foreground">{unit}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const STATUS_STYLES: Record<VehicleStatus, string> = {
  MOVING: "bg-success/12 text-success ring-success/30",
  IDLE: "bg-warning/12 text-warning ring-warning/30",
  PARKED: "bg-muted text-muted-foreground ring-border",
  MAINTENANCE: "bg-info/12 text-info ring-info/30",
  OFFLINE: "bg-muted text-muted-foreground ring-border",
};

export function StatusBadge({ status }: { status: VehicleStatus }) {
  return (
    <span
      className={cn(
        "num inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1",
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  CRITICAL: "bg-critical/12 text-critical ring-critical/30",
  WARNING: "bg-warning/12 text-warning ring-warning/30",
  INFO: "bg-info/12 text-info ring-info/30",
};

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span
      className={cn(
        "num inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1",
        SEVERITY_STYLES[severity],
      )}
    >
      {severity}
    </span>
  );
}

export function Meter({
  value,
  max = 100,
  tone = "primary",
  label,
  suffix,
}: {
  value: number;
  max?: number;
  tone?: "primary" | "success" | "warning" | "critical";
  label?: string;
  suffix?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bar = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    critical: "bg-critical",
  }[tone];
  return (
    <div>
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span className="num text-foreground/85">
            {value.toFixed(1)}
            {suffix}
          </span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border/80 px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function SkeletonGrid({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full bg-muted/60" />
      ))}
    </div>
  );
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.max(0, Math.round(diff))}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

export const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 11,
  color: "var(--popover-foreground)",
} as const;
