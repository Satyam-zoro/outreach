import type { ReactNode } from "react";

import { CountUp, DeltaBadge } from "@/components/pulse/primitives";
import { cn } from "@/lib/utils";

export interface KpiProps {
  label: string;
  value: number;
  format?: (value: number) => string;
  delta?: number;
  emphasis?: "primary" | "default" | "quiet";
  hint?: string;
  spark?: ReactNode;
  invertDelta?: boolean;
}

export function KpiCard({
  label,
  value,
  format,
  delta,
  emphasis = "default",
  hint,
  spark,
  invertDelta = false,
}: KpiProps) {
  return (
    <article
      className={cn(
        "group relative flex flex-col justify-between gap-3 overflow-hidden rounded-xl border border-border p-4 transition-[background-color,border-color,transform] duration-200",
        emphasis === "primary" && "bg-card ring-1 ring-primary/20 sm:p-5",
        emphasis === "default" && "bg-card",
        emphasis === "quiet" && "bg-surface",
        "hover:border-border-strong hover:bg-elevated",
      )}
    >
      {emphasis === "primary" ? (
        <span className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary to-transparent opacity-70" aria-hidden />
      ) : null}
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">{label}</h3>
        {delta !== undefined ? <DeltaBadge value={delta} invert={invertDelta} /> : null}
      </header>
      <div>
        <p
          className={cn(
            "stat",
            emphasis === "primary" ? "text-[1.9rem] xl:text-[2.3rem]" : emphasis === "quiet" ? "text-2xl" : "text-[1.6rem] xl:text-3xl",
          )}
        >
          <CountUp value={value} {...(format ? { format } : {})} />
        </p>
        {hint ? <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
      {spark ? <div className="-mx-1 h-10">{spark}</div> : null}
    </article>
  );
}
