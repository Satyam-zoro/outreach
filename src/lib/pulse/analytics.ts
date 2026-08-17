/**
 * Analytics engine. All statistics in the UI come from these functions —
 * components never compute metrics inline.
 */
import { campaigns, getFacts, getFollowUpFacts, getTimeSlotFacts, team } from "./data";
import type {
  Channel,
  DateRange,
  Filters,
  Granularity,
  OutreachFact,
  Totals,
} from "./types";
import { CHANNELS } from "./types";

const EMPTY: Totals = {
  contacted: 0,
  dms: 0,
  emails: 0,
  followUps: 0,
  replies: 0,
  positive: 0,
  negative: 0,
  interested: 0,
  calls: 0,
  deals: 0,
  revenue: 0,
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function rangeDays(range: DateRange): number {
  return Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / 86400000) + 1);
}

export function previousRange(range: DateRange): DateRange {
  const days = rangeDays(range);
  const to = new Date(range.from);
  to.setUTCDate(to.getUTCDate() - 1);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return { from, to };
}

export function selectFacts(filters: Filters, range?: DateRange): OutreachFact[] {
  const r = range ?? filters.range;
  const from = iso(r.from);
  const to = iso(r.to);
  return getFacts().filter(
    (f) =>
      f.date >= from &&
      f.date <= to &&
      (filters.channels.length === 0 || filters.channels.includes(f.channel)) &&
      (filters.campaignIds.length === 0 || filters.campaignIds.includes(f.campaignId)) &&
      (filters.memberIds.length === 0 || filters.memberIds.includes(f.memberId)) &&
      (filters.sources.length === 0 || filters.sources.includes(f.source)),
  );
}

export function sum(facts: OutreachFact[]): Totals {
  return facts.reduce<Totals>(
    (acc, f) => ({
      contacted: acc.contacted + f.contacted,
      dms: acc.dms + f.dms,
      emails: acc.emails + f.emails,
      followUps: acc.followUps + f.followUps,
      replies: acc.replies + f.replies,
      positive: acc.positive + f.positive,
      negative: acc.negative + f.negative,
      interested: acc.interested + f.interested,
      calls: acc.calls + f.calls,
      deals: acc.deals + f.deals,
      revenue: acc.revenue + f.revenue,
    }),
    { ...EMPTY },
  );
}

const rate = (num: number, den: number) => (den > 0 ? num / den : 0);

/* ------------------------------------------------------------ core metrics */

export const getTotalOutreach = (t: Totals) => t.dms + t.emails;
export const getReplyRate = (t: Totals) => rate(t.replies, getTotalOutreach(t));
export const getPositiveReplyRate = (t: Totals) => rate(t.positive, t.replies);
export const getInterestRate = (t: Totals) => rate(t.interested, t.positive);
export const getCallConversion = (t: Totals) => rate(t.calls, t.interested);
export const getCloseRate = (t: Totals) => rate(t.deals, t.calls);
export const getRevenue = (t: Totals) => t.revenue;
export const getRevenuePerMessage = (t: Totals) => rate(t.revenue, getTotalOutreach(t));
export const getAverageDealSize = (t: Totals) => rate(t.revenue, t.deals);

export function getFollowUpConversion(): number {
  const facts = getFollowUpFacts().filter((f) => f.step > 0);
  const sent = facts.reduce((a, f) => a + f.sent, 0);
  const replies = facts.reduce((a, f) => a + f.replies, 0);
  return rate(replies, sent);
}

export function getROI(revenue: number, cost: number): number {
  return cost > 0 ? (revenue - cost) / cost : 0;
}

export function delta(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 1;
  return (current - previous) / previous;
}

/* ------------------------------------------------------------ time series */

export interface SeriesPoint {
  key: string;
  label: string;
  date: string;
  sent: number;
  replies: number;
  positive: number;
  calls: number;
  deals: number;
  revenue: number;
  replyRate: number;
}

