import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Plus, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BreakdownTable } from "@/components/pulse/breakdown-table";
import { EmptyState } from "@/components/pulse/empty-state";
import { Chip, DeltaBadge, PageIntro, Panel, Reveal } from "@/components/pulse/primitives";
import { campaigns as seedCampaigns } from "@/lib/pulse/data";
import { delta, getCampaignPerformance, money, number, pct } from "@/lib/pulse/analytics";
import { useAnalytics } from "@/lib/pulse/filters";
import type { Campaign } from "@/lib/pulse/types";

export const Route = createFileRoute("/_shell/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns — PULSE" },
      {
        name: "description",
        content: "Compare outreach campaigns on volume, reply quality, calls, closed deals, cost and ROI — then duplicate what works.",
      },
      { property: "og:title", content: "Campaigns — PULSE" },
      { property: "og:description", content: "Campaign-level outreach intelligence with cost and ROI attribution." },
    ],
  }),
  component: CampaignsPage,
});

function CampaignsPage() {
  const { facts, prevFacts } = useAnalytics();
  const [extra, setExtra] = useState<Campaign[]>([]);
  const [draft, setDraft] = useState("");
  const rows = getCampaignPerformance(facts);
  const prevRows = getCampaignPerformance(prevFacts);
  const list = [...seedCampaigns, ...extra];

  return (
    <div className="space-y-6">
      <PageIntro
        title="Campaigns"
        subtitle="Which plays produced pipeline, and what each one cost to run."
        actions={
          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="New campaign name"
              aria-label="New campaign name"
              className="h-9 w-48 border-border bg-surface text-sm"
            />
            <Button
              size="sm"
              className="gap-2 text-xs"
              disabled={!draft.trim()}
              onClick={() => {
                setExtra((c) => [
                  ...c,
                  {
                    id: `c_new_${c.length}`,
                    name: draft.trim(),
                    channel: "Instagram",
                    status: "Active",
                    startDate: new Date().toISOString().slice(0, 10),
                    cost: 0,
                  },
                ]);
                setDraft("");
              }}
            >
              <Plus className="size-4" aria-hidden />
              Create
            </Button>
          </div>
        }
      />

      {rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Target}
            title="No campaign activity in this period."
            body="Widen the date range or launch a campaign to start attributing replies and revenue."
            actionLabel="View integrations"
          />
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((row, i) => {
              const before = prevRows.find((r) => r.id === row.id);
              const campaign = list.find((c) => c.id === row.id);
              return (
                <Reveal key={row.id} delay={i * 40}>
                  <article className="panel flex h-full flex-col gap-4 p-5 transition-colors hover:border-border-strong hover:bg-elevated">
                    <header className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold">{row.label}</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">{row.sublabel}</p>
                      </div>
                      <Chip tone={campaign?.status === "Active" ? "positive" : campaign?.status === "Paused" ? "warning" : "neutral"}>
                        {campaign?.status ?? "Active"}
                      </Chip>
                    </header>

                    <div className="flex items-end justify-between gap-3">
                      <p className="stat text-3xl">{money(row.revenue, { compact: true })}</p>
                      <DeltaBadge value={delta(row.revenue, before?.revenue ?? 0)} label="revenue" />
                    </div>

                    <dl className="grid grid-cols-3 gap-3 border-t border-border pt-3 text-xs">
                      {[
                        ["Contacted", number(row.sent)],
                        ["Replies", number(row.replies)],
                        ["Reply rate", pct(row.replyRate)],
                        ["Positive", number(row.positive)],
                        ["Calls", number(row.calls)],
                        ["Deals", number(row.clients)],
                        ["Cost", money(row.cost ?? 0)],
                        ["ROI", pct(row.roi ?? 0, 0)],
                        ["Rev / msg", `$${(row.revenue / Math.max(1, row.sent)).toFixed(2)}`],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd className="num mt-0.5 font-medium">{value}</dd>
                        </div>
                      ))}
                    </dl>

                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-auto gap-2 border-border bg-surface text-xs"
                      onClick={() =>
                        campaign &&
                        setExtra((c) => [...c, { ...campaign, id: `${campaign.id}_copy_${c.length}`, name: `${campaign.name} (copy)` }])
                      }
                    >
                      <Copy className="size-3.5" aria-hidden />
                      Duplicate campaign
                    </Button>
                  </article>
                </Reveal>
              );
            })}
          </div>

          <Reveal>
            <Panel title="Campaign comparison" description="Sort by any metric to find the play worth scaling.">
              <BreakdownTable rows={rows} labelHeader="Campaign" showRoi />
            </Panel>
          </Reveal>
        </>
      )}
    </div>
  );
}
