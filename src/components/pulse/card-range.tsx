import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { previousRange, selectFacts, sum } from "@/lib/pulse/analytics";
import { rangeForPreset, useFilters } from "@/lib/pulse/filters";
import { cn } from "@/lib/utils";

export type CardPreset = "today" | "7d" | "30d" | "90d" | "ytd";

const presets: { id: CardPreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "ytd", label: "This year" },
];

export function CardRangeMenu({
  preset,
  onChange,
}: {
  preset: CardPreset;
  onChange: (p: CardPreset) => void;
}) {
  const label = presets.find((p) => p.id === preset)!.label;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {label}
          <ChevronDown className="size-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent",
              preset === p.id && "bg-primary-soft text-primary",
            )}
          >
            {p.label}
            {preset === p.id ? <Check className="size-4" aria-hidden /> : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Per-card date scope. Inherits the global channel/campaign/member filters
 * but owns its own range, exactly like the QuickBooks overview cards.
 */
export function useCardRange(initial: CardPreset = "30d") {
  const { filters } = useFilters();
  const [preset, setPreset] = useState<CardPreset>(initial);

  const data = useMemo(() => {
    const range = rangeForPreset(preset);
    const scoped = { ...filters, range };
    const facts = selectFacts(scoped);
    const prevFacts = selectFacts(scoped, previousRange(range));
    return { range, facts, prevFacts, totals: sum(facts), previousTotals: sum(prevFacts) };
  }, [filters, preset]);

  return {
    ...data,
    preset,
    setPreset,
    label: presets.find((p) => p.id === preset)!.label,
    control: <CardRangeMenu preset={preset} onChange={setPreset} />,
  };
}
