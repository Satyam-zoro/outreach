import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Clapperboard, Database, FileSpreadsheet, RefreshCw, Table2, Upload, Video } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chip, PageIntro, Panel, Reveal } from "@/components/pulse/primitives";
import { setCustomLeads } from "@/lib/pulse/data";
import {
  alignNotionDatabaseSchemas,
  diagnoseNotionDatabases,
  getLastSyncTime,
  getStoredNotionConfig,
  getStoredNotionLeads,
  saveNotionConfig,
  syncNotionDatabases,
} from "@/lib/pulse/notion";

export const Route = createFileRoute("/_shell/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations & Import — PULSE" },
      {
        name: "description",
        content: "Connect Notion, Instagram, Gmail, LinkedIn, WhatsApp, Slack, HubSpot and Google Sheets, or import outreach history from CSV.",
      },
      { property: "og:title", content: "Integrations & Import — PULSE" },
      { property: "og:description", content: "Bring every outreach channel into one analytics layer." },
    ],
  }),
  component: IntegrationsPage,
});

interface Integration {
  id: string;
  name: string;
  description: string;
  connected: boolean;
  sync: string;
}

const initial: Integration[] = [
  { id: "notion", name: "Notion", description: "Sync Short-Form & Long-Form creator databases directly.", connected: true, sync: "Active Notion API" },
  { id: "instagram", name: "Instagram", description: "DM volume, replies and thread status.", connected: false, sync: "Not connected" },
  { id: "gmail", name: "Gmail", description: "Sent mail, replies and thread threading.", connected: false, sync: "Not connected" },
  { id: "sheets", name: "Google Sheets", description: "Two-way sync for lead lists.", connected: false, sync: "Not connected" },
  { id: "linkedin", name: "LinkedIn", description: "Connection requests and InMail replies.", connected: false, sync: "Not connected" },
  { id: "whatsapp", name: "WhatsApp", description: "Business API message events.", connected: false, sync: "Not connected" },
  { id: "slack", name: "Slack", description: "Reply and deal alerts in channel.", connected: false, sync: "Not connected" },
  { id: "hubspot", name: "HubSpot", description: "Deal and contact enrichment.", connected: false, sync: "Not connected" },
  { id: "csv", name: "CSV", description: "One-off historical imports.", connected: true, sync: "Ready for upload" },
];

const CSV_COLUMNS = [
  ["Name", "Lead Name"],
  ["Email", "Email"],
  ["Platform", "Channel"],
  ["Date", "Contact Date"],
  ["Status", "Lead Status"],
  ["Owner", "Team Member"],
];

const PREVIEW = [
  ["Mike Johnson", "mike@northwind.com", "Instagram", "2026-08-12", "Contacted"],
  ["Sarah Patel", "sarah@looprtl.com", "Email", "2026-08-12", "Replied"],
  ["Jordan Rivera", "jordan@arcadia.io", "LinkedIn", "2026-08-13", "Positive"],
];

