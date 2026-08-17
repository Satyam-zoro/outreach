import { createFileRoute } from "@tanstack/react-router";

import { BreakdownTable } from "@/components/pulse/breakdown-table";
import { KpiCard } from "@/components/pulse/kpi-card";
import { PageIntro, Panel, Reveal } from "@/components/pulse/primitives";
import { memberById } from "@/lib/pulse/data";
import { delta, getReplyRate, getTeamPerformance, money, number, pct } from "@/lib/pulse/analytics";
import { useAnalytics } from "@/lib/pulse/filters";

export const Route = createFileRoute("/_shell/team")({
  head: () => ({
    meta: [
      { title: "Team Performance — PULSE" },
      {
        name: "description",
        content: "Per-rep outreach analytics: volume, reply rate, positive replies, calls booked, deals closed and revenue contribution.",
      },
      { property: "og:title", content: "Team Performance — PULSE" },
      { property: "og:description", content: "Professional performance analytics for every rep on the team." },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const { facts, totals, previousTotals } = useAnalytics();
  const rows = getTeamPerformance(facts).sort((a, b) => b.revenue - a.revenue);
  const top = rows.slice(0, 3);
  const maxRevenue = Math.max(...rows.map((r) => r.revenue), 1);

  return (
    <div className="space-y-6">
      <PageIntro title="Team Performance" subtitle="Contribution, efficiency and quality per rep — not a scoreboard, a diagnostic." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Team revenue" value={totals.revenue} format={(v) => money(v)} delta={delta(totals.revenue, previousTotals.revenue)} emphasis="primary" />
        <KpiCard label="Messages sent" value={totals.dms + totals.emails} delta={delta(totals.dms + totals.emails, previousTotals.dms + previousTotals.emails)} />
        <KpiCard
          label="Blended reply rate"
          value={getReplyRate(totals) * 100}
          format={(v) => `${v.toFixed(1)}%`}
          delta={delta(getReplyRate(totals), getReplyRate(previousTotals))}
        />
        <KpiCard label="Active reps" value={rows.length} emphasis="quiet" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Reveal>
          <Panel title="Revenue leaders" description="Closed-won contribution this period.">
            <ol className="space-y-4">
              {top.map((row, i) => (
                <li key={row.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex items-baseline gap-2.5">
                      <span className="num text-xs text-muted-foreground">{(i + 1).toString().padStart(2, "0")}</span>
                      <span className="text-sm font-medium">{memberById(row.id)?.name ?? row.label}</span>
                    </span>
                    <span className="num text-sm font-medium">{money(row.revenue)}</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(row.revenue / maxRevenue) * 100}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {number(row.sent)} sent · {pct(row.replyRate)} reply rate · {number(row.clients)} deals
                  </p>
                </li>
              ))}
            </ol>
          </Panel>
        </Reveal>

        <Reveal delay={60}>
          <Panel title="Full team breakdown" description="Sortable across every metric.">
            <BreakdownTable rows={rows} labelHeader="Team member" rank />
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
