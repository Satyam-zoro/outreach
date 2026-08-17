import { Sparkles } from "lucide-react";

import { Chip, Dot, type Tone } from "@/components/pulse/primitives";
import type { Insight } from "@/lib/pulse/analytics";
import { getBestOutreachTime, pct } from "@/lib/pulse/analytics";
import { getLiveActivity } from "@/lib/pulse/data";

export function InsightPanel({ insights }: { insights: Insight[] }) {
  return (
    <section className="panel overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-md bg-insight/12">
            <Sparkles className="size-3.5 text-insight" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-[0.14em] uppercase">Pulse Intelligence</h2>
            <p className="text-xs text-muted-foreground">Generated from the selected period only.</p>
          </div>
        </div>
      </header>
      <ul className="divide-y divide-border">
        {insights.length === 0 ? (
          <li className="px-5 py-6 text-sm text-muted-foreground">
            Not enough activity in this period to produce reliable insights. Widen the date range.
          </li>
        ) : (
          insights.map((insight) => (
            <li key={insight.id} className="flex gap-3 px-5 py-4">
              <span className="mt-1.5">
                <Dot tone={insight.tone as Tone} />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium">{insight.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{insight.body}</p>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

export function BestTimeCard() {
  const best = getBestOutreachTime();
  return (
    <article className="panel flex flex-col gap-4 p-5">
      <header className="flex items-center justify-between">
        <h2 className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Best time to outreach
        </h2>
        <Chip tone="positive">Historical</Chip>
      </header>
      <div>
        <p className="text-2xl font-semibold tracking-tight">{best.weekday}</p>
        <p className="num mt-1 text-sm text-muted-foreground">{best.window}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
        <div>
          <dt className="text-muted-foreground">Expected reply rate</dt>
          <dd className="stat mt-1 text-xl text-positive">{pct(best.replyRate)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Lift vs average</dt>
          <dd className="stat mt-1 text-xl">{pct(best.liftVsAverage, 0)}</dd>
        </div>
      </dl>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Your reply rate is {pct(best.liftVsAverage, 0)} higher during this window than across all other hours.
      </p>
    </article>
  );
}

export function LiveActivityFeed() {
  const events = getLiveActivity();
  return (
    <section className="panel overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold tracking-tight">Live activity</h2>
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-positive" aria-hidden />
          Streaming
        </span>
      </header>
      <ul className="divide-y divide-border">
        {events.map((e) => (
          <li key={e.id} className="flex items-center gap-3 px-5 py-2.5 text-xs">
            <Dot tone={e.tone} />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{e.text}</span>
            <span className="num shrink-0 text-[11px] text-muted-foreground/70">{e.minutesAgo}m</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
