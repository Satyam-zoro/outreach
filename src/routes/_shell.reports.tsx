import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BreakdownTable } from "@/components/pulse/breakdown-table";
import { ConversionFunnel } from "@/components/pulse/funnel";
import { Chip, PageIntro, Panel, Reveal } from "@/components/pulse/primitives";
import {
  formatRange,
  getCampaignPerformance,
  getChannelPerformance,
  getReplyRate,
  getTeamPerformance,
  getTotalOutreach,
  money,
  number,
  pct,
} from "@/lib/pulse/analytics";
import { useAnalytics } from "@/lib/pulse/filters";

export const Route = createFileRoute("/_shell/reports")({
  head: () => ({
    meta: [
      { title: "Reports — PULSE" },
      {
        name: "description",
        content: "Build daily, weekly, monthly, campaign, team or channel outreach reports and export them as PDF or CSV.",
      },
      { property: "og:title", content: "Reports — PULSE" },
      { property: "og:description", content: "Board-ready outreach reporting in a few clicks." },
    ],
  }),
  component: ReportsPage,
});

const types = ["Daily", "Weekly", "Monthly", "Campaign", "Team", "Channel", "Custom"] as const;
const sections = ["KPIs", "Activity graph", "Funnel", "Conversion rates", "Top campaigns", "Team performance", "Insights"];

function ReportsPage() {
  const { totals, facts, funnel, filters, insights } = useAnalytics();
  const [type, setType] = useState<(typeof types)[number]>("Weekly");
  const [included, setIncluded] = useState<string[]>(sections);

  const has = (s: string) => included.includes(s);

  return (
    <div className="space-y-6">
      <PageIntro
        title="Reports"
        subtitle="Compose a report from the current filters, then export or share it."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 border-border bg-surface text-xs" onClick={() => toast.success("CSV export queued")}>
              <Download className="size-3.5" aria-hidden />
              CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2 border-border bg-surface text-xs" onClick={() => toast.success("PDF export queued")}>
              <FileText className="size-3.5" aria-hidden />
              PDF
            </Button>
            <Button size="sm" className="gap-2 text-xs" onClick={() => toast.success("Share link copied to clipboard")}>
              <Share2 className="size-3.5" aria-hidden />
              Share report
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel title="Report type">
            <div className="grid gap-1.5">
              {types.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                    type === t ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Sections">
            <div className="grid gap-1.5">
              {sections.map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-accent">
                  <Checkbox
                    checked={has(s)}
                    onCheckedChange={() => setIncluded((v) => (v.includes(s) ? v.filter((x) => x !== s) : [...v, s]))}
                  />
                  {s}
                </label>
              ))}
            </div>
          </Panel>
        </div>

        <Reveal>
          <div className="panel space-y-6 p-6">
            <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
              <div>
                <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">{type} report</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">Outreach performance</h2>
                <p className="num mt-1 text-xs text-muted-foreground">{formatRange(filters.range)}</p>
              </div>
              <Chip tone="primary">Draft</Chip>
            </header>

            {has("KPIs") ? (
              <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  ["Messages sent", number(getTotalOutreach(totals))],
                  ["Replies", number(totals.replies)],
                  ["Reply rate", pct(getReplyRate(totals))],
                  ["Revenue", money(totals.revenue)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">{label}</p>
                    <p className="stat mt-1.5 text-2xl">{value}</p>
                  </div>
                ))}
              </section>
            ) : null}

            {has("Funnel") ? (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Conversion funnel</h3>
                <ConversionFunnel stages={funnel} />
              </section>
            ) : null}

            {has("Top campaigns") ? (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Top campaigns</h3>
                <BreakdownTable rows={getCampaignPerformance(facts).slice(0, 5)} labelHeader="Campaign" showRoi />
              </section>
            ) : null}

            {has("Conversion rates") ? (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Channel performance</h3>
                <BreakdownTable rows={getChannelPerformance(facts)} labelHeader="Channel" />
              </section>
            ) : null}

            {has("Team performance") ? (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Team performance</h3>
                <BreakdownTable rows={getTeamPerformance(facts)} labelHeader="Member" rank />
              </section>
            ) : null}

            {has("Insights") ? (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Insights</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {insights.map((i) => (
                    <li key={i.id}>
                      <span className="text-foreground">{i.title}.</span> {i.body}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
