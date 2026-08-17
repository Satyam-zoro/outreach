import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LineChart, RotateCcw } from "lucide-react";

import { ActivityChart, ChartLegend } from "@/components/pulse/activity-chart";
import { BreakdownTable } from "@/components/pulse/breakdown-table";
import { EmptyState } from "@/components/pulse/empty-state";
import { ConversionFunnel } from "@/components/pulse/funnel";
import { GranularityToggle } from "@/components/pulse/global-filters";
import { ActivityHeatmap } from "@/components/pulse/heatmap";
import { BestTimeCard, InsightPanel, LiveActivityFeed } from "@/components/pulse/insights";
import { KpiCard } from "@/components/pulse/kpi-card";
import {
  ChannelMixCard,
  ConversionCard,
  InsightsCard,
  OutreachVolumeCard,
  PipelineCard,
  RevenueCard,
} from "@/components/pulse/overview-cards";
import { Chip, Panel, Reveal } from "@/components/pulse/primitives";
import { DashboardSkeleton } from "@/components/pulse/pulse-skeleton";
import { Button } from "@/components/ui/button";
import { WorkspaceLogo } from "@/components/pulse/workspace-logo";
import { currentUser, workspaces } from "@/lib/pulse/data";
import { cn } from "@/lib/utils";
import {
  delta,
  formatRange,
  getChannelPerformance,
  getReplyRate,
  getSeries,
  getStageConversions,
  getTotalOutreach,
  getWeakestStage,
  money,
  pct,
  type SeriesPoint,
} from "@/lib/pulse/analytics";
import { useAnalytics } from "@/lib/pulse/filters";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — PULSE Outreach Intelligence" },
      {
        name: "description",
        content:
          "Executive overview of outreach volume, replies, conversion rates and revenue across every channel, campaign and team member.",
      },
      { property: "og:title", content: "Overview — PULSE Outreach Intelligence" },
      { property: "og:description", content: "Track outreach volume, reply quality, conversion and revenue in one view." },
    ],
  }),
  component: OverviewPage,
  pendingComponent: DashboardSkeleton,
});

/** Resolved after mount so SSR and client markup always agree. */
function useGreeting() {
  const [greeting, setGreeting] = useState("Good morning");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);
  return greeting;
}

