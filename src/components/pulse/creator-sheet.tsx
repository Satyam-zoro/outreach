import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Download, Plus, RefreshCw, RotateCcw, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  OUTREACH_STAGES,
  toCsv,
  useCreatorSheet,
  type CellValue,
  type ColumnKind,
  type SheetColumn,
  type SheetKind,
} from "@/lib/pulse/creator-sheet";
import { setCustomLeads } from "@/lib/pulse/data";
import { getStoredNotionConfig, getStoredNotionLeads, syncNotionDatabases } from "@/lib/pulse/notion";
import { cn } from "@/lib/utils";

const stageTone: Record<string, string> = {
  "Not contacted": "bg-muted text-muted-foreground",
  "DM sent": "bg-primary-soft text-primary",
  Replied: "bg-info/12 text-info",
  "In talks": "bg-warning/15 text-warning",
  Closed: "bg-success/15 text-success",
  Passed: "bg-danger/12 text-danger",
};

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="panel px-4 py-3">
      <p className="text-[11px] font-medium tracking-[0.1em] text-muted-foreground uppercase">{label}</p>
      <p className="stat mt-1 text-xl">{value}</p>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ColumnMenu({
  col,
  onRename,
  onDelete,
  onMove,
}: {
  col: SheetColumn;
  onRename: (label: string) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center justify-between gap-1 rounded px-1 py-0.5 text-left hover:bg-accent">
        <span className="truncate">{col.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground">Edit column</DropdownMenuLabel>
        <div className="px-2 pb-2">
          <Input
            defaultValue={col.label}
            onBlur={(e) => onRename(e.target.value.trim() || col.label)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="h-8 text-xs"
          />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onMove(-1)}>
          <ChevronLeft className="size-3.5" /> Move left
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMove(1)}>
          <ChevronRight className="size-3.5" /> Move right
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-danger focus:text-danger">
          <Trash2 className="size-3.5" /> Delete column
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Cell({
  col,
  value,
  onChange,
}: {
  col: SheetColumn;
  value: CellValue | undefined;
  onChange: (v: CellValue) => void;
}) {
  if (col.kind === "check") {
    return (
      <label className="flex h-full items-center justify-center">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 rounded border-border accent-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
      </label>
    );
  }

  if (col.kind === "select") {
    return (
      <select
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-xs focus:border-border focus:bg-background focus:outline-none",
          col.id === "stage" && stageTone[String(value ?? "")] && "font-medium",
        )}
      >
        {(col.options || []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  if (col.kind === "date") {
    return (
      <input
        type="date"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-xs text-muted-foreground focus:border-border focus:bg-background focus:text-foreground focus:outline-none"
      />
    );
  }

  if (col.kind === "number") {
    return (
      <input
        type="number"
        value={value === undefined || value === null ? "" : Number(value)}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className="num h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-xs text-right focus:border-border focus:bg-background focus:outline-none"
      />
    );
  }

  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-xs focus:border-border focus:bg-background focus:outline-none"
    />
  );
}

function AddColumnButton({ onAdd }: { onAdd: (label: string, kind: ColumnKind, options?: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<ColumnKind>("text");
  const [options, setOptions] = useState("");

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-xs">
          <Plus className="size-3.5" /> Column
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 space-y-2 p-3">
        <DropdownMenuLabel className="p-0 text-xs font-semibold">Add new column</DropdownMenuLabel>
        <div>
          <label className="text-[10px] text-muted-foreground">Column title</label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Rate card, Region…"
            className="mt-0.5 h-8 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Type</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ColumnKind)}
            className="mt-0.5 h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="select">Select (dropdown)</option>
            <option value="date">Date</option>
            <option value="check">Checkbox</option>
          </select>
        </div>
        {kind === "select" ? (
          <div>
            <label className="text-[10px] text-muted-foreground">Options (comma separated)</label>
            <Input
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder="e.g. Hot, Warm, Cold"
              className="mt-0.5 h-8 text-xs"
            />
          </div>
        ) : null}
        <Button
          size="sm"
          className="w-full text-xs"
          disabled={!label.trim()}
          onClick={() => {
            onAdd(
              label.trim(),
              kind,
              kind === "select"
                ? options
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                : undefined,
            );
            setLabel("");
            setOptions("");
            setKind("text");
            setOpen(false);
          }}
        >
          Add column
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CreatorSheet({ kind }: { kind: SheetKind }) {
  const sheet = useCreatorSheet(kind);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<string>("All");

  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Auto-Sync on Mount & Every 3 Seconds
  useEffect(() => {
    const config = getStoredNotionConfig();
    if (!config.apiKey) return;

    let isSubscribed = true;

    const runBackgroundSync = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await syncNotionDatabases(config);
        if (isSubscribed) {
          const combined = getStoredNotionLeads();
          if (combined) setCustomLeads(combined);
        }
      } catch {}
    };

    // Initial sync on page open
    void runBackgroundSync();

    // 3-second recurring background interval
    const intervalId = setInterval(() => {
      void runBackgroundSync();
    }, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleSyncNotion = async () => {
    setIsSyncing(true);
    try {
      const config = getStoredNotionConfig();
      if (!config.apiKey) {
        toast.error("Notion API Key not configured. Please add your key on the Integrations page.");
        return;
      }
      const result = await syncNotionDatabases(config);
      const combined = getStoredNotionLeads();
      if (combined) setCustomLeads(combined);
      toast.success(`Synced! ${result.shortCount} Short & ${result.longCount} Long creators updated.`);
    } catch (err: any) {
      toast.error(`Notion Sync Failed: ${err.message || String(err)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sheet.data.rows
      .filter((r) => {
        if (stage !== "All" && r.cells["stage"] !== stage) return false;
        if (!q) return true;
        return Object.values(r.cells).some((v) => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => (Number(a.cells["#"]) || 0) - (Number(b.cells["#"]) || 0));
  }, [sheet.data.rows, query, stage]);

  const download = () => {
    const blob = new Blob([toCsv(sheet.data)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulse-${kind}-form-creators.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const money = (n: number) => `$${n.toLocaleString("en-US")}`;
  const rate = (n: number) => (sheet.stats.total ? `${Math.round((n / sheet.stats.total) * 100)}%` : "0%");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Creators" value={String(sheet.stats.total)} hint="Rows in this sheet" />
        <StatTile label="DM'd" value={String(sheet.stats.dmed)} hint={`${rate(sheet.stats.dmed)} of list`} />
        <StatTile label="Replied" value={String(sheet.stats.replied)} hint={`${rate(sheet.stats.replied)} of list`} />
        <StatTile label="Closed" value={String(sheet.stats.closed)} hint={`${rate(sheet.stats.closed)} of list`} />
        <StatTile label="Booked value" value={money(sheet.stats.revenue)} hint="Sum of deal column" />
      </div>

      <div className="panel">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search creators, handles, notes…"
              className="h-8 pl-8 text-xs"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            aria-label="Filter by stage"
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="All">All stages</option>
            {OUTREACH_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            onClick={handleSyncNotion}
            disabled={isSyncing}
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing..." : "Auto-Sync (3s)"}
          </Button>

          <Button variant="outline" size="sm" className="gap-1.5" onClick={sheet.addRow}>
            <Plus className="size-3.5" /> Creator
          </Button>
          <AddColumnButton onAdd={sheet.addColumn} />
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={download}>
            <Download className="size-3.5" /> CSV
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={sheet.reset}>
            <RotateCcw className="size-3.5" /> Reset
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1560px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="w-9 px-2 py-2 text-left text-[10px] font-medium text-muted-foreground">#</th>
                {sheet.data.columns.map((col) => (
                  <th
                    key={col.id}
                    style={col.width ? { minWidth: col.width } : undefined}
                    className="px-2 py-2 text-left text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
                  >
                    <ColumnMenu
                      col={col}
                      onRename={(label) => sheet.renameColumn(col.id, label)}
                      onDelete={() => sheet.deleteColumn(col.id)}
                      onMove={(dir) => sheet.moveColumn(col.id, dir)}
                    />
                  </th>
                ))}
                <th className="w-16 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="num px-2 py-1 text-[10px] text-muted-foreground">{row.cells["#"] ?? i + 1}</td>
                  {sheet.data.columns.map((col) => (
                    <td key={col.id} className="px-1.5 py-1 align-middle">
                      <Cell col={col} value={row.cells[col.id]} onChange={(v) => sheet.updateCell(row.id, col.id, v)} />
                    </td>
                  ))}
                  <td className="px-1 py-1">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        type="button"
                        onClick={() => sheet.duplicateRow(row.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Duplicate row"
                      >
                        <Copy className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => sheet.deleteRow(row.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                        aria-label="Delete row"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={sheet.data.columns.length + 2} className="px-3 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <p className="text-sm font-medium text-foreground">No creators in this sheet yet.</p>
                      <p className="text-xs text-muted-foreground">Click below to add your first creator or sync from Notion.</p>
                      <div className="flex items-center gap-2 pt-1">
                        <Button size="sm" className="gap-1.5" onClick={sheet.addRow}>
                          <Plus className="size-4" /> Add Creator Row
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary" onClick={handleSyncNotion} disabled={isSyncing}>
                          <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} /> Sync Notion
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          <button type="button" onClick={sheet.addRow} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <Plus className="size-3.5" /> Add creator row
          </button>
          <span>
            Showing {rows.length} of {sheet.data.rows.length} · edits save automatically to this browser
          </span>
        </div>
      </div>
    </div>
  );
}