function IntegrationsPage() {
  const [items, setItems] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const [staged, setStaged] = useState(false);

  // Notion state
  const [notionApiKey, setNotionApiKey] = useState("");
  const [shortDbId, setShortDbId] = useState("");
  const [longDbId, setLongDbId] = useState("");

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncedCount, setSyncedCount] = useState<number | null>(null);

  useEffect(() => {
    const config = getStoredNotionConfig();
    if (config) {
      setNotionApiKey(config.apiKey);
      setShortDbId(config.shortDbId);
      setLongDbId(config.longDbId);
    }
    const last = getLastSyncTime();
    setLastSync(last);
    const existing = getStoredNotionLeads();
    if (existing) {
      setSyncedCount(existing.length);
    }
  }, []);

  const handleSyncNotion = async () => {
    if (!notionApiKey.trim()) {
      toast.error("Please enter your Notion Integration Token (secret_...)");
      return;
    }
    if (!shortDbId.trim() && !longDbId.trim()) {
      toast.error("Please enter at least one Notion Database ID (Short-Form or Long-Form)");
      return;
    }

    setIsSyncing(true);
    try {
      const config = {
        apiKey: notionApiKey,
        shortDbId: shortDbId.trim(),
        longDbId: longDbId.trim(),
      };
      saveNotionConfig(config);

      const result = await syncNotionDatabases(config);

      const combinedLeads = getStoredNotionLeads();
      if (combinedLeads) {
        setCustomLeads(combinedLeads);
        setSyncedCount(combinedLeads.length);
      }
      setLastSync(new Date().toISOString());

      toast.success(
        `Synced! ${result.shortCount} Short-Form & ${result.longCount} Long-Form creators (${result.totalLeads} total in Leads)`,
      );

      // Force reload after 1s so sheets refresh cleanly
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      console.error("Notion Sync Error:", err);
      toast.error(`Notion Sync Failed: ${err.message || "Invalid Key or Database ID"}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const [isAligning, setIsAligning] = useState(false);

  const handleAlignSchemas = async () => {
    setIsAligning(true);
    try {
      const config = {
        apiKey: notionApiKey,
        shortDbId: shortDbId.trim(),
        longDbId: longDbId.trim(),
      };
      saveNotionConfig(config);

      const res = await alignNotionDatabaseSchemas(config, "both");
      if (res.shortSuccess || res.longSuccess) {
        toast.success("Aligned Notion column headings & options to match Outreach Pulse!");
      } else {
        const errDetail = res.shortError || res.longError || "Access denied or invalid Database ID";
        toast.error(`Notion Schema Update Failed: ${errDetail}`);
      }
    } catch (err: any) {
      toast.error(`Schema alignment failed: ${err.message}`);
    } finally {
      setIsAligning(false);
    }
  };

  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const handleDiagnose = async () => {
    setIsDiagnosing(true);
    try {
      const config = {
        apiKey: notionApiKey,
        shortDbId: shortDbId.trim(),
        longDbId: longDbId.trim(),
      };
      saveNotionConfig(config);
      const report = await diagnoseNotionDatabases(config);

      const shortMsg = report.shortStatus.ok
        ? `Short DB ("${report.shortStatus.title}"): ${report.shortStatus.pageCount} rows, ${report.shortStatus.propertyCount} columns`
        : `Short DB Error: ${report.shortStatus.error}`;

      const longMsg = report.longStatus.ok
        ? `Long DB ("${report.longStatus.title}"): ${report.longStatus.pageCount} rows, ${report.longStatus.propertyCount} columns`
        : `Long DB Error: ${report.longStatus.error}`;

      if (report.shortStatus.ok || report.longStatus.ok) {
        toast.info(`Diagnosis Result:\n• ${shortMsg}\n• ${longMsg}`, { duration: 8000 });
      } else {
        toast.error(`Diagnosis Failed:\n• ${shortMsg}\n• ${longMsg}`, { duration: 8000 });
      }
    } catch (err: any) {
      toast.error(`Diagnosis Error: ${err.message}`);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleClearNotionData = () => {
    localStorage.removeItem("pulse_notion_leads");
    localStorage.removeItem("pulse_notion_leads_short");
    localStorage.removeItem("pulse_notion_leads_long");
    localStorage.removeItem("pulse-creator-sheet-short");
    localStorage.removeItem("pulse-creator-sheet-long");
    localStorage.removeItem("pulse_notion_last_sync");
    setSyncedCount(null);
    setLastSync(null);
    toast.info("Cleared Notion cache. Resetting to default view.");
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageIntro title="Integrations" subtitle="Connect Notion, your outreach channels, or import CSV history." />

      {/* Notion Dual Database Sync Box */}
      <Reveal>
        <Panel
          title="Notion Workspace Sync"
          description="Connect your Short-Form and Long-Form Notion databases. They will populate the respective Creator Sheets and combine automatically in your Master Leads list."
        >
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Notion API Key / Token</label>
              <Input
                type="password"
                placeholder="ntn_..."
                value={notionApiKey}
                onChange={(e) => setNotionApiKey(e.target.value)}
                className="bg-background text-xs font-mono"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 rounded-lg border border-border p-3 bg-surface">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Video className="size-4 text-primary" />
                  <span>Short-Form Creators Database</span>
                </div>
                <Input
                  type="text"
                  placeholder="Notion Link or Database ID (e.g. 3bee1c55...)"
                  value={shortDbId}
                  onChange={(e) => setShortDbId(e.target.value)}
                  className="bg-background text-xs font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Populates <strong>/creators/short</strong> &amp; Master Leads.
                </p>
              </div>

              <div className="space-y-1.5 rounded-lg border border-border p-3 bg-surface">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Clapperboard className="size-4 text-warning" />
                  <span>Long-Form Creators Database</span>
                </div>
                <Input
                  type="text"
                  placeholder="Notion Link or Database ID for YouTube/Podcasts"
                  value={longDbId}
                  onChange={(e) => setLongDbId(e.target.value)}
                  className="bg-background text-xs font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Populates <strong>/creators/long</strong> &amp; Master Leads.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Database className="size-4 text-primary" />
                {syncedCount !== null ? (
                  <span>
                    Active: <strong className="text-foreground">{syncedCount} total leads</strong> synced across Short &amp; Long form
                    {lastSync ? ` (${new Date(lastSync).toLocaleTimeString()})` : ""}
                  </span>
                ) : (
                  <span>Click Sync or Align to update Notion schemas!</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {syncedCount !== null && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleClearNotionData}
                  >
                    Clear Cache
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-xs"
                  onClick={handleDiagnose}
                  disabled={isDiagnosing}
                >
                  {isDiagnosing ? "Diagnosing..." : "Diagnose Connection"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-xs"
                  onClick={handleAlignSchemas}
                  disabled={isAligning}
                >
                  {isAligning ? "Updating Notion Headings..." : "Align Notion Column Headings"}
                </Button>
                <Button size="sm" className="gap-2 text-xs" onClick={handleSyncNotion} disabled={isSyncing}>
                  <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing Notion Databases..." : "Sync Notion Databases"}
                </Button>
              </div>
            </div>
          </div>
        </Panel>
      </Reveal>

      {/* Integration Grid */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, i) => (
          <Reveal key={item.id} delay={i * 30}>
            <article className="panel flex h-full flex-col gap-3 p-5 transition-colors hover:border-border-strong hover:bg-elevated">
              <header className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg border border-border bg-elevated text-xs font-semibold tracking-tight">
                    {item.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">{item.name}</h2>
                    <p className="text-[11px] text-muted-foreground">{item.sync}</p>
                  </div>
                </div>
                <Chip tone={item.connected ? "positive" : "neutral"}>
                  {item.connected ? (
                    <>
                      <Check className="size-3" aria-hidden />
                      Connected
                    </>
                  ) : (
                    "Not connected"
                  )}
                </Chip>
              </header>
              <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-auto border-border bg-surface text-xs"
                onClick={() =>
                  setItems((list) =>
                    list.map((x) =>
                      x.id === item.id
                        ? { ...x, connected: !x.connected, sync: x.connected ? "Not connected" : "Synced just now" }
                        : x,
                    ),
                  )
                }
              >
                {item.connected ? "Configure" : "Connect"}
              </Button>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <Panel title="Import from CSV" description="Drag a file in, map the columns, review the preview, then import.">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              setStaged(true);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors ${
              dragging ? "border-primary bg-primary-soft" : "border-border bg-surface"
            }`}
          >
            <Upload className="size-5 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">Drop your outreach export here</p>
            <p className="text-xs text-muted-foreground">CSV up to 20MB · UTF-8</p>
            <Button variant="outline" size="sm" className="mt-2 border-border bg-background text-xs" onClick={() => setStaged(true)}>
              Choose file
            </Button>
          </div>

          {staged ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  <Table2 className="size-3.5" aria-hidden />
                  Column mapping
                </h3>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {CSV_COLUMNS.map(([from, to]) => (
                    <li key={from} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="num text-muted-foreground">{from}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">{to}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  <FileSpreadsheet className="size-3.5" aria-hidden />
                  Preview · 3 of 1,248 rows
                </h3>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[420px] text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        {["Lead name", "Email", "Channel", "Contact date", "Status"].map((h) => (
                          <th key={h} scope="col" className="px-3 py-2 font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PREVIEW.map((row) => (
                        <tr key={row[1]} className="border-b border-border/70 last:border-0">
                          {row.map((cell) => (
                            <td key={cell} className="px-3 py-2 whitespace-nowrap">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button size="sm" className="text-xs" onClick={() => toast.success("1,248 rows queued for import")}>
                  Import 1,248 rows
                </Button>
              </div>
            </div>
          ) : null}
        </Panel>
      </Reveal>
    </div>
  );
}