function bucketKey(date: string, granularity: Granularity): string {
  if (granularity === "day") return date;
  const d = new Date(`${date}T00:00:00Z`);
  if (granularity === "month") return date.slice(0, 7);
  const weekday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - weekday);
  return iso(d);
}

export function getSeries(facts: OutreachFact[], granularity: Granularity): SeriesPoint[] {
  const map = new Map<string, SeriesPoint>();
  for (const f of facts) {
    const key = bucketKey(f.date, granularity);
    const point =
      map.get(key) ??
      { key, label: formatBucket(key, granularity), date: key, sent: 0, replies: 0, positive: 0, calls: 0, deals: 0, revenue: 0, replyRate: 0 };
    point.sent += f.dms + f.emails;
    point.replies += f.replies;
    point.positive += f.positive;
    point.calls += f.calls;
    point.deals += f.deals;
    point.revenue += f.revenue;
    map.set(key, point);
  }
  return [...map.values()]
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .map((p) => ({ ...p, replyRate: rate(p.replies, p.sent) }));
}

function formatBucket(key: string, granularity: Granularity): string {
  if (granularity === "month") {
    const d = new Date(`${key}-01T00:00:00Z`);
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
  }
  const d = new Date(`${key}T00:00:00Z`);
  const base = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return granularity === "week" ? `Wk ${base}` : base;
}

/* ---------------------------------------------------------------- funnel */

export interface FunnelStage {
  id: string;
  label: string;
  count: number;
  /** conversion from previous stage */
  conversion: number;
  /** share of the top stage */
  share: number;
  dropOff: number;
  previousConversion: number;
}

export function getFunnel(current: Totals, previous: Totals): FunnelStage[] {
  const defs: { id: string; label: string; value: (t: Totals) => number }[] = [
    { id: "contacted", label: "Contacted", value: (t) => getTotalOutreach(t) },
    { id: "replied", label: "Replied", value: (t) => t.replies },
    { id: "positive", label: "Positive", value: (t) => t.positive },
    { id: "interested", label: "Interested", value: (t) => t.interested },
    { id: "call", label: "Call Booked", value: (t) => t.calls },
    { id: "closed", label: "Closed", value: (t) => t.deals },
  ];
  const top = defs[0]!.value(current);
  return defs.map((d, i) => {
    const count = d.value(current);
    const prevStage = i === 0 ? count : defs[i - 1]!.value(current);
    const conversion = i === 0 ? 1 : rate(count, prevStage);
    const prevPeriodCount = d.value(previous);
    const prevPeriodStage = i === 0 ? prevPeriodCount : defs[i - 1]!.value(previous);
    return {
      id: d.id,
      label: d.label,
      count,
      conversion,
      share: rate(count, top),
      dropOff: i === 0 ? 0 : prevStage - count,
      previousConversion: i === 0 ? 1 : rate(prevPeriodCount, prevPeriodStage),
    };
  });
}

export interface StageConversion {
  id: string;
  label: string;
  value: number;
  previous: number;
}

export function getStageConversions(current: Totals, previous: Totals): StageConversion[] {
  return [
    { id: "dm-reply", label: "DM → Reply", value: getReplyRate(current), previous: getReplyRate(previous) },
    { id: "reply-positive", label: "Reply → Positive", value: getPositiveReplyRate(current), previous: getPositiveReplyRate(previous) },
    { id: "positive-interested", label: "Positive → Interested", value: getInterestRate(current), previous: getInterestRate(previous) },
    { id: "interested-call", label: "Interested → Call", value: getCallConversion(current), previous: getCallConversion(previous) },
    { id: "call-client", label: "Call → Client", value: getCloseRate(current), previous: getCloseRate(previous) },
  ];
}

/** The stage that lost the most ground versus the previous period. */
export function getWeakestStage(stages: StageConversion[]): StageConversion & { change: number } {
  const scored = stages.map((s) => ({ ...s, change: delta(s.value, s.previous) }));
  return scored.reduce((worst, s) => (s.change < worst.change ? s : worst), scored[0]!);
}

