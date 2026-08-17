import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { CountUp, DeltaBadge, Dot } from "@/components/pulse/primitives";
import { useCardRange, type CardPreset } from "@/components/pulse/card-range";
import {
  channelAccent,
  delta,
  getChannelPerformance,
  getFunnel,
  getInsights,
  getReplyRate,
  getSeries,
  getTotalOutreach,
  money,
  number as fmtNumber,
  pct,
} from "@/lib/pulse/analytics";
import { useFilters } from "@/lib/pulse/filters";
import type { Channel } from "@/lib/pulse/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ shell */

export function OverviewCard({
  title,
  action,
  children,
  footer,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel flex flex-col", className)}>
      <header className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
        <h2 className="text-[12px] font-semibold tracking-[0.08em] text-foreground uppercase">{title}</h2>
        {action}
      </header>
      <div className="flex-1 px-4 pb-3">{children}</div>
      {footer ? <div className="border-t border-border px-4 py-2.5 text-xs">{footer}</div> : null}
    </section>
  );
}

function CardLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
      {children}
      <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  );
}

function granularityFor(preset: CardPreset) {
  return preset === "ytd" ? "month" : preset === "90d" ? "week" : "day";
}

/* --------------------------------------------------------- outreach volume */

export function OutreachVolumeCard() {
  const { totals, previousTotals, control, label } = useCardRange("30d");
  const sent = getTotalOutreach(totals);
  const prev = getTotalOutreach(previousTotals);
  const max = Math.max(totals.dms, totals.emails, 1);

  return (
    <OverviewCard title="Outreach volume" action={control} footer={<CardLink to="/analytics/outreach">See outreach report</CardLink>}>
      <p className="stat text-[1.75rem]">
        <CountUp value={sent} />
      </p>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <DeltaBadge value={delta(sent, prev)} />
        <span>messages sent · {label.toLowerCase()}</span>
      </div>

      <div className="mt-4 space-y-3">
        {[
          { key: "DMs", value: totals.dms, color: "var(--chart-1)" },
          { key: "Emails", value: totals.emails, color: "var(--chart-2)" },
        ].map((row) => (
          <div key={row.key} className="grid grid-cols-[64px_1fr_auto] items-center gap-3">
            <span className="text-xs text-muted-foreground">{row.key}</span>
            <span className="h-2.5 overflow-hidden rounded-sm bg-muted">
              <span
                className="block h-full rounded-sm transition-[width] duration-500"
                style={{ width: `${(row.value / max) * 100}%`, background: row.color }}
              />
            </span>
            <span className="num text-xs font-medium">{fmtNumber(row.value)}</span>
          </div>
        ))}
      </div>
    </OverviewCard>
  );
}

/* ------------------------------------------------------------ channel mix */

