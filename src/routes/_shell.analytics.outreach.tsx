import { createFileRoute } from "@tanstack/react-router";

import { ActivityChart, ChartLegend } from "@/components/pulse/activity-chart";
import { BreakdownTable } from "@/components/pulse/breakdown-table";
import { GranularityToggle } from "@/components/pulse/global-filters";
import { ActivityHeatmap } from "@/components/pulse/heatmap";
import { BestTimeCard } from "@/components/pulse/insights";
import { KpiCard } from "@/components/pulse/kpi-card";
import { PageIntro, Panel, Reveal } from "@/components/pulse/primitives";
import {
  delta,
  getChannelPerformance,
  getSeries,
  getSourcePerformance,
  getTotalOutreach,
  number,
  pct,
} from "@/lib/pulse/analytics";
import { useAnalytics } from "@/lib/pulse/filters";

export const Route = createFileRoute("/_shell/analytics/outreach")({
  head: () => ({
    meta: [
      { title: "Outreach Analytics — PULSE" },
      {
        name: "description",
        content: "Outreach volume by day, channel and lead source, with the best hours to send based on historical reply data.",
      },
      { property: "og:title", content: "Outreach Analytics — PULSE" },
      { property: "og:description", content: "Volume, channel mix and timing intelligence for your outreach engine." },
    ],
  }),
  component: OutreachAnalytics,
});

function OutreachAnalytics() {
  const { totals, previousTotals, facts, granularity } = useAnalytics();
  const series = getSeries(facts, granularity);

  return (
    <div className="space-y-6">
      <PageIntro
        title="Outreach Analytics"
        subtitle="What did we actually do? Volume, mix and cadence across the selected period."
        actions={<GranularityToggle />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total messages"
          value={getTotalOutreach(totals)}
          delta={delta(getTotalOutreach(totals), getTotalOutreach(previousTotals))}
          emphasis="primary"
        />
        <KpiCard label="DMs sent" value={totals.dms} delta={delta(totals.dms, previousTotals.dms)} />
        <KpiCard label="Emails sent" value={totals.emails} delta={delta(totals.emails, previousTotals.emails)} />
        <KpiCard
          label="Follow-ups sent"
          value={totals.followUps}
          delta={delta(totals.followUps, previousTotals.followUps)}
          hint={`${pct(totals.followUps / Math.max(1, getTotalOutreach(totals)), 0)} of total volume`}
        />
      </div>

      <Reveal>
        <Panel title="Volume over time" description="Messages sent against replies and positive replies." bodyClassName="space-y-4">
          <ChartLegend />
          <ActivityChart data={series} height={300} />
        </Panel>
      </Reveal>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Reveal>
          <Panel title="Channel breakdown" description="Where volume goes and what it returns.">
            <BreakdownTable rows={getChannelPerformance(facts)} labelHeader="Channel" />
          </Panel>
        </Reveal>
        <Reveal delay={60}>
          <BestTimeCard />
        </Reveal>
      </div>

      <Reveal>
        <Panel title="Lead source performance" description="Which acquisition sources produce responsive prospects.">
          <BreakdownTable rows={getSourcePerformance(facts)} labelHeader="Lead source" />
        </Panel>
      </Reveal>

      <Reveal>
        <Panel
          title="Send-time heatmap"
          description={`${number(getTotalOutreach(totals))} messages mapped by weekday and hour.`}
        >
          <ActivityHeatmap />
        </Panel>
      </Reveal>
    </div>
  );
}
