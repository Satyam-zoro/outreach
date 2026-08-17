/**
 * Editable creator tracker sheets (short-form / long-form).
 * Client-side, localStorage-backed so the sheet survives reloads and can be
 * swapped for a database table later without touching the UI.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import { archiveNotionPage, createNotionPage, writeBackCellToNotion } from "./notion";

export type ColumnKind = "text" | "select" | "number" | "date" | "check";

export interface SheetColumn {
  id: string;
  label: string;
  kind: ColumnKind;
  options?: string[];
  width?: number;
}

export type CellValue = string | number | boolean;
export interface SheetRow {
  id: string;
  cells: Record<string, CellValue>;
}

export interface SheetData {
  columns: SheetColumn[];
  rows: SheetRow[];
}

export type SheetKind = "short" | "long";

export const OUTREACH_STAGES = ["Not contacted", "DM sent", "Replied", "In talks", "Closed", "Passed"] as const;
export type OutreachStage = (typeof OUTREACH_STAGES)[number];

const uid = () => Math.random().toString(36).slice(2, 9);

function baseColumns(kind: SheetKind): SheetColumn[] {
  const platform: SheetColumn =
    kind === "short"
      ? { id: "platform", label: "Platform", kind: "select", options: ["Instagram", "TikTok", "YouTube Shorts", "X"], width: 150 }
      : { id: "platform", label: "Platform", kind: "select", options: ["YouTube", "Podcast", "Twitch", "Newsletter"], width: 150 };

  const format: SheetColumn =
    kind === "short"
      ? { id: "niche", label: "Niche", kind: "select", options: ["Fitness", "Finance", "Comedy", "Beauty", "Tech"], width: 140 }
      : { id: "niche", label: "Niche", kind: "select", options: ["Business", "Education", "Tech Review", "Interview", "Documentary"], width: 150 };

  return [
    { id: "creator", label: "Creator", kind: "text", width: 200 },
    { id: "handle", label: "Handle", kind: "text", width: 150 },
    platform,
    format,
    {
      id: "followers",
      label: kind === "short" ? "Followers" : "Subscribers",
      kind: "number",
    },
    { id: "stage", label: "Stage", kind: "select", options: [...OUTREACH_STAGES], width: 190 },
    { id: "dmSent", label: "DM'd", kind: "check" },
    { id: "replied", label: "Replied", kind: "check" },
    { id: "closed", label: "Closed", kind: "check" },
    { id: "dealValue", label: "Deal ($)", kind: "number" },
    { id: "lastTouch", label: "Last touch", kind: "date", width: 140 },
    { id: "owner", label: "Owner", kind: "text" },
    { id: "notes", label: "Notes", kind: "text", width: 240 },
  ];
}

export function emptyCell(kind: ColumnKind): CellValue {
  if (kind === "check") return false;
  if (kind === "number") return 0;
  return "";
}

export function defaultSheet(kind: SheetKind): SheetData {
  return { columns: baseColumns(kind), rows: [] };
}

const storageKey = (kind: SheetKind) => `pulse-creator-sheet-${kind}`;

const PENDING_EDIT_TTL_MS = 8000;
const TOMBSTONE_TTL_MS = 20000;

const pendingCellEdits = new Map<string, { value: CellValue; timestamp: number }>();
const deletedRowTombstones = new Map<string, number>();

export function recordPendingCellEdit(rowId: string, colId: string, value: CellValue) {
  if (!rowId || !colId) return;
  pendingCellEdits.set(`${rowId}:${colId}`, { value, timestamp: Date.now() });
}

export function recordDeletedRow(rowId: string) {
  if (!rowId) return;
  deletedRowTombstones.set(rowId, Date.now());
}

export function applyOptimisticOverlay(rows: SheetRow[]): SheetRow[] {
  if (!Array.isArray(rows)) return [];
  const now = Date.now();

  // 1. Filter out tombstoned (recently deleted) rows
  const liveRows = rows.filter((r) => {
    const deletedAt = deletedRowTombstones.get(r.id);
    if (deletedAt && now - deletedAt < TOMBSTONE_TTL_MS) {
      return false;
    }
    if (deletedAt && now - deletedAt >= TOMBSTONE_TTL_MS) {
      deletedRowTombstones.delete(r.id);
    }
    return true;
  });

  // 2. Overlay pending cell edits
  return liveRows.map((r) => {
    let hasEdit = false;
    const updatedCells = { ...r.cells };

    for (const [key, edit] of pendingCellEdits.entries()) {
      if (now - edit.timestamp > PENDING_EDIT_TTL_MS) {
        pendingCellEdits.delete(key);
        continue;
      }
      const separatorIdx = key.indexOf(":");
      if (separatorIdx > 0) {
        const editRowId = key.slice(0, separatorIdx);
        const editColId = key.slice(separatorIdx + 1);
        if (editRowId === r.id && editColId) {
          updatedCells[editColId] = edit.value;
          hasEdit = true;
        }
      }
    }

    return hasEdit ? { ...r, cells: updatedCells } : r;
  });
}

export function useCreatorSheet(kind: SheetKind) {
  const [data, setData] = useState<SheetData>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(storageKey(kind));
        if (raw) {
          const parsed = JSON.parse(raw) as SheetData;
          if (Array.isArray(parsed?.columns) && Array.isArray(parsed?.rows)) {
            return {
              columns: parsed.columns,
              rows: applyOptimisticOverlay(parsed.rows),
            };
          }
        }
      } catch {}
    }
    return defaultSheet(kind);
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(kind));
      if (raw) {
        const parsed = JSON.parse(raw) as SheetData;
        if (Array.isArray(parsed?.columns) && Array.isArray(parsed?.rows)) {
          setData({
            columns: parsed.columns,
            rows: applyOptimisticOverlay(parsed.rows),
          });
        }
      }
    } catch {}
    setHydrated(true);
  }, [kind]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey(kind), JSON.stringify(data));
  }, [data, hydrated, kind]);

  const reloadFromStorage = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(kind));
      if (raw) {
        const parsed = JSON.parse(raw) as SheetData;
        if (Array.isArray(parsed?.columns) && Array.isArray(parsed?.rows)) {
          setData({
            columns: parsed.columns,
            rows: applyOptimisticOverlay(parsed.rows),
          });
        }
      }
    } catch {}
  }, [kind]);

  useEffect(() => {
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail) {
        const rawRows = kind === "short" ? detail.shortRows : detail.longRows;
        if (Array.isArray(rawRows)) {
          const rows = applyOptimisticOverlay(rawRows);
          if (rows.length > 0) {
            setData((prev) => ({
              columns: prev.columns,
              rows,
            }));
            return;
          }
        }
      }
      reloadFromStorage();
    };
    window.addEventListener("pulse-notion-synced", handleSync);
    return () => window.removeEventListener("pulse-notion-synced", handleSync);
  }, [kind, reloadFromStorage]);

  const updateCell = useCallback((rowId: string, colId: string, value: CellValue) => {
    // 1. Optimistic record
    recordPendingCellEdit(rowId, colId, value);

    // 2. 2-Way Notion Sync write-back
    void writeBackCellToNotion(rowId, colId, value);

    setData((d) => ({
      ...d,
      rows: d.rows.map((r) => {
        if (r.id !== rowId) return r;
        const cells = { ...r.cells, [colId]: value };

        // 1. If user changes the stage dropdown
        if (colId === "stage" && typeof value === "string") {
          const dm = value !== "Not contacted";
          const rep = ["Replied", "In talks", "Closed"].includes(value);
          const cls = value === "Closed";
          cells["dmSent"] = dm;
          cells["replied"] = rep;
          cells["closed"] = cls;
          recordPendingCellEdit(rowId, "dmSent", dm);
          recordPendingCellEdit(rowId, "replied", rep);
          recordPendingCellEdit(rowId, "closed", cls);
          recordPendingCellEdit(rowId, "stage", value);
          void writeBackCellToNotion(rowId, "dmSent", dm);
          void writeBackCellToNotion(rowId, "replied", rep);
          void writeBackCellToNotion(rowId, "closed", cls);
        }

        // 2. If user toggles the DM'd checkbox
        if (colId === "dmSent") {
          const isDm = Boolean(value);
          if (!isDm) {
            cells["replied"] = false;
            cells["closed"] = false;
            cells["stage"] = "Not contacted";
            recordPendingCellEdit(rowId, "dmSent", false);
            recordPendingCellEdit(rowId, "replied", false);
            recordPendingCellEdit(rowId, "closed", false);
            recordPendingCellEdit(rowId, "stage", "Not contacted");
            void writeBackCellToNotion(rowId, "replied", false);
            void writeBackCellToNotion(rowId, "closed", false);
            void writeBackCellToNotion(rowId, "stage", "Not contacted");
          } else {
            if (cells["stage"] === "Not contacted") {
              cells["stage"] = "DM sent";
              recordPendingCellEdit(rowId, "stage", "DM sent");
              void writeBackCellToNotion(rowId, "stage", "DM sent");
            }
          }
        }

        // 3. If user toggles the Replied checkbox
        if (colId === "replied") {
          const isReplied = Boolean(value);
          if (isReplied) {
            cells["dmSent"] = true;
            recordPendingCellEdit(rowId, "dmSent", true);
            recordPendingCellEdit(rowId, "replied", true);
            void writeBackCellToNotion(rowId, "dmSent", true);
            if (cells["stage"] === "Not contacted" || cells["stage"] === "DM sent") {
              cells["stage"] = "Replied";
              recordPendingCellEdit(rowId, "stage", "Replied");
              void writeBackCellToNotion(rowId, "stage", "Replied");
            }
          } else {
            cells["closed"] = false;
            recordPendingCellEdit(rowId, "replied", false);
            recordPendingCellEdit(rowId, "closed", false);
            void writeBackCellToNotion(rowId, "closed", false);
            if (cells["stage"] === "Replied" || cells["stage"] === "In talks" || cells["stage"] === "Closed") {
              cells["stage"] = "DM sent";
              recordPendingCellEdit(rowId, "stage", "DM sent");
              void writeBackCellToNotion(rowId, "stage", "DM sent");
            }
          }
        }

        // 4. If user toggles the Closed checkbox
        if (colId === "closed") {
          const isClosed = Boolean(value);
          if (isClosed) {
            cells["dmSent"] = true;
            cells["replied"] = true;
            cells["stage"] = "Closed";
            recordPendingCellEdit(rowId, "dmSent", true);
            recordPendingCellEdit(rowId, "replied", true);
            recordPendingCellEdit(rowId, "closed", true);
            recordPendingCellEdit(rowId, "stage", "Closed");
            void writeBackCellToNotion(rowId, "dmSent", true);
            void writeBackCellToNotion(rowId, "replied", true);
            void writeBackCellToNotion(rowId, "stage", "Closed");
          } else {
            if (cells["stage"] === "Closed") {
              cells["stage"] = "In talks";
              recordPendingCellEdit(rowId, "closed", false);
              recordPendingCellEdit(rowId, "stage", "In talks");
              void writeBackCellToNotion(rowId, "stage", "In talks");
            }
          }
        }

        return { ...r, cells };
      }),
    }));
  }, []);

  const addRow = useCallback(async () => {
    const maxRank = data.rows.reduce((max, r) => {
      const num = typeof r.cells["#"] === "number" ? r.cells["#"] : parseInt(String(r.cells["#"] || 0), 10);
      return Math.max(max, isNaN(num) ? 0 : num);
    }, 0);
    const nextRank = Math.max(data.rows.length + 1, maxRank + 1);

    const defaultPlatform = kind === "short" ? "Instagram" : "YouTube";
    const defaultNiche = kind === "short" ? "Fitness" : "Business";
    const today = new Date().toISOString().slice(0, 10);

    const initialCells: Record<string, CellValue> = {
      "#": nextRank,
      creator: "New Creator",
      handle: "@newcreator",
      platform: defaultPlatform,
      niche: defaultNiche,
      followers: 100000,
      stage: "Not contacted",
      dmSent: false,
      replied: false,
      closed: false,
      dealValue: 0,
      lastTouch: today,
      owner: "Satyam",
      notes: "",
    };

    data.columns.forEach((c) => {
      if (initialCells[c.id] === undefined) {
        initialCells[c.id] = emptyCell(c.kind);
      }
    });

    // 2-Way Notion Sync: Create new page in Notion live with full cell set and # rank
    const notionPageId = await createNotionPage(kind, initialCells, nextRank);
    const newId = notionPageId || uid();

    setData((d) => ({
      ...d,
      rows: [...d.rows, { id: newId, cells: initialCells }],
    }));
  }, [data.columns, data.rows, kind]);

  const duplicateRow = useCallback(async (rowId: string) => {
    const sourceRow = data.rows.find((r) => r.id === rowId);
    if (!sourceRow) return;

    const nextRank = data.rows.length + 1;
    const duplicatedCells = { ...sourceRow.cells, "#": nextRank, creator: `${sourceRow.cells.creator || "Creator"} (Copy)` };

    const notionPageId = await createNotionPage(kind, duplicatedCells, nextRank);
    const newId = notionPageId || uid();

    setData((d) => {
      const i = d.rows.findIndex((r) => r.id === rowId);
      if (i < 0) return d;
      const copy = { id: newId, cells: duplicatedCells };
      const rows = [...d.rows];
      rows.splice(i + 1, 0, copy);
      const reindexed = rows.map((r, idx) => {
        const rank = idx + 1;
        const cells = { ...r.cells, "#": rank };
        recordPendingCellEdit(r.id, "#", rank);
        if (r.id && !r.id.startsWith("uid_") && !r.id.startsWith("seed_")) {
          void writeBackCellToNotion(r.id, "#", rank);
        }
        return { ...r, cells };
      });
      return { ...d, rows: reindexed };
    });
  }, [data.rows, kind]);

  const deleteRow = useCallback((rowId: string) => {
    // 1. Record deletion tombstone to prevent polling resurrection
    recordDeletedRow(rowId);

    // 2. Archive page live in Notion
    void archiveNotionPage(rowId);

    // 3. Remove deleted row and re-index remaining rows (# = 1, 2, 3...) in Notion
    setData((d) => {
      const remaining = d.rows.filter((r) => r.id !== rowId);
      const reindexed = remaining.map((r, idx) => {
        const newRank = idx + 1;
        const cells = { ...r.cells, "#": newRank };
        recordPendingCellEdit(r.id, "#", newRank);
        if (r.id && !r.id.startsWith("uid_") && !r.id.startsWith("seed_")) {
          void writeBackCellToNotion(r.id, "#", newRank);
        }
        return { ...r, cells };
      });
      return { ...d, rows: reindexed };
    });
  }, []);

  const addColumn = useCallback((label: string, colKind: ColumnKind, options?: string[]) => {
    setData((d) => {
      const col: SheetColumn = { id: uid(), label, kind: colKind, ...(options?.length ? { options } : {}) };
      return {
        columns: [...d.columns, col],
        rows: d.rows.map((r) => ({ ...r, cells: { ...r.cells, [col.id]: emptyCell(colKind) } })),
      };
    });
  }, []);

  const renameColumn = useCallback((colId: string, label: string) => {
    setData((d) => ({ ...d, columns: d.columns.map((c) => (c.id === colId ? { ...c, label } : c)) }));
  }, []);

  const deleteColumn = useCallback((colId: string) => {
    setData((d) => ({
      columns: d.columns.filter((c) => c.id !== colId),
      rows: d.rows.map((r) => {
        const cells = { ...r.cells };
        delete cells[colId];
        return { ...r, cells };
      }),
    }));
  }, []);

  const moveColumn = useCallback((colId: string, dir: -1 | 1) => {
    setData((d) => {
      const i = d.columns.findIndex((c) => c.id === colId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.columns.length) return d;
      const columns = [...d.columns];
      const [c] = columns.splice(i, 1);
      columns.splice(j, 0, c!);
      return { ...d, columns };
    });
  }, []);

  const reset = useCallback(() => setData(defaultSheet(kind)), [kind]);

  const stats = useMemo(() => {
    const count = (id: string) => data.rows.filter((r) => r.cells[id] === true).length;
    const dmed = count("dmSent");
    const replied = count("replied");
    const closed = count("closed");
    const revenue = data.rows.reduce((s, r) => s + (Number(r.cells["dealValue"]) || 0), 0);
    return { total: data.rows.length, dmed, replied, closed, revenue };
  }, [data.rows]);

  return {
    data,
    hydrated,
    stats,
    updateCell,
    addRow,
    duplicateRow,
    deleteRow,
    addColumn,
    renameColumn,
    deleteColumn,
    moveColumn,
    reset,
  };
}

export function toCsv(data: SheetData): string {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["#", ...data.columns.map((c) => c.label)].map(esc).join(",");
  const body = data.rows
    .map((r, i) => [r.cells["#"] ?? i + 1, ...data.columns.map((c) => r.cells[c.id])].map(esc).join(","))
    .join("\n");
  return `${head}\n${body}`;
}