export function ChannelMixCard() {
  const { facts, control } = useCardRange("30d");
  const { toggle, filters } = useFilters();
  const rows = getChannelPerformance(facts);
  const total = rows.reduce((s, r) => s + r.sent, 0);

  return (
    <OverviewCard title="Channel mix" action={control} footer={<CardLink to="/analytics/outreach">Compare channels</CardLink>}>
      <div className="flex items-center gap-4">
        <div className="h-[132px] w-[132px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rows}
                dataKey="sent"
                nameKey="label"
                innerRadius={38}
                outerRadius={62}
                paddingAngle={2}
                stroke="none"
                isAnimationActive
              >
                {rows.map((r) => (
                  <Cell key={r.id} fill={channelAccent(r.label as Channel)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--popover-foreground)",
                }}
                formatter={(v: number, n) => [fmtNumber(v), n as string]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="min-w-0 flex-1 space-y-1.5">
          {rows.map((r) => {
            const active = filters.channels.includes(r.label as Channel);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => toggle("channels", r.label as Channel)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs transition-colors hover:bg-accent",
                    active && "bg-primary-soft",
                  )}
                  title="Filter the whole workspace by this channel"
                >
                  <span className="size-2 shrink-0 rounded-full" style={{ background: channelAccent(r.label as Channel) }} />
                  <span className="min-w-0 flex-1 truncate">{r.label}</span>
                  <span className="num text-muted-foreground">{total ? pct(r.sent / total, 0) : "0%"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </OverviewCard>
  );
}

/* --------------------------------------------------------------- pipeline */

export function PipelineCard() {
  const { totals, previousTotals, control } = useCardRange("30d");
  const rows = [
    { label: "Replies", value: totals.replies, prev: previousTotals.replies },
    { label: "Positive replies", value: totals.positive, prev: previousTotals.positive },
    { label: "Interested", value: totals.interested, prev: previousTotals.interested },
    { label: "Calls booked", value: totals.calls, prev: previousTotals.calls },
    { label: "Deals closed", value: totals.deals, prev: previousTotals.deals },
  ];

  return (
    <OverviewCard title="Pipeline" action={control} footer={<CardLink to="/leads">Go to leads</CardLink>}>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
            <span className="text-sm">{row.label}</span>
            <span className="flex items-center gap-3">
              <DeltaBadge value={delta(row.value, row.prev)} />
              <span className="num text-sm font-semibold">{fmtNumber(row.value)}</span>
            </span>
          </li>
        ))}
      </ul>
    </OverviewCard>
  );
}

/* ------------------------------------------------------------- conversion */

export function ConversionCard() {
  const { totals, previousTotals, control } = useCardRange("30d");
  const stages = getFunnel(totals, previousTotals);

  return (
    <OverviewCard title="Conversion" action={control} footer={<CardLink to="/analytics/conversion">Open funnel</CardLink>}>
      <p className="stat text-[1.75rem]">
        <CountUp value={getReplyRate(totals) * 100} format={(v) => `${v.toFixed(1)}%`} />
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Reply rate across every channel</p>
      <ul className="mt-4 space-y-2.5">
        {stages.slice(1).map((stage) => (
          <li key={stage.id} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{stage.label}</span>
              <span className="num font-medium">{fmtNumber(stage.count)}</span>
            </div>
            <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${Math.max(2, stage.share * 100)}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </OverviewCard>
  );
}

/* ---------------------------------------------------------------- revenue */

export function RevenueCard() {
  const { facts, totals, previousTotals, control, preset } = useCardRange("30d");
  const series = getSeries(facts, granularityFor(preset));

  return (
    <OverviewCard title="Revenue" action={control} footer={<CardLink to="/analytics/revenue">See revenue report</CardLink>}>
      <p className="stat text-[1.75rem]">
        <CountUp value={totals.revenue} format={(v) => money(v, { compact: true })} />
      </p>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <DeltaBadge value={delta(totals.revenue, previousTotals.revenue)} />
        <span>closed-won value</span>
      </div>
      <div className="mt-3 h-[112px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--popover-foreground)",
              }}
              labelFormatter={(l) => String(l)}
              formatter={(v: number) => [money(v), "Revenue"]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#revFill)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </OverviewCard>
  );
}

/* --------------------------------------------------------------- insights */

export function InsightsCard() {
  const { filters } = useFilters();
  const [hidden, setHidden] = useState<string[]>([]);
  const insights = getInsights(filters).filter((i) => !hidden.includes(i.id));

  return (
    <OverviewCard
      title="AI insights"
      action={
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" aria-hidden />
          Live
        </span>
      }
      footer={
        hidden.length > 0 ? (
          <button type="button" onClick={() => setHidden([])} className="font-medium text-primary hover:underline">
            Restore {hidden.length} dismissed insight{hidden.length > 1 ? "s" : ""}
          </button>
        ) : (
          <CardLink to="/reports">Build a report</CardLink>
        )
      }
    >
      {insights.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">All insights reviewed.</p>
      ) : (
        <ul className="space-y-2.5">
          {insights.slice(0, 3).map((insight) => (
            <li key={insight.id} className="rounded-md border border-border bg-surface p-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="flex items-start gap-2 text-xs font-medium">
                  <span className="mt-1.5">
                    <Dot tone={insight.tone} />
                  </span>
                  {insight.title}
                </p>
                <button
                  type="button"
                  onClick={() => setHidden((h) => [...h, insight.id])}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Hide
                </button>
              </div>
              <p className="mt-1 pl-4 text-[11px] leading-relaxed text-muted-foreground">{insight.body}</p>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  );
}
