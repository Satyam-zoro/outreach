import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { BreakdownTable } from "@/components/pulse/breakdown-table";
import { ConversionFunnel } from "@/components/pulse/funnel";
import { KpiCard } from "@/components/pulse/kpi-card";
import { Chip, DeltaBadge, PageIntro, Panel, Reveal } from "@/components/pulse/primitives";
import { getLeads, statusTone } from "@/lib/pulse/data";
import {
  delta,
  getCallConversion,
  getChannelPerformance,
  getCloseRate,
  getReplyRate,
  getStageConversions,
  getWeakestStage,
  number,
  pct,
} from "@/lib/pulse/analytics";
import { useAnalytics } from "@/lib/pulse/filters";
import type { FunnelStage } from "@/lib/pulse/analytics";

export const Route = createFileRoute("/_shell/analytics/conversion")({
  head: () => ({
    meta: [
      { title: "Conversion Analytics — PULSE" },
      {
        name: "description",
        content: "Stage-by-stage outreach conversion, drop-off analysis and the single stage costing you the most pipeline.",
      },
      { property: "og:title", content: "Conversion Analytics — PULSE" },
      { property: "og:description", content: "See exactly where prospects fall out of your outreach funnel." },
    ],
  }),
  component: ConversionAnalytics,
});

const stageStatuses: Record<string, string[]> = {
  contacted: ["Contacted", "Follow-up", "New"],
  replied: ["Replied"],
  positive: ["Positive"],
  interested: ["Positive", "Negotiating"],
  call: ["Call Booked"],
  closed: ["Won"],
};

function ConversionAnalytics() {
  const { totals, previousTotals, facts, funnel } = useAnalytics();
  const [stage, setStage] = useState<FunnelStage | null>(null);
  const stages = getStageConversions(totals, previousTotals);
  const weakest = getWeakestStage(stages);

  const inspected = stage
    ? getLeads()
        .filter((l) => (stageStatuses[stage.id] ?? []).includes(l.status))
        .slice(0, 8)
    : [];

  return (
    <div className="space-y-6">
      <PageIntro
        title="Conversion Analytics"
        subtitle="How well did outreach work? Every stage, its conversion and its cost."
        actions={<Chip tone="warning">Weakest: {weakest.label}</Chip>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Reply rate"
          value={getReplyRate(totals) * 100}
          format={(v) => `${v.toFixed(1)}%`}
          delta={delta(getReplyRate(totals), getReplyRate(previousTotals))}
          emphasis="primary"
        />
        <KpiCard
          label="Interested → call"
          value={getCallConversion(totals) * 100}
          format={(v) => `${v.toFixed(1)}%`}
          delta={delta(getCallConversion(totals), getCallConversion(previousTotals))}
        />
        <KpiCard
          label="Call → client"
          value={getCloseRate(totals) * 100}
          format={(v) => `${v.toFixed(1)}%`}
          delta={delta(getCloseRate(totals), getCloseRate(previousTotals))}
        />
        <KpiCard label="Deals closed" value={totals.deals} delta={delta(totals.deals, previousTotals.deals)} emphasis="quiet" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Reveal>
          <Panel title="Outreach Funnel" description="Click a stage to inspect the underlying leads.">
            <ConversionFunnel stages={funnel} onSelectStage={setStage} />
          </Panel>
        </Reveal>

        <div className="space-y-4">
          <Reveal delay={60}>
            <Panel title="Stage conversion" description="Current rate against the previous period.">
              <ul className="divide-y divide-border">
                {stages.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <span className={s.id === weakest.id ? "text-sm font-medium text-warning" : "text-sm text-muted-foreground"}>
                      {s.label}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="stat text-lg">{pct(s.value)}</span>
                      <DeltaBadge value={delta(s.value, s.previous)} />
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </Reveal>

          <Reveal delay={120}>
            <Panel
              title={stage ? `${stage.label} — sample leads` : "Inspect a stage"}
              description={
                stage
                  ? `${number(stage.count)} prospects reached this stage in the selected period.`
                  : "Select a funnel stage to see representative prospects."
              }
            >
              {inspected.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No stage selected yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {inspected.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{l.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{l.company}</span>
                      </span>
                      <Chip tone={statusTone(l.status)}>{l.status}</Chip>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </Reveal>
        </div>
      </div>

      <Reveal>
        <Panel title="Conversion by channel" description="Which surfaces convert, not just which ones are loud.">
          <BreakdownTable rows={getChannelPerformance(facts)} labelHeader="Channel" />
        </Panel>
      </Reveal>
    </div>
  );
}
