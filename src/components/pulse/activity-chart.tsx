import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { compactNumber, formatDayLabel, number, pct, type SeriesPoint } from "@/lib/pulse/analytics";

const seriesMeta = [
  { key: "sent", label: "DMs & emails sent", color: "var(--chart-1)" },
  { key: "replies", label: "Replies", color: "var(--chart-2)" },
  { key: "positive", label: "Positive replies", color: "var(--chart-3)" },
] as const;

interface TooltipPayloadItem {
  payload?: SeriesPoint;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="min-w-[208px] rounded-lg border border-border-strong bg-popover/95 p-3 shadow-lift backdrop-blur">
      <p className="text-xs font-medium">{formatDayLabel(point.date)}</p>
      <dl className="mt-2.5 space-y-1.5">
        {seriesMeta.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-6 text-xs">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <span className="size-1.5 rounded-full" style={{ background: s.color }} aria-hidden />
              {s.key === "sent" ? "Sent" : s.key === "replies" ? "Replies" : "Positive"}
            </dt>
            <dd className="num font-medium">{number(point[s.key])}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2 text-xs">
        <span className="text-muted-foreground">Reply rate</span>
        <span className="num font-medium text-positive">{pct(point.replyRate, 2)}</span>
      </div>
    </div>
  );
}

export function ActivityChart({
  data,
  height = 300,
  onHoverPoint,
  compact = false,
}: {
  data: SeriesPoint[];
  height?: number;
  onHoverPoint?: (point: SeriesPoint | null) => void;
  compact?: boolean;
}) {
  const ticks = useMemo(() => {
    if (data.length <= 8) return data.map((d) => d.label);
    const step = Math.ceil(data.length / 7);
    return data.filter((_, i) => i % step === 0).map((d) => d.label);
  }, [data]);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: compact ? -24 : -12 }}
          onMouseMove={(state: { activePayload?: TooltipPayloadItem[] }) =>
            onHoverPoint?.(state?.activePayload?.[0]?.payload ?? null)
          }
          onMouseLeave={() => onHoverPoint?.(null)}
        >
          <defs>
            <linearGradient id="pulse-sent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            ticks={ticks}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={(v: number) => compactNumber(v)}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="sent"
            stroke="var(--chart-1)"
            strokeWidth={1.75}
            fill="url(#pulse-sent)"
            animationDuration={480}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
            name="Sent"
          />
          <Line
            type="monotone"
            dataKey="replies"
            stroke="var(--chart-2)"
            strokeWidth={1.75}
            dot={false}
            animationDuration={520}
            activeDot={{ r: 3, strokeWidth: 0 }}
            name="Replies"
          />
          <Line
            type="monotone"
            dataKey="positive"
            stroke="var(--chart-3)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            animationDuration={560}
            activeDot={{ r: 3, strokeWidth: 0 }}
            name="Positive"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-4">
      {seriesMeta.map((s) => (
        <li key={s.key} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  );
}