/* ------------------------------------------------------- breakdown tables */

export interface BreakdownRow {
  id: string;
  label: string;
  sublabel?: string;
  sent: number;
  replies: number;
  replyRate: number;
  positive: number;
  calls: number;
  clients: number;
  revenue: number;
  cost?: number;
  roi?: number;
}

function rowFrom(id: string, label: string, facts: OutreachFact[], sublabel?: string): BreakdownRow {
  const t = sum(facts);
  return {
    id,
    label,
    ...(sublabel ? { sublabel } : {}),
    sent: getTotalOutreach(t),
    replies: t.replies,
    replyRate: getReplyRate(t),
    positive: t.positive,
    calls: t.calls,
    clients: t.deals,
    revenue: t.revenue,
  };
}

export function getChannelPerformance(facts: OutreachFact[]): BreakdownRow[] {
  return CHANNELS.map((c) => rowFrom(c, c, facts.filter((f) => f.channel === c))).filter((r) => r.sent > 0);
}

export function getCampaignPerformance(facts: OutreachFact[]): BreakdownRow[] {
  return campaigns
    .map((c) => {
      const row = rowFrom(c.id, c.name, facts.filter((f) => f.campaignId === c.id), `${c.channel} · ${c.status}`);
      return { ...row, cost: c.cost, roi: getROI(row.revenue, c.cost) };
    })
    .filter((r) => r.sent > 0);
}

export function getTeamPerformance(facts: OutreachFact[]): BreakdownRow[] {
  return team
    .map((m) => rowFrom(m.id, m.name, facts.filter((f) => f.memberId === m.id), m.role))
    .filter((r) => r.sent > 0);
}

export function getSourcePerformance(facts: OutreachFact[]): BreakdownRow[] {
  const sources = [...new Set(facts.map((f) => f.source))];
  return sources.map((s) => rowFrom(s, s, facts.filter((f) => f.source === s)));
}

/* ------------------------------------------------------- best time / heat */

export type HeatMetric = "sent" | "replies" | "positive";

export interface HeatCell {
  weekday: number;
  hour: number;
  value: number;
  intensity: number;
  replyRate: number;
}

export function getHeatmap(metric: HeatMetric): { cells: HeatCell[]; hours: number[] } {
  const facts = getTimeSlotFacts();
  const max = Math.max(...facts.map((f) => f[metric]));
  return {
    hours: [...new Set(facts.map((f) => f.hour))].sort((a, b) => a - b),
    cells: facts.map((f) => ({
      weekday: f.weekday,
      hour: f.hour,
      value: f[metric],
      intensity: max > 0 ? f[metric] / max : 0,
      replyRate: rate(f.replies, f.sent),
    })),
  };
}

export interface BestWindow {
  weekday: string;
  window: string;
  replyRate: number;
  liftVsAverage: number;
}

