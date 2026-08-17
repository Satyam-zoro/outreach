import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getFunnel,
  getInsights,
  previousRange,
  selectFacts,
  sum,
} from "./analytics";
import type {
  Channel,
  DateRange,
  Filters,
  Granularity,
  LeadSource,
  LeadStatus,
} from "./types";

export type RangePreset = "today" | "7d" | "30d" | "90d" | "ytd" | "custom";

function startOfToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function rangeForPreset(preset: Exclude<RangePreset, "custom">): DateRange {
  const to = startOfToday();
  const from = startOfToday();
  if (preset === "today") return { from, to };
  if (preset === "7d") from.setUTCDate(from.getUTCDate() - 6);
  if (preset === "30d") from.setUTCDate(from.getUTCDate() - 29);
  if (preset === "90d") from.setUTCDate(from.getUTCDate() - 89);
  if (preset === "ytd") return { from: new Date(Date.UTC(to.getUTCFullYear(), 0, 1)), to };
  return { from, to };
}

const emptyFilters = (): Filters => ({
  range: rangeForPreset("30d"),
  channels: [],
  campaignIds: [],
  memberIds: [],
  sources: [],
  statuses: [],
});

interface FiltersContextValue {
  filters: Filters;
  preset: RangePreset;
  granularity: Granularity;
  setGranularity: (g: Granularity) => void;
  setPreset: (p: Exclude<RangePreset, "custom">) => void;
  setRange: (range: DateRange) => void;
  toggle: <K extends "channels" | "campaignIds" | "memberIds" | "sources" | "statuses">(
    key: K,
    value: Filters[K][number],
  ) => void;
  clear: () => void;
  activeCount: number;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [preset, setPresetState] = useState<RangePreset>("30d");
  const [granularity, setGranularity] = useState<Granularity>("day");

  const setPreset = useCallback((p: Exclude<RangePreset, "custom">) => {
    setPresetState(p);
    const range = rangeForPreset(p);
    setFilters((f) => ({ ...f, range }));
    setGranularity(p === "ytd" ? "month" : p === "90d" ? "week" : "day");
  }, []);

  const setRange = useCallback((range: DateRange) => {
    setPresetState("custom");
    setFilters((f) => ({ ...f, range }));
  }, []);

  const toggle = useCallback<FiltersContextValue["toggle"]>((key, value) => {
    setFilters((f) => {
      const list = f[key] as unknown[];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...f, [key]: next } as Filters;
    });
  }, []);

  const clear = useCallback(() => {
    setFilters((f) => ({ ...emptyFilters(), range: f.range }));
  }, []);

  const activeCount =
    filters.channels.length +
    filters.campaignIds.length +
    filters.memberIds.length +
    filters.sources.length +
    filters.statuses.length;

  const value = useMemo(
    () => ({ filters, preset, granularity, setGranularity, setPreset, setRange, toggle, clear, activeCount }),
    [filters, preset, granularity, setPreset, setRange, toggle, clear, activeCount],
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used inside <FiltersProvider>");
  return ctx;
}

/** Derived analytics for the current filter selection. */
export function useAnalytics() {
  const { filters, granularity } = useFilters();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setVersion((v) => v + 1);
    window.addEventListener("pulse-notion-synced", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("pulse-notion-synced", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return useMemo(() => {
    const facts = selectFacts(filters);
    const prevFacts = selectFacts(filters, previousRange(filters.range));
    const totals = sum(facts);
    const previousTotals = sum(prevFacts);
    return {
      filters,
      granularity,
      facts,
      prevFacts,
      totals,
      previousTotals,
      funnel: getFunnel(totals, previousTotals),
      insights: getInsights(filters),
      hasData: facts.length > 0 && totals.contacted > 0,
    };
  }, [filters, granularity, version]);
}

export type { Channel, LeadSource, LeadStatus };
