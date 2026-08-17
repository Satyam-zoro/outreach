import { useState } from "react";

import { getHeatmap, number, pct, type HeatMetric } from "@/lib/pulse/analytics";
import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const metricLabels: Record<HeatMetric, string> = {
  sent: "Sent",
  replies: "Replies",
  positive: "Positive replies",
};

export function ActivityHeatmap() {
  const [metric, setMetric] = useState<HeatMetric>("replies");
  const { cells, hours } = getHeatmap(metric);

  const fmtHour = (h: number) => `${h.toString().padStart(2, "0")}:00`;

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-md border border-border bg-surface p-0.5" role="group" aria-label="Heatmap metric">
        {(Object.keys(metricLabels) as HeatMetric[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetric(m)}
            aria-pressed={metric === m}
            className={cn(
              "rounded px-2.5 py-1 text-xs transition-colors",
              metric === m ? "bg-elevated text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {metricLabels[m]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1 text-xs">
          <caption className="sr-only">{metricLabels[metric]} by weekday and hour</caption>
          <thead>
            <tr>
              <th scope="col" className="w-14" />
              {DAYS.map((d) => (
                <th key={d} scope="col" className="pb-1 text-[11px] font-medium text-muted-foreground">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour) => (
              <tr key={hour}>
                <th scope="row" className="num pr-2 text-right text-[11px] font-normal text-muted-foreground">
                  {fmtHour(hour)}
                </th>
                {DAYS.map((_, weekday) => {
                  const cell = cells.find((c) => c.weekday === weekday && c.hour === hour);
                  const intensity = cell?.intensity ?? 0;
                  return (
                    <td key={weekday}>
                      <span
                        tabIndex={0}
                        role="img"
                        aria-label={`${DAYS[weekday]} ${fmtHour(hour)}: ${number(cell?.value ?? 0)} ${metricLabels[metric].toLowerCase()}, ${pct(cell?.replyRate ?? 0)} reply rate`}
                        title={`${DAYS[weekday]} ${fmtHour(hour)} · ${number(cell?.value ?? 0)} · ${pct(cell?.replyRate ?? 0)} reply rate`}
                        className="block size-7 rounded-[4px] border border-border transition-transform duration-150 hover:scale-110 md:size-8"
                        style={{
                          backgroundColor:
                            intensity < 0.04
                              ? "var(--muted)"
                              : `color-mix(in oklab, var(--primary) ${Math.round(14 + intensity * 82)}%, var(--surface))`,
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>Less</span>
        {[0.08, 0.3, 0.55, 0.78, 1].map((v) => (
          <span
            key={v}
            className="size-3 rounded-[3px] border border-border"
            style={{ backgroundColor: `color-mix(in oklab, var(--primary) ${Math.round(14 + v * 82)}%, var(--surface))` }}
            aria-hidden
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
