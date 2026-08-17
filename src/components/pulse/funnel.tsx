import { useState } from "react";
import { ArrowDown } from "lucide-react";

import { delta, number, pct, type FunnelStage } from "@/lib/pulse/analytics";
import { DeltaBadge } from "@/components/pulse/primitives";
import { cn } from "@/lib/utils";

export function ConversionFunnel({
  stages,
  onSelectStage,
}: {
  stages: FunnelStage[];
  onSelectStage?: (stage: FunnelStage) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <ol className="space-y-1.5">
      {stages.map((stage, i) => {
        const active = hovered === stage.id;
        const change = i === 0 ? 0 : delta(stage.conversion, stage.previousConversion);
        return (
          <li key={stage.id}>
            {i > 0 ? (
              <div className="flex items-center gap-2 py-1 pl-1 text-[11px] text-muted-foreground">
                <ArrowDown className="size-3" aria-hidden />
                <span className="num">{pct(stage.conversion)}</span>
                <span>conversion</span>
                <span className="text-border-strong">·</span>
                <span className="num">{number(stage.dropOff)}</span>
                <span>dropped off</span>
              </div>
            ) : null}
            <button
              type="button"
              onMouseEnter={() => setHovered(stage.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(stage.id)}
              onBlur={() => setHovered(null)}
              onClick={() => onSelectStage?.(stage)}
              className={cn(
                "relative block w-full overflow-hidden rounded-lg border border-border bg-surface px-4 py-3 text-left transition-colors duration-150",
                active && "border-border-strong bg-elevated",
              )}
            >
              <span
                className="absolute inset-y-0 left-0 bg-primary/14 transition-[width] duration-500 ease-out"
                style={{ width: `${Math.max(stage.share * 100, 4)}%` }}
                aria-hidden
              />
              <span className="relative flex flex-wrap items-center justify-between gap-3">
                <span className="flex min-w-0 items-baseline gap-3">
                  <span className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    {stage.label}
                  </span>
                  <span className="stat text-xl">{number(stage.count)}</span>
                </span>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="num">{pct(stage.share)} of contacted</span>
                  {i > 0 ? <DeltaBadge value={change} label="vs prev" /> : null}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
