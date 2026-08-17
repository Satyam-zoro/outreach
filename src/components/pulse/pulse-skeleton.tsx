import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Full-screen branded PULSE Loading Screen across the entire window
 */
export function FullScreenPulseLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-center select-none animate-fade-in">
      {/* Glowing pulsing logo mark */}
      <div className="relative mb-6">
        <div className="absolute -inset-3 rounded-3xl bg-primary/25 blur-2xl animate-pulse" />
        <div className="relative size-18 rounded-2xl border border-border bg-card/90 shadow-2xl backdrop-blur grid place-items-center">
          <Activity className="size-9 text-primary animate-pulse" />
        </div>
      </div>

      {/* Title & subtitle */}
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        Loading workspace data...
      </h2>
      <p className="mt-1.5 text-xs text-muted-foreground max-w-sm leading-relaxed">
        Synchronizing channels, conversion funnels and outreach analytics
      </p>

      {/* Sleek animated progress line */}
      <div className="mt-6 w-52 h-1 rounded-full bg-muted/40 overflow-hidden relative">
        <div className="absolute inset-y-0 bg-primary rounded-full animate-indeterminate" />
      </div>
    </div>
  );
}

export function PulseLoadingDataScreen() {
  return <FullScreenPulseLoader />;
}

/**
 * Reusable, pixel-perfect pulse skeleton placeholders matching the exact
 * dimensions and layout of the PULSE dashboard to ensure 0 layout shift.
 */

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted/40 animate-pulse transition-colors duration-150",
        className
      )}
      {...props}
    />
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-3.5 shadow-sm min-h-[112px]">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3.5 w-20 bg-muted/50" />
        <Skeleton className="size-4 rounded-full bg-muted/30" />
      </div>
      <div className="my-1.5">
        <Skeleton className="h-7 w-24 bg-muted/60" />
      </div>
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-3.5 w-12 rounded bg-muted/35" />
        <Skeleton className="h-3 w-16 bg-muted/25" />
      </div>
    </div>
  );
}

export function ActivityChartSkeleton() {
  // Preset rhythmic bar heights to mimic real outreach time-series data
  const heights = [35, 60, 45, 80, 55, 90, 70, 40, 85, 65, 95, 75, 50, 80];

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-36 bg-muted/50" />
          <Skeleton className="h-3 w-56 bg-muted/30" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-20 rounded-md bg-muted/30" />
          <Skeleton className="h-7 w-24 rounded-md bg-muted/30" />
        </div>
      </div>

      {/* Metric summary chips */}
      <div className="flex flex-wrap gap-4 py-1">
        <Skeleton className="h-4 w-28 bg-muted/30" />
        <Skeleton className="h-4 w-24 bg-muted/30" />
        <Skeleton className="h-4 w-28 bg-muted/30" />
      </div>

      {/* Chart canvas simulation */}
      <div className="h-64 rounded-lg bg-elevated/40 p-4 flex items-end justify-between gap-2 sm:gap-3">
        {heights.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <div
              className="w-full max-w-[28px] rounded-t-sm bg-primary/25 transition-all duration-300"
              style={{ height: `${h}%` }}
            />
            <Skeleton className="h-2.5 w-6 bg-muted/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PipelineCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 min-h-[280px] flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <Skeleton className="h-4 w-24 bg-muted/50" />
        <Skeleton className="h-3 w-16 bg-muted/30" />
      </div>
      <div className="space-y-3.5 flex-1 justify-center flex flex-col">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-2 rounded-full bg-muted/40" />
              <Skeleton className="h-3.5 w-24 bg-muted/40" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12 rounded bg-muted/30" />
              <Skeleton className="h-4 w-8 bg-muted/50 font-semibold" />
            </div>
          </div>
        ))}
      </div>
      <div className="pt-2 border-t border-border/40">
        <Skeleton className="h-3 w-28 bg-muted/30" />
      </div>
    </div>
  );
}

export function ChannelMixCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 min-h-[280px] flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <Skeleton className="h-4 w-28 bg-muted/50" />
        <Skeleton className="h-3 w-16 bg-muted/30" />
      </div>
      <div className="flex items-center gap-4 py-2">
        {/* Donut ring placeholder */}
        <div className="size-28 shrink-0 rounded-full border-8 border-muted/30 border-t-primary/40 border-r-chart-2/40 animate-spin" style={{ animationDuration: "3s" }} />
        {/* Legend */}
        <div className="flex-1 space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Skeleton className="size-2 rounded-full bg-muted/40" />
                <Skeleton className="h-3 w-18 bg-muted/40" />
              </div>
              <Skeleton className="h-3 w-8 bg-muted/30" />
            </div>
          ))}
        </div>
      </div>
      <div className="pt-2 border-t border-border/40">
        <Skeleton className="h-3 w-28 bg-muted/30" />
      </div>
    </div>
  );
}

export function SecondarySectionSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <PipelineCardSkeleton />
      <ChannelMixCardSkeleton />
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 min-h-[280px] flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <Skeleton className="h-4 w-32 bg-muted/50" />
          <Skeleton className="h-3 w-16 bg-muted/30" />
        </div>
        <div className="space-y-3 py-1 flex-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border/60 bg-elevated/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24 bg-muted/50" />
                <Skeleton className="h-3 w-12 bg-muted/30" />
              </div>
              <Skeleton className="h-3 w-48 bg-muted/35" />
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-border/40">
          <Skeleton className="h-3 w-28 bg-muted/30" />
        </div>
      </div>
    </div>
  );
}

/** Complete full-dashboard skeleton layout matching exact geometry */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse transition-opacity duration-200">
      {/* Header Banner Skeleton */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Skeleton className="size-12 rounded-lg bg-card border border-border shadow-sm" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40 bg-muted/60" />
              <Skeleton className="h-3.5 w-64 bg-muted/40" />
            </div>
          </div>
          <Skeleton className="h-7 w-36 rounded-md bg-card border border-border shadow-sm" />
        </div>

        <div className="flex gap-6 border-b border-border pb-3">
          <Skeleton className="h-4 w-20 bg-primary/40 rounded" />
          <Skeleton className="h-4 w-28 bg-muted/30 rounded" />
        </div>
      </header>

      {/* 6 KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>

      {/* Main Activity Chart Section */}
      <ActivityChartSkeleton />

      {/* Secondary Analytics (Pipeline, Channels, Activity) */}
      <SecondarySectionSkeleton />
    </div>
  );
}
