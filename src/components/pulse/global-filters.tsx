import { CalendarDays, Check, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { campaigns, team } from "@/lib/pulse/data";
import { formatRange } from "@/lib/pulse/analytics";
import { useFilters, type RangePreset } from "@/lib/pulse/filters";
import { CHANNELS, type Channel, type LeadSource } from "@/lib/pulse/types";
import { cn } from "@/lib/utils";

const presets: { id: Exclude<RangePreset, "custom">; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "ytd", label: "This year" },
];

const SOURCES: LeadSource[] = ["Manual", "Scraped", "Referral", "Inbound", "List Purchase"];

export function DateRangeControl() {
  const { filters, preset, setPreset, setRange } = useFilters();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-border bg-surface">
          <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
          <span className="num text-xs">{formatRange(filters.range)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="grid gap-1">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={cn(
                "flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                preset === p.id && "bg-primary-soft text-primary",
              )}
            >
              {p.label}
              {preset === p.id ? <Check className="size-4" aria-hidden /> : null}
            </button>
          ))}
        </div>
        <Separator className="my-2" />
        <div className="grid gap-2 px-1 pb-1">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Custom range</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              aria-label="Start date"
              value={filters.range.from.toISOString().slice(0, 10)}
              onChange={(e) =>
                e.target.value && setRange({ from: new Date(`${e.target.value}T00:00:00Z`), to: filters.range.to })
              }
              className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs num"
            />
            <input
              type="date"
              aria-label="End date"
              value={filters.range.to.toISOString().slice(0, 10)}
              onChange={(e) =>
                e.target.value && setRange({ from: filters.range.from, to: new Date(`${e.target.value}T00:00:00Z`) })
              }
              className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs num"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterSection<T extends string>({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: { value: T; label: string }[];
  selected: readonly T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{title}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              aria-pressed={active}
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition-colors",
                active
                  ? "border-primary/40 bg-primary-soft text-primary"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FilterControl() {
  const { filters, toggle, clear, activeCount } = useFilters();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-border bg-surface">
          <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden />
          <span className="text-xs">Filters</span>
          {activeCount > 0 ? (
            <span className="num rounded bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3.5">
        <FilterSection
          title="Channel"
          options={CHANNELS.map((c) => ({ value: c, label: c }))}
          selected={filters.channels as Channel[]}
          onToggle={(v) => toggle("channels", v)}
        />
        <FilterSection
          title="Campaign"
          options={campaigns.map((c) => ({ value: c.id, label: c.name.split(" — ")[0]! }))}
          selected={filters.campaignIds}
          onToggle={(v) => toggle("campaignIds", v)}
        />
        <FilterSection
          title="Team member"
          options={team.map((m) => ({ value: m.id, label: m.name.split(" ")[0]! }))}
          selected={filters.memberIds}
          onToggle={(v) => toggle("memberIds", v)}
        />
        <FilterSection
          title="Lead source"
          options={SOURCES.map((s) => ({ value: s, label: s }))}
          selected={filters.sources as LeadSource[]}
          onToggle={(v) => toggle("sources", v)}
        />
        {activeCount > 0 ? (
          <Button variant="ghost" size="sm" className="w-full justify-center gap-2" onClick={clear}>
            <X className="size-3.5" aria-hidden />
            Clear all filters
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function GranularityToggle() {
  const { granularity, setGranularity } = useFilters();
  const options: { id: "day" | "week" | "month"; label: string }[] = [
    { id: "day", label: "Daily" },
    { id: "week", label: "Weekly" },
    { id: "month", label: "Monthly" },
  ];
  return (
    <div className="inline-flex rounded-md border border-border bg-surface p-0.5" role="group" aria-label="Granularity">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setGranularity(o.id)}
          aria-pressed={granularity === o.id}
          className={cn(
            "rounded px-2.5 py-1 text-xs transition-colors",
            granularity === o.id ? "bg-elevated text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
