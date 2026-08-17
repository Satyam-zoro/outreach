import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { money, number, pct, type BreakdownRow } from "@/lib/pulse/analytics";
import { cn } from "@/lib/utils";

type SortKey = keyof Pick<BreakdownRow, "sent" | "replies" | "replyRate" | "positive" | "calls" | "clients" | "revenue" | "roi">;

const columns: { key: SortKey; label: string; format: (row: BreakdownRow) => string }[] = [
  { key: "sent", label: "Sent", format: (r) => number(r.sent) },
  { key: "replies", label: "Replies", format: (r) => number(r.replies) },
  { key: "replyRate", label: "Reply rate", format: (r) => pct(r.replyRate) },
  { key: "positive", label: "Positive", format: (r) => number(r.positive) },
  { key: "calls", label: "Calls", format: (r) => number(r.calls) },
  { key: "clients", label: "Clients", format: (r) => number(r.clients) },
  { key: "revenue", label: "Revenue", format: (r) => money(r.revenue) },
];

export function BreakdownTable({
  rows,
  labelHeader = "Channel",
  showRoi = false,
  rank = false,
}: {
  rows: BreakdownRow[];
  labelHeader?: string;
  showRoi?: boolean;
  rank?: boolean;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "revenue", dir: "desc" });

  const cols = useMemo(
    () => (showRoi ? [...columns, { key: "roi" as SortKey, label: "ROI", format: (r: BreakdownRow) => pct(r.roi ?? 0, 0) }] : columns),
    [showRoi],
  );

  const sorted = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      const av = (a[sort.key] ?? 0) as number;
      const bv = (b[sort.key] ?? 0) as number;
      return sort.dir === "desc" ? bv - av : av - bv;
    });
    return list;
  }, [rows, sort]);

  const max = Math.max(...rows.map((r) => r.revenue), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[840px] border-collapse text-sm">
        <caption className="sr-only">{labelHeader} performance metrics, sortable by column</caption>
        <thead>
          <tr className="border-b border-border text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
            <th scope="col" className="py-2.5 pr-4 text-left font-medium">
              {labelHeader}
            </th>
            {cols.map((c) => {
              const active = sort.key === c.key;
              return (
                <th key={c.key} scope="col" className="py-2.5 pl-4 text-right font-medium">
                  <button
                    type="button"
                    onClick={() =>
                      setSort((s) => ({ key: c.key, dir: s.key === c.key && s.dir === "desc" ? "asc" : "desc" }))
                    }
                    className={cn(
                      "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                      active && "text-foreground",
                    )}
                    aria-sort={active ? (sort.dir === "desc" ? "descending" : "ascending") : "none"}
                  >
                    {c.label}
                    {active ? (
                      sort.dir === "desc" ? (
                        <ArrowDown className="size-3" aria-hidden />
                      ) : (
                        <ArrowUp className="size-3" aria-hidden />
                      )
                    ) : null}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={cols.length + 1} className="py-8 text-center text-xs text-muted-foreground">
                No outreach activity or closed deals recorded yet for this period.
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr key={row.id} className="group border-b border-border/70 transition-colors last:border-0 hover:bg-elevated">
                <th scope="row" className="py-3 pr-4 text-left font-normal">
                  <span className="flex items-center gap-3">
                    {rank ? (
                      <span className="num w-6 text-xs text-muted-foreground">{(i + 1).toString().padStart(2, "0")}</span>
                    ) : null}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{row.label}</span>
                      {row.sublabel ? <span className="block text-xs text-muted-foreground">{row.sublabel}</span> : null}
                    </span>
                  </span>
                </th>
                {cols.map((c) => (
                  <td key={c.key} className="num py-3 pl-4 text-right whitespace-nowrap">
                    {c.key === "revenue" ? (
                      <span className="inline-flex flex-col items-end gap-1">
                        <span>{c.format(row)}</span>
                        <span className="h-0.5 w-16 overflow-hidden rounded-full bg-border">
                          <span
                            className="block h-full bg-primary transition-[width] duration-500"
                            style={{ width: `${(row.revenue / max) * 100}%` }}
                          />
                        </span>
                      </span>
                    ) : (
                      c.format(row)
                    )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
