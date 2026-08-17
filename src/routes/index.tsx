import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Blocks, FileBarChart, Filter, Sparkles, Target, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ActivityChart, ChartLegend } from "@/components/pulse/activity-chart";
import { BreakdownTable } from "@/components/pulse/breakdown-table";
import { ConversionFunnel } from "@/components/pulse/funnel";
import { Chip, Panel, Reveal } from "@/components/pulse/primitives";
import { getFacts } from "@/lib/pulse/data";
import {
  getChannelPerformance,
  getFunnel,
  getReplyRate,
  getSeries,
  getTeamPerformance,
  getTotalOutreach,
  money,
  number,
  pct,
  sum,
} from "@/lib/pulse/analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PULSE — Outreach Analytics & Conversion Intelligence" },
      {
        name: "description",
        content:
          "PULSE turns every DM, email, reply and closed deal into outreach intelligence: funnel conversion, channel performance, follow-up analytics and revenue attribution.",
      },
      { property: "og:title", content: "PULSE — Know exactly what your outreach is doing" },
      {
        property: "og:description",
        content: "Turn every message, reply and conversion into actionable intelligence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function useSnapshot() {
  const all = getFacts();
  const todayStr = new Date().toISOString().slice(0, 10);
  const cutoff = (all.length > 0 && all[Math.max(0, all.length - 6 * 60)]?.date) || all[0]?.date || todayStr;
  const facts = all.filter((f) => f.date >= cutoff);
  const totals = sum(facts);
  const prior = sum(all.filter((f) => f.date < cutoff).slice(-facts.length));
  return {
    facts,
    totals,
    series: getSeries(facts, "day"),
    funnel: getFunnel(totals, prior),
  };
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-medium tracking-[0.2em] text-primary uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function LandingPage() {
  const { facts, totals, series, funnel } = useSnapshot();
  const channels = getChannelPerformance(facts);
  const teamRows = getTeamPerformance(facts).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-4 px-5">
          <span className="text-sm font-semibold tracking-[0.2em] uppercase">Pulse</span>
          <nav className="ml-auto flex items-center gap-5 text-xs text-muted-foreground" aria-label="Landing">
            <a href="#funnel" className="hidden transition-colors hover:text-foreground sm:inline">Funnel</a>
            <a href="#channels" className="hidden transition-colors hover:text-foreground sm:inline">Channels</a>
            <a href="#intelligence" className="hidden transition-colors hover:text-foreground sm:inline">Intelligence</a>
            <Button asChild size="sm" className="text-xs">
              <Link to="/dashboard">
                Open dashboard
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <span className="pointer-events-none absolute inset-0 hairline-grid opacity-40" aria-hidden />
          <span
            className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[720px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-[1180px] px-5 pt-20 pb-14">
            <Chip tone="primary">Outreach intelligence for growth teams</Chip>
            <h1 className="mt-6 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-[-0.03em] sm:text-6xl">
              Know exactly
              <br />
              what your outreach
              <br />
              is doing.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Turn every message, reply and conversion into actionable intelligence — volume, reply quality, stage-by-stage
              conversion and revenue, in one dense, fast interface.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link to="/dashboard">
                  Open dashboard
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button variant="outline" asChild className="border-border bg-surface">
                <a href="#funnel">See how it works</a>
              </Button>
            </div>

            <dl className="mt-12 grid max-w-3xl grid-cols-2 gap-6 border-t border-border pt-8 sm:grid-cols-4">
              {[
                ["Messages tracked", number(getTotalOutreach(totals))],
                ["Replies", number(totals.replies)],
                ["Reply rate", pct(getReplyRate(totals))],
                ["Revenue attributed", money(totals.revenue, { compact: true })],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">{label}</dt>
                  <dd className="stat mt-2 text-2xl">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Live dashboard preview */}
        <section className="border-b border-border bg-surface/40">
          <div className="mx-auto max-w-[1180px] px-5 py-16">
            <SectionHeading
              eyebrow="Live preview"
              title="The dashboard, not a screenshot."
              body="This is the real product surface rendering real aggregated data — the same components, charts and typography you get on day one."
            />
            <Reveal className="mt-8">
              <Panel
                title="Outreach Activity"
                description="Messages sent and responses received over time."
                actions={<Chip>Last 60 days</Chip>}
                bodyClassName="space-y-4"
              >
                <ChartLegend />
                <ActivityChart data={series} height={280} />
              </Panel>
            </Reveal>
          </div>
        </section>

        {/* Funnel */}
        <section id="funnel" className="border-b border-border">
          <div className="mx-auto grid max-w-[1180px] gap-8 px-5 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
            <SectionHeading
              eyebrow="Conversion"
              title="See exactly where prospects fall out."
              body="Contacted, replied, positive, interested, call booked, closed. Every stage shows conversion, drop-off and how it moved against the previous period — so the weakest link is never a guess."
            />
            <Reveal>
              <Panel title="Outreach Funnel">
                <ConversionFunnel stages={funnel} />
              </Panel>
            </Reveal>
          </div>
        </section>

        {/* Channels */}
        <section id="channels" className="border-b border-border bg-surface/40">
          <div className="mx-auto max-w-[1180px] px-5 py-16">
            <SectionHeading
              eyebrow="Channels"
              title="Compare surfaces on outcomes, not noise."
              body="Sort every channel by sent, replies, reply rate, positive replies, calls, clients or revenue. Volume never wins an argument here — return does."
            />
            <Reveal className="mt-8">
              <Panel>
                <BreakdownTable rows={channels} labelHeader="Channel" />
              </Panel>
            </Reveal>
          </div>
        </section>

        {/* Campaigns + team */}
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-[1180px] gap-8 px-5 py-16 lg:grid-cols-2">
            <div className="space-y-5">
              <SectionHeading
                eyebrow="Campaigns & team"
                title="Attribution down to the play and the person."
                body="Campaign cost, ROI and revenue per message sit beside per-rep reply quality — professional performance analytics, not a leaderboard toy."
              />
              <ul className="space-y-3 text-sm">
                {[
                  [Target, "Campaign ROI with cost, revenue and duplication built in."],
                  [Users, "Per-rep reply rate, positive share, calls and closed revenue."],
                  [Filter, "Global filters that update every chart and KPI consistently."],
                  [FileBarChart, "Board-ready reports exportable as PDF or CSV."],
                  [Blocks, "Instagram, Gmail, LinkedIn, WhatsApp, Slack, HubSpot, CSV, API."],
                ].map(([Icon, text]) => {
                  const Ico = Icon as typeof Target;
                  return (
                    <li key={text as string} className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border border-border bg-elevated">
                        <Ico className="size-3 text-muted-foreground" aria-hidden />
                      </span>
                      <span className="text-muted-foreground">{text as string}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <Reveal>
              <Panel title="Revenue by team member" description="Sorted by closed-won contribution.">
                <BreakdownTable rows={teamRows} labelHeader="Member" rank />
              </Panel>
            </Reveal>
          </div>
        </section>

        {/* Intelligence */}
        <section id="intelligence" className="border-b border-border bg-surface/40">
          <div className="mx-auto max-w-[1180px] px-5 py-16">
            <SectionHeading
              eyebrow="Intelligence"
              title="Statistics become decisions."
              body="PULSE reads the selected period and tells you what changed, which follow-up step peaks, and the exact window where your reply rate is highest. No insights are generated without enough data behind them."
            />
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {[
                ["Follow-up #2 converts best at 18.3%", "Reply rate declines after the third touch — three is your efficient frontier."],
                ["Instagram produced 42% more positive replies", "On 18% fewer messages. Quality moved, not volume."],
                ["Tuesday 4–6 PM is your peak window", "Reply rate runs 31% above your all-hours average."],
              ].map(([title, body]) => (
                <Reveal key={title}>
                  <article className="panel h-full space-y-2 p-5">
                    <span className="grid size-7 place-items-center rounded-md bg-insight/12">
                      <Sparkles className="size-3.5 text-insight" aria-hidden />
                    </span>
                    <h3 className="text-sm font-medium">{title}</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="mx-auto max-w-[1180px] px-5 py-20 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Stop guessing what outreach is working.</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
              Open the dashboard and read your entire outreach operation in about thirty seconds.
            </p>
            <Button asChild className="mt-7">
              <Link to="/dashboard">
                Open dashboard
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-muted-foreground">
          <span className="tracking-[0.2em] uppercase">Pulse</span>
          <span>Outreach analytics & conversion intelligence</span>
        </div>
      </footer>
    </div>
  );
}
