import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import { number as fmtNumber } from "@/lib/pulse/analytics";

/* ------------------------------------------------------------------ count up */

function useHasMotion() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return ok;
}

interface CountUpProps {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
}

/** Smoothly rolls from the previous value to the next one. */
export function CountUp({ value, format = fmtNumber, duration = 620, className }: CountUpProps) {
  const motion = useHasMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    if (!motion) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    if (from === value) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, motion]);

  return (
    <span className={cn("num", className)} suppressHydrationWarning>
      {format(display)}
    </span>
  );
}

/* --------------------------------------------------------------------- delta */

export function DeltaBadge({
  value,
  invert = false,
  label,
  className,
}: {
  value: number;
  invert?: boolean;
  label?: string;
  className?: string;
}) {
  const flat = Math.abs(value) < 0.001;
  const good = invert ? value < 0 : value > 0;
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium num",
        flat ? "text-muted-foreground" : good ? "text-positive" : "text-negative",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {flat ? "0.0%" : `${(Math.abs(value) * 100).toFixed(1)}%`}
      {label ? <span className="text-muted-foreground font-normal">{label}</span> : null}
    </span>
  );
}

/* --------------------------------------------------------------------- panel */

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("panel overflow-hidden", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold tracking-tight">{title}</h2> : null}
            {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      )}
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/* --------------------------------------------------------------------- chips */

const toneClass = {
  neutral: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary-soft text-primary border-primary/30",
  positive: "bg-positive/12 text-positive border-positive/25",
  negative: "bg-negative/12 text-negative border-negative/25",
  warning: "bg-warning/12 text-warning border-warning/25",
  insight: "bg-insight/12 text-insight border-insight/25",
} as const;

export type Tone = keyof typeof toneClass;

export function Chip({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ tone = "neutral" }: { tone?: Tone }) {
  const color = {
    neutral: "bg-muted-foreground",
    primary: "bg-primary",
    positive: "bg-positive",
    negative: "bg-negative",
    warning: "bg-warning",
    insight: "bg-insight",
  }[tone];
  return <span className={cn("size-1.5 shrink-0 rounded-full", color)} aria-hidden />;
}

/* ---------------------------------------------------------------- in-view */

/** Reveals children once they scroll into view (used for chart entrances). */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          obs.disconnect();
        }
      },
      { rootMargin: "-40px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("transition-[opacity,transform] duration-300 ease-out", seen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------ page heading */

export function PageIntro({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {actions}
    </div>
  );
}
