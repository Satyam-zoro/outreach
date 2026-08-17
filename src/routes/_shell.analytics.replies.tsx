import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { KpiCard } from "@/components/pulse/kpi-card";
import { Chip, PageIntro, Panel, Reveal } from "@/components/pulse/primitives";
import { getFollowUpFacts } from "@/lib/pulse/data";
import { delta, getFollowUpConversion, getPositiveReplyRate, getReplyRate, number, pct } from "@/lib/pulse/analytics";
import { useAnalytics } from "@/lib/pulse/filters";

export const Route = createFileRoute("/_shell/analytics/replies")({
  head: () => ({
    meta: [
      { title: "Follow-up Intelligence — PULSE" },
      {
        name: "description",
        content: "Reply quality and follow-up conversion by touch number, revealing the optimal number of follow-ups per prospect.",
      },
      { property: "og:title", content: "Follow-up Intelligence — PULSE" },
      { property: "og:description", content: "Find the exact follow-up step where your replies peak." },
    ],
  }),
  component: RepliesAnalytics,
});

interface StepRow {
  label: string;
  step: number;
  sent: number;
  replies: number;
  positive: number;
  rate: number;
}

function StepTooltip({ active, payload }: { active?: boolean; payload?: { payload?: StepRow }[] }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-lg border border-border-strong bg-popover/95 p-3 text-xs shadow-lift backdrop-blur">
      <p className="font-medium">{row.label}</p>
      <p className="num mt-1.5 text-muted-foreground">{number(row.sent)} sent</p>
      <p className="num text-muted-foreground">{number(row.replies)} replies</p>
      <p className="num mt-1 font-medium text-positive">{pct(row.rate)} reply rate</p>
    </div>
  );
}

function RepliesAnalytics() {
  const { totals, previousTotals } = useAnalytics();
  const followUpFacts = getFollowUpFacts();
  const steps: StepRow[] = followUpFacts.map((f) => ({
    label: f.step === 0 ? "Initial message" : `Follow-up #${f.step}`,
    step: f.step,
    sent: f.sent,
    replies: f.replies,
    positive: f.positive,
    rate: f.sent > 0 ? f.replies / f.sent : 0,
  }));
  const activeSteps = steps.filter((s) => s.sent > 0);
  const best = activeSteps.length > 0
    ? activeSteps.reduce((b, s) => (s.rate > b.rate ? s : b), activeSteps[0]!)
    : steps[0] || { label: "Initial message", step: 0, sent: 0, replies: 0, positive: 0, rate: 0 };

  return (
    <div className="space-y-6">
      <PageIntro
        title="Follow-up Intelligence"
        subtitle="How persistence changes outcomes — and where extra touches stop paying."
        actions={best.sent > 0 ? <Chip tone="insight">Peak at {best.label}</Chip> : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Follow-ups sent" value={totals.followUps} delta={delta(totals.followUps, previousTotals.followUps)} emphasis="primary" />
        <KpiCard label="Replies" value={totals.replies} delta={delta(totals.replies, previousTotals.replies)} />
        <KpiCard
          label="Follow-up conversion"
          value={getFollowUpConversion() * 100}
          format={(v) => `${v.toFixed(1)}%`}
          hint="Replies from follow-up touches only"
        />
        <KpiCard
          label="Positive share"
          value={getPositiveReplyRate(totals) * 100}
          format={(v) => `${v.toFixed(1)}%`}
          delta={delta(getPositiveReplyRate(totals), getPositiveReplyRate(previousTotals))}
        />
      </div>

      <Reveal>
        <Panel title="Follow-up number vs conversion" description="Reply rate by touch. The peak is your efficient frontier.">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={steps} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip content={<StepTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]} animationDuration={520} maxBarSize={54}>
                  {steps.map((s) => (
                    <Cell key={s.step} fill={s.step === best.step ? "var(--chart-2)" : "var(--chart-1)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </Reveal>

      <Reveal>
        <Panel title="Touch-by-touch detail" description="Volume, replies and positive replies per follow-up step.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                  <th scope="col" className="py-2.5 pr-4 text-left font-medium">Step</th>
                  <th scope="col" className="py-2.5 pl-4 text-right font-medium">Sent</th>
                  <th scope="col" className="py-2.5 pl-4 text-right font-medium">Replies</th>
                  <th scope="col" className="py-2.5 pl-4 text-right font-medium">Reply rate</th>
                  <th scope="col" className="py-2.5 pl-4 text-right font-medium">Positive</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((s) => (
                  <tr key={s.step} className="border-b border-border/70 transition-colors last:border-0 hover:bg-elevated">
                    <th scope="row" className="py-3 pr-4 text-left font-normal">
                      <span className="flex items-center gap-2">
                        {s.label}
                        {s.step === best.step ? <Chip tone="positive">Best</Chip> : null}
                      </span>
                    </th>
                    <td className="num py-3 pl-4 text-right">{number(s.sent)}</td>
                    <td className="num py-3 pl-4 text-right">{number(s.replies)}</td>
                    <td className="num py-3 pl-4 text-right">{pct(s.rate)}</td>
                    <td className="num py-3 pl-4 text-right">{number(s.positive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Reply rate rises through {best.label.toLowerCase()} at {pct(best.rate)} and declines afterwards — three touches per
            prospect is the point of diminishing returns. Your blended reply rate is {pct(getReplyRate(totals))}.
          </p>
        </Panel>
      </Reveal>
    </div>
  );
}