function OverviewPage() {
  const {
    totals,
    previousTotals,
    facts,
    prevFacts,
    funnel,
    insights,
    hasData,
    filters,
    granularity,
    isLoading,
    isError,
    isEmpty,
    retry,
  } = useAnalytics();
  const [hover, setHover] = useState<SeriesPoint | null>(null);
  const [tab, setTab] = useState<"overview" | "deep">("overview");
  const greeting = useGreeting();
  const series = getSeries(facts, granularity);
  const stages = getStageConversions(totals, previousTotals);
  const weakest = getWeakestStage(stages);
  const channels = getChannelPerformance(facts);

  const sent = getTotalOutreach(totals);
  const prevSent = getTotalOutreach(previousTotals);

  // 1. Loading state (Matches exact layout geometry, 0 CLS, subtle 1.2s shimmer)
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // 2. Error state (Safe, polished error card with retry button, no raw secrets)
  if (isError) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <Panel className="p-8 text-center space-y-4">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/15 text-destructive">
            <LineChart className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold tracking-tight">Unable to load your outreach data</h3>
            <p className="text-sm text-muted-foreground">
              Something went wrong while loading the dashboard. Please check your connection and try again.
            </p>
          </div>
          <Button onClick={retry} variant="outline" className="mt-2 gap-2">
            <RotateCcw className="size-3.5" />
            Try Again
          </Button>
        </Panel>
      </div>
    );
  }

  // 3. Genuine empty state (When data loaded successfully but has 0 outreach rows)
  if (isEmpty) {
    return (
      <Panel className="mt-6">
        <EmptyState
          icon={LineChart}
          title="Your dashboard is waiting for data."
          body="Import your outreach history or connect Notion to unlock conversion analytics, channel comparisons and revenue attribution."
        />
      </Panel>
    );
  }

  const kpis = [
    {
      label: hover ? "Sent (hovered)" : "DMs & emails sent",
      value: hover ? hover.sent : sent,
      delta: delta(sent, prevSent),
      emphasis: "primary" as const,
      hint: hover ? "Following the chart cursor" : `${formatRange(filters.range)} · vs previous period`,
    },
    {
      label: "Replies",
      value: hover ? hover.replies : totals.replies,
      delta: delta(totals.replies, previousTotals.replies),
      emphasis: "primary" as const,
      hint: "Inbound responses across all channels",
    },
    {
      label: "Reply rate",
      value: hover ? hover.replyRate * 100 : getReplyRate(totals) * 100,
      format: (v: number) => `${v.toFixed(1)}%`,
      delta: delta(getReplyRate(totals), getReplyRate(previousTotals)),
      hint: "Replies ÷ messages sent",
    },
    {
      label: "Positive replies",
      value: hover ? hover.positive : totals.positive,
      delta: delta(totals.positive, previousTotals.positive),
      hint: "Interest-signalling responses",
    },
    {
      label: "Calls booked",
      value: hover ? hover.calls : totals.calls,
      delta: delta(totals.calls, previousTotals.calls),
      emphasis: "quiet" as const,
    },
    {
      label: "Deals closed",
      value: hover ? hover.deals : totals.deals,
      delta: delta(totals.deals, previousTotals.deals),
      emphasis: "quiet" as const,
    },
    {
      label: "Revenue",
      value: hover ? hover.revenue : totals.revenue,
      format: (v: number) => money(v, { compact: true }),
      delta: delta(totals.revenue, previousTotals.revenue),
      emphasis: "primary" as const,
      hint: "Closed-won contract value",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <WorkspaceLogo size="md" />
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{workspaces[0]!.name}</h2>
              <p className="text-sm text-muted-foreground">
                {greeting}, {currentUser.name} — here's how outreach is performing.
              </p>
            </div>
          </div>
          <Chip tone="primary">{formatRange(filters.range)}</Chip>
        </div>

        <div className="flex gap-6 border-b border-border">
          {(
            [
              { id: "overview", label: "Business overview" },
              { id: "deep", label: "Deep analytics" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "-mb-px border-b-2 px-1 pb-2.5 text-sm transition-colors",
                tab === t.id
                  ? "border-primary font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {tab === "overview" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <OutreachVolumeCard />
          <ChannelMixCard />
          <PipelineCard />
          <ConversionCard />
          <RevenueCard />
          <InsightsCard />
        </div>
      ) : (
        <div className="space-y-6">


          {/* KPI row — horizontally scrollable on mobile */}
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
            <div className="grid min-w-[720px] grid-cols-2 gap-3 sm:min-w-0 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
              {kpis.map((kpi) => (
                <KpiCard key={kpi.label} {...kpi} />
              ))}
            </div>
          </div>

          <Reveal>
            <Panel
              title="Outreach Activity"
              description="Messages sent and responses received over time."
              actions={<GranularityToggle />}
              bodyClassName="space-y-4"
            >
              <ChartLegend />
              <ActivityChart data={series} onHoverPoint={setHover} height={320} />
            </Panel>
          </Reveal>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <Reveal>
              <Panel title="Outreach Funnel" description="Every stage, with conversion and drop-off against the previous period.">
                <ConversionFunnel stages={funnel} />
              </Panel>
            </Reveal>

            <div className="space-y-4">
              <Reveal delay={60}>
                <Panel title="Where does outreach break down?" description="Stage-by-stage conversion versus the previous period.">
                  <ul className="space-y-3">
                    {stages.map((stage) => {
                      const change = delta(stage.value, stage.previous);
                      const isWeak = stage.id === weakest.id;
                      return (
                        <li key={stage.id} className="space-y-1.5">
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className={isWeak ? "font-medium text-warning" : "text-muted-foreground"}>{stage.label}</span>
                            <span className="num font-medium">{pct(stage.value)}</span>
                          </div>
                          <div className="h-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full transition-[width] duration-500"
                              style={{
                                width: `${Math.min(100, stage.value * 180)}%`,
                                background: isWeak ? "var(--warning)" : "var(--primary)",
                              }}
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {change >= 0 ? "Up" : "Down"} {pct(Math.abs(change))} vs previous period
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-5 rounded-lg border border-warning/25 bg-warning/8 p-4">
                    <p className="text-[11px] font-medium tracking-[0.12em] text-warning uppercase">Biggest opportunity</p>
                    <p className="mt-1.5 text-sm font-medium">{weakest.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Conversion is {pct(weakest.value)}, {weakest.change < 0 ? "down" : "up"} {pct(Math.abs(weakest.change))} versus
                      the previous period. Fixing this stage compounds through every downstream metric.
                    </p>
                  </div>
                </Panel>
              </Reveal>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Reveal>
              <Panel title="Channel performance" description="Sortable comparison across every outreach surface.">
                <BreakdownTable rows={channels} labelHeader="Channel" />
              </Panel>
            </Reveal>
            <div className="space-y-4">
              <Reveal delay={60}>
                <BestTimeCard />
              </Reveal>
              <Reveal delay={120}>
                <LiveActivityFeed />
              </Reveal>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Reveal>
              <InsightPanel insights={insights} />
            </Reveal>
            <Reveal delay={60}>
              <Panel title="Outreach heatmap" description="Volume and response quality by weekday and hour.">
                <ActivityHeatmap />
              </Panel>
            </Reveal>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Comparison baseline: {prevFacts.length > 0 ? formatRange({ from: filters.range.from, to: filters.range.to }) : "no prior data"} ·
            {" "}All metrics derive from the shared analytics engine.
          </p>
        </div>
      )}
    </div>
  );
}