export function getBestOutreachTime(): BestWindow {
  const facts = getTimeSlotFacts();
  const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const best = facts.reduce((b, f) => (rate(f.replies, f.sent) > rate(b.replies, b.sent) ? f : b), facts[0]!);
  const avg = rate(
    facts.reduce((a, f) => a + f.replies, 0),
    facts.reduce((a, f) => a + f.sent, 0),
  );
  const bestRate = rate(best.replies, best.sent);
  const fmt = (h: number) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? "AM" : "PM"}`;
  return {
    weekday: names[best.weekday]!,
    window: `${fmt(best.hour)} – ${fmt(best.hour + 2)}`,
    replyRate: bestRate,
    liftVsAverage: delta(bestRate, avg),
  };
}

/* -------------------------------------------------------------- insights */

export interface Insight {
  id: string;
  title: string;
  body: string;
  tone: "positive" | "warning" | "insight" | "neutral";
}

export function getInsights(filters: Filters): Insight[] {
  const facts = selectFacts(filters);
  if (facts.length === 0) return [];
  const prev = selectFacts(filters, previousRange(filters.range));
  const current = sum(facts);
  const previous = sum(prev);
  const insights: Insight[] = [];

  // Channel movement
  const channelRows = getChannelPerformance(facts);
  const prevChannelRows = getChannelPerformance(prev);
  const moved = channelRows
    .map((row) => {
      const before = prevChannelRows.find((r) => r.id === row.id);
      return {
        row,
        positiveChange: delta(row.positive, before?.positive ?? 0),
        volumeChange: delta(row.sent, before?.sent ?? 0),
        comparable: Boolean(before && before.sent > 0),
      };
    })
    .filter((m) => m.comparable)
    .sort((a, b) => b.positiveChange - a.positiveChange)[0];

  if (moved && Math.abs(moved.positiveChange) > 0.05) {
    insights.push({
      id: "channel-move",
      tone: moved.positiveChange > 0 ? "positive" : "warning",
      title: `${moved.row.label} ${moved.positiveChange > 0 ? "outperformed" : "slipped"} this period`,
      body: `Positive replies ${moved.positiveChange > 0 ? "up" : "down"} ${pct(Math.abs(moved.positiveChange))} on ${
        moved.volumeChange >= 0 ? "up" : "down"
      } ${pct(Math.abs(moved.volumeChange))} message volume — reply quality, not volume, is driving the change.`,
    });
  }

  // Best follow-up step
  const fu = getFollowUpFacts();
  const bestStep = fu.reduce((b, f) => (rate(f.replies, f.sent) > rate(b.replies, b.sent) ? f : b), fu[0]!);
  insights.push({
    id: "followup",
    tone: "insight",
    title: `Follow-up #${bestStep.step} converts best at ${pct(rate(bestStep.replies, bestStep.sent))}`,
    body: `Reply rate declines after step ${bestStep.step + 1}. Three touches per prospect is your efficient frontier.`,
  });

  // Weakest stage
  const weakest = getWeakestStage(getStageConversions(current, previous));
  insights.push({
    id: "weakest",
    tone: weakest.change < 0 ? "warning" : "neutral",
    title: `${weakest.label} is your biggest opportunity`,
    body: `Currently ${pct(weakest.value)}, ${weakest.change < 0 ? "down" : "up"} ${pct(Math.abs(weakest.change))} versus the previous period.`,
  });

  // Best time
  const best = getBestOutreachTime();
  insights.push({
    id: "best-time",
    tone: "positive",
    title: `${best.weekday} ${best.window} is your highest-yield window`,
    body: `Reply rate reaches ${pct(best.replyRate)} — ${pct(best.liftVsAverage)} above your all-hours average.`,
  });

  return insights;
}

/* ------------------------------------------------------------ formatting */

export function pct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function money(value: number, opts: { compact?: boolean } = {}): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: opts.compact ? "compact" : "standard",
    maximumFractionDigits: opts.compact ? 1 : 0,
  }).format(value);
}

export function number(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function formatRange(range: DateRange): string {
  const sameYear = range.from.getUTCFullYear() === range.to.getUTCFullYear();
  const from = range.from.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
    timeZone: "UTC",
  });
  const to = range.to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `${from} – ${to}`;
}

export function formatDayLabel(key: string): string {
  const d = new Date(key.length === 7 ? `${key}-01T00:00:00Z` : `${key}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", timeZone: "UTC" });
}

export function channelAccent(channel: Channel): string {
  const map: Record<Channel, string> = {
    Instagram: "var(--chart-3)",
    Email: "var(--chart-1)",
    LinkedIn: "var(--chart-2)",
    X: "var(--chart-4)",
    WhatsApp: "var(--chart-5)",
    Other: "var(--muted-foreground)",
  };
  return map[channel];
}
