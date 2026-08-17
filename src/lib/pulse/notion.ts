/**
 * Notion Integration Service for PULSE
 * Handles fetching, parsing, and syncing database records from Notion into PULSE domain objects.
 * Supports separate Short-Form and Long-Form Notion creator databases.
 */
import type { Channel, Lead, LeadSource, LeadStatus } from "./types";

export interface NotionConfig {
  apiKey: string;
  shortDbId: string; // Database ID for Short-Form creators
  longDbId: string; // Database ID for Long-Form creators
  autoSync?: boolean;
}

export interface SheetColumn {
  id: string;
  label: string;
  kind: string;
  options?: string[];
  width?: number;
}

export interface SheetRow {
  id: string;
  cells: Record<string, string | number | boolean>;
}

const STORAGE_KEY_CONFIG = "pulse_notion_config";
const STORAGE_KEY_LEADS_SHORT = "pulse_notion_leads_short";
const STORAGE_KEY_LEADS_LONG = "pulse_notion_leads_long";
const STORAGE_KEY_LEADS = "pulse_notion_leads";
const STORAGE_KEY_LAST_SYNC = "pulse_notion_last_sync";

export const DEFAULT_NOTION_API_KEY =
  (typeof import.meta !== "undefined" && (import.meta.env?.["VITE_NOTION_API_KEY"] || import.meta.env?.["NOTION_TOKEN"])) ||
  "";
export const DEFAULT_SHORT_DB_ID =
  (typeof import.meta !== "undefined" && (import.meta.env?.["VITE_NOTION_SHORT_DB_ID"] || import.meta.env?.["NOTION_SHORT_DB_ID"])) ||
  "";
export const DEFAULT_LONG_DB_ID =
  (typeof import.meta !== "undefined" && (import.meta.env?.["VITE_NOTION_LONG_DB_ID"] || import.meta.env?.["NOTION_LONG_DB_ID"])) ||
  "";

export function extractNotionDatabaseId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  const match = trimmed.match(/([a-f0-9]{32})/i) || trimmed.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  const rawId = (match && match[1]) ? match[1].replace(/-/g, "") : trimmed.replace(/-/g, "");
  if (rawId.length === 32) {
    return `${rawId.slice(0, 8)}-${rawId.slice(8, 12)}-${rawId.slice(12, 16)}-${rawId.slice(16, 20)}-${rawId.slice(20)}`;
  }
  return rawId;
}

export function getStoredNotionConfig(): NotionConfig {
  const fallback: NotionConfig = {
    apiKey: DEFAULT_NOTION_API_KEY,
    shortDbId: DEFAULT_SHORT_DB_ID,
    longDbId: DEFAULT_LONG_DB_ID,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<NotionConfig>;
      return {
        apiKey: parsed.apiKey || DEFAULT_NOTION_API_KEY,
        shortDbId: parsed.shortDbId || (parsed as any).databaseId || DEFAULT_SHORT_DB_ID,
        longDbId: parsed.longDbId || DEFAULT_LONG_DB_ID,
      };
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function saveNotionConfig(config: NotionConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
}

export function getStoredNotionLeads(): Lead[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LEADS);
    return raw ? (JSON.parse(raw) as Lead[]) : null;
  } catch {
    return null;
  }
}

export function saveStoredNotionLeads(leads: Lead[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(leads));
  localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
}

export function getLastSyncTime(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY_LAST_SYNC);
}

/**
 * Robust helper to extract plain text from ANY Notion property type (title, rich_text, select, status, formula, url, email, people)
 */
function extractPropText(props: Record<string, any>, candidateNames: string[]): string {
  if (!props) return "";
  const propKeys = Object.keys(props);

  // 1. Try case-insensitive candidate names matching
  for (const name of candidateNames) {
    const matchedKey = propKeys.find((k) => k.trim().toLowerCase() === name.trim().toLowerCase());
    if (matchedKey && props[matchedKey]) {
      const p = props[matchedKey];
      if (p.type === "title" && p.title?.length > 0) {
        const txt = p.title.map((t: any) => t.plain_text || t.text?.content || "").join("");
        if (txt.trim()) return txt.trim();
      }
      if (p.type === "rich_text" && p.rich_text?.length > 0) {
        const txt = p.rich_text.map((t: any) => t.plain_text || t.text?.content || "").join("");
        if (txt.trim()) return txt.trim();
      }
      if (p.type === "select" && p.select?.name) return p.select.name.trim();
      if (p.type === "status" && p.status?.name) return p.status.name.trim();
      if (p.type === "formula" && p.formula?.string) return p.formula.string.trim();
      if (p.type === "url" && p.url) return p.url.trim();
      if (p.type === "email" && p.email) return p.email.trim();
      if (p.type === "people" && p.people?.[0]?.name) return p.people[0].name.trim();
    }
  }

  // 2. Fallback: Search for any property of type 'title' in the database!
  for (const k of propKeys) {
    const p = props[k];
    if (p.type === "title" && p.title?.length > 0) {
      const txt = p.title.map((t: any) => t.plain_text || t.text?.content || "").join("");
      if (txt.trim()) return txt.trim();
    }
  }

  return "";
}

/**
 * Robust helper to extract a number from ANY Notion property type (number, formula, rich_text, title)
 */
function extractPropNumber(props: Record<string, any>, candidateNames: string[]): number | null {
  if (!props) return null;
  const propKeys = Object.keys(props);

  for (const name of candidateNames) {
    const matchedKey = propKeys.find((k) => k.trim().toLowerCase() === name.trim().toLowerCase());
    if (matchedKey && props[matchedKey]) {
      const p = props[matchedKey];
      if (p.type === "number" && p.number !== undefined && p.number !== null) {
        return Number(p.number);
      }
      if (p.type === "formula" && p.formula?.number !== undefined && p.formula.number !== null) {
        return Number(p.formula.number);
      }
      const rawText = extractPropText(props, [name]);
      if (rawText) {
        const cleaned = rawText.replace(/[^0-9.]/g, "");
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed)) return parsed;
      }
    }
  }
  return null;
}

/**
 * Robust helper to extract a boolean checkbox from ANY Notion property type
 */
function extractPropCheckbox(props: Record<string, any>, candidateNames: string[]): boolean | null {
  if (!props) return null;
  const propKeys = Object.keys(props);

  for (const name of candidateNames) {
    const matchedKey = propKeys.find((k) => k.trim().toLowerCase() === name.trim().toLowerCase());
    if (matchedKey && props[matchedKey]) {
      const p = props[matchedKey];
      if (p.type === "checkbox" && p.checkbox !== undefined && p.checkbox !== null) {
        return Boolean(p.checkbox);
      }
      if (p.type === "formula" && p.formula?.boolean !== undefined && p.formula.boolean !== null) {
        return Boolean(p.formula.boolean);
      }
    }
  }
  return null;
}

/**
 * Parses a Notion page object into a PULSE Lead object (for Leads page and Dashboard)
 */
function parseNotionPageToLead(page: any, kind: "short" | "long", index: number): Lead {
  const props = page.properties || {};

  const extractedName = extractPropText(props, ["Creator", "Name", "Title", "Lead", "Creator Name", "Lead Name", "Page"]);
  const name = extractedName || `Lead #${index + 1}`;

  const extractedCompany = extractPropText(props, ["Company", "Organization", "Niche", "Format", "Category"]);
  const company = extractedCompany || (kind === "short" ? "Short-Form Creator" : "Long-Form Creator");

  const emailProp = props.Email || props["Email Address"] || Object.values(props).find((p: any) => p.type === "email");
  let email = `${name.toLowerCase().replace(/\s+/g, ".")}@creator.com`;
  if (emailProp?.email) {
    email = emailProp.email;
  } else {
    const extractedEmail = extractPropText(props, ["Email", "Email Address", "Contact Email"]);
    if (extractedEmail && extractedEmail.includes("@")) email = extractedEmail;
  }

  const extractedChannel = extractPropText(props, ["Platform", "Channel", "Source"]);
  let channel: Channel = kind === "short" ? "Instagram" : "Email";
  if (["Instagram", "Email", "LinkedIn", "X", "WhatsApp", "Other"].includes(extractedChannel)) {
    channel = extractedChannel as Channel;
  } else if (extractedChannel.toLowerCase().includes("tiktok") || extractedChannel.toLowerCase().includes("reels")) {
    channel = "Instagram";
  } else if (extractedChannel.toLowerCase().includes("youtube")) {
    channel = "Email";
  }

  const extractedRawStatus = extractPropText(props, ["Status", "Stage", "Outreach Stage"]);
  let status: LeadStatus = "Contacted";
  const validStatuses: LeadStatus[] = ["New", "Contacted", "Follow-up", "Replied", "Positive", "Call Booked", "Negotiating", "Won", "Lost"];
  const matchedStatus = validStatuses.find((s) => s.toLowerCase() === extractedRawStatus.toLowerCase());
  if (matchedStatus) {
    status = matchedStatus;
  } else if (extractedRawStatus === "In talks") {
    status = "Negotiating";
  } else if (extractedRawStatus === "Closed") {
    status = "Won";
  } else if (extractedRawStatus === "Passed") {
    status = "Lost";
  } else if (extractedRawStatus === "DM sent") {
    status = "Contacted";
  }

  const extractedValue = extractPropNumber(props, ["Deal ($)", "Value", "Amount", "Deal Value", "Revenue"]);
  const value = extractedValue !== null ? extractedValue : 2500;

  const extractedHandle = extractPropText(props, ["Handle", "Social Handle", "Instagram", "TikTok", "YouTube"]);
  const handle = extractedHandle || `@${name.toLowerCase().replace(/\s+/g, "")}`;

  const createdDate = page.created_time ? page.created_time.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const dateProp = props["Last touch"] || props.Date || props["Last Contact"];
  const lastContact = dateProp?.date?.start || createdDate;
  const lastReply = ["Replied", "Positive", "Call Booked", "Negotiating", "Won"].includes(status) ? lastContact : null;

  return {
    id: page.id || `notion_${kind}_${index}`,
    name,
    company,
    email,
    handle,
    channel,
    status,
    campaignId: kind === "short" ? "c_hvac" : "c_agency",
    ownerId: "u_satyam",
    source: "Manual" as LeadSource,
    location: "Global",
    value,
    lastContact,
    lastReply,
    createdAt: createdDate,
  };
}

/**
 * Parses a Notion page object into a Creator Sheet Row (for Short-Form / Long-Form Creator Sheet pages)
 */
function parseNotionPageToSheetRow(page: any, kind: "short" | "long", index: number): SheetRow {
  const props = page.properties || {};

  const extractedCreator = extractPropText(props, ["Creator", "Name", "Title", "Lead", "Creator Name", "Lead Name", "Page"]);
  const creator = extractedCreator || `Creator #${index + 1}`;

  const extractedHandle = extractPropText(props, ["Handle", "Social Handle", "Instagram", "TikTok", "YouTube", "Twitter", "X", "Social"]);
  const handle = extractedHandle || `@${creator.toLowerCase().replace(/\s+/g, "")}`;

  const defaultPlatform = kind === "short" ? "Instagram" : "YouTube";
  const extractedPlatform = extractPropText(props, ["Platform", "Channel", "Source", "Type", "Format"]);
  const platform = extractedPlatform || defaultPlatform;

  const defaultNiche = kind === "short" ? "Fitness" : "Business";
  const extractedNiche = extractPropText(props, ["Niche", "Category", "Genre", "Topic", "Industry"]);
  const niche = extractedNiche || defaultNiche;

  const extractedFollowers = extractPropNumber(props, ["Followers", "Subscribers", "Audience", "Audience Size", "Size", "Subs", "Follower Count"]);
  const followers = extractedFollowers !== null ? extractedFollowers : 100000;

  const extractedStage = extractPropText(props, ["Stage", "Status", "Outreach Stage", "Pipeline Stage", "State"]);
  let stage = "Not contacted";
  const validStages = ["Not contacted", "DM sent", "Replied", "In talks", "Closed", "Passed"];
  const matchedStage = validStages.find((s) => s.toLowerCase() === extractedStage.toLowerCase());
  if (matchedStage) stage = matchedStage;

  const extractedDm = extractPropCheckbox(props, ["DM'd", "DM Sent", "DMd", "Contacted", "DM"]);
  const extractedRep = extractPropCheckbox(props, ["Replied", "Reply", "Response"]);
  const extractedCls = extractPropCheckbox(props, ["Closed", "Won", "Done", "Deal Closed"]);

  let dmSent = extractedDm !== null ? extractedDm : stage !== "Not contacted";
  let replied = extractedRep !== null ? extractedRep : ["Replied", "In talks", "Closed"].includes(stage);
  let closed = extractedCls !== null ? extractedCls : stage === "Closed";

  // Reconcile flags and stage coherently
  if (closed) {
    dmSent = true;
    replied = true;
    if (stage === "Not contacted" || stage === "DM sent") stage = "Closed";
  } else if (replied) {
    dmSent = true;
    if (stage === "Not contacted") stage = "Replied";
  } else if (dmSent) {
    if (stage === "Not contacted") stage = "DM sent";
  } else {
    if (stage !== "Not contacted" && stage !== "Passed") stage = "Not contacted";
  }

  const extractedDeal = extractPropNumber(props, ["Deal ($)", "Deal", "Value", "Amount", "Deal Value", "Revenue"]);
  const dealValue = extractedDeal !== null ? extractedDeal : 0;

  const createdDate = page.created_time ? page.created_time.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const extractedDate = extractPropText(props, ["Last touch", "Date", "Last Contact", "Touchpoint"]);
  const dateProp = props["Last touch"] || props.Date || props["Last Contact"];
  const lastTouch = dateProp?.date?.start || extractedDate || createdDate;

  const extractedOwner = extractPropText(props, ["Owner", "Assignee", "Person", "Lead Owner", "Member"]);
  const owner = extractedOwner || "Satyam";

  const extractedRank = extractPropNumber(props, ["#", "No.", "Rank", "Index"]);
  const rank = extractedRank !== null && extractedRank > 0 ? extractedRank : index + 1;

  const notes = extractPropText(props, ["Notes", "Description", "Details", "Comment", "Comments", "Summary"]);

  return {
    id: page.id || `notion_creator_${kind}_${index}`,
    cells: {
      "#": rank,
      creator,
      handle,
      platform,
      niche,
      followers,
      stage,
      dmSent,
      replied,
      closed,
      dealValue,
      lastTouch,
      owner,
      notes,
    },
  };
}

/**
 * Unified Notion API Fetch Helper
 * Tries local server proxy (/api/notion), direct Notion API, and CORS proxy fallbacks.
 */
export async function callNotionApi(
  path: string,
  options: { method: "GET" | "POST" | "PATCH"; body?: any; apiKey?: string },
): Promise<{ ok: boolean; status: number; data?: any; errorText?: string }> {
  const config = getStoredNotionConfig();
  const apiKey = (options.apiKey || config.apiKey || DEFAULT_NOTION_API_KEY).trim();

  if (!apiKey) {
    return {
      ok: false,
      status: 401,
      errorText: "Notion API token is not configured. Please add your integration key in .env.local or on the Integrations page.",
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };

  const bodyStr = options.body ? JSON.stringify(options.body) : undefined;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // 1. Try Vercel Serverless / Edge Function (/api/notion?path=...)
  try {
    const res = await fetch(`/api/notion?path=${encodeURIComponent(normalizedPath)}`, {
      method: options.method,
      headers,
      body: bodyStr || null,
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, status: res.status, data };
    }
    const errText = await res.text();
    if (res.status !== 404 && res.status !== 405) {
      return { ok: false, status: res.status, errorText: errText };
    }
  } catch {}

  // 2. Try local server proxy (/api/notion/...)
  try {
    const res = await fetch(`/api/notion${normalizedPath}`, {
      method: options.method,
      headers,
      body: bodyStr || null,
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, status: res.status, data };
    }
    const errText = await res.text();
    if (res.status !== 404 && res.status !== 405) {
      return { ok: false, status: res.status, errorText: errText };
    }
  } catch {}

  // 2. Direct Notion API
  try {
    const res = await fetch(`https://api.notion.com/v1${normalizedPath}`, {
      method: options.method,
      headers,
      body: bodyStr || null,
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, status: res.status, data };
    }
    const errText = await res.text();
    return { ok: false, status: res.status, errorText: errText };
  } catch {}

  // 3. CORS Proxy Fallback #1
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://api.notion.com/v1${normalizedPath}`)}`;
    const res = await fetch(proxyUrl, {
      method: options.method,
      headers,
      body: bodyStr || null,
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, status: res.status, data };
    }
  } catch {}

  // 4. CORS Proxy Fallback #2
  try {
    const target = `https://api.notion.com/v1${normalizedPath}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`;
    const res = await fetch(proxyUrl, {
      method: options.method,
      headers,
      body: bodyStr || null,
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, status: res.status, data };
    }
    const errText = await res.text();
    return { ok: false, status: res.status, errorText: errText };
  } catch (err: any) {
    return { ok: false, status: 500, errorText: err.message || String(err) };
  }
}

/**
 * Sorts Notion database pages strictly by # rank ascending (1, 2, 3...)
 * Fallback to creation time ascending if ranks are missing or identical.
 */
export function sortNotionPagesByRank(pages: any[]): any[] {
  if (!Array.isArray(pages)) return [];
  return [...pages].sort((a: any, b: any) => {
    if (!a || !b) return 0;
    const aNum = extractPropNumber(a.properties, ["#", "No.", "Rank", "Index"]);
    const bNum = extractPropNumber(b.properties, ["#", "No.", "Rank", "Index"]);

    // Both have valid positive numbers -> sort by rank ascending (1, 2, 3...)
    if (aNum !== null && bNum !== null && aNum > 0 && bNum > 0) {
      if (aNum !== bNum) return aNum - bNum;
    }
    // If only one has a valid positive rank, that one comes first
    if (aNum !== null && aNum > 0 && (bNum === null || bNum <= 0)) return -1;
    if (bNum !== null && bNum > 0 && (aNum === null || aNum <= 0)) return 1;

    // Fallback: sort strictly by creation time ascending (oldest first)
    const timeA = new Date(a.created_time || 0).getTime();
    const timeB = new Date(b.created_time || 0).getTime();
    return timeA - timeB;
  });
}

/**
 * Fetch database pages directly from Notion API
 */
export async function queryNotionDbRaw(apiKey: string, databaseId: string): Promise<any[]> {
  const cleanedDbId = extractNotionDatabaseId(databaseId);
  if (!cleanedDbId) return [];

  const res = await callNotionApi(`/databases/${cleanedDbId}/query`, {
    method: "POST",
    body: {
      page_size: 100,
    },
    apiKey,
  });

  if (res.ok && res.data) {
    const rawResults = res.data.results || [];
    return sortNotionPagesByRank(rawResults);
  }
  throw new Error(`Notion API Error (${res.status}): ${res.errorText || "Failed to query database"}`);
}

function buildSheetData(kind: "short" | "long", rows: SheetRow[]) {
  const platformCol =
    kind === "short"
      ? { id: "platform", label: "Platform", kind: "select", options: ["Instagram", "TikTok", "YouTube Shorts", "X"], width: 150 }
      : { id: "platform", label: "Platform", kind: "select", options: ["YouTube", "Podcast", "Twitch", "Newsletter"], width: 150 };

  const nicheCol =
    kind === "short"
      ? { id: "niche", label: "Niche", kind: "select", options: ["Fitness", "Finance", "Comedy", "Beauty", "Tech"], width: 140 }
      : { id: "niche", label: "Niche", kind: "select", options: ["Business", "Education", "Tech Review", "Interview", "Documentary"], width: 150 };

  const columns = [
    { id: "creator", label: "Creator", kind: "text", width: 200 },
    { id: "handle", label: "Handle", kind: "text", width: 150 },
    platformCol,
    nicheCol,
    { id: "followers", label: kind === "short" ? "Followers" : "Subscribers", kind: "number" },
    { id: "stage", label: "Stage", kind: "select", options: ["Not contacted", "DM sent", "Replied", "In talks", "Closed", "Passed"], width: 190 },
    { id: "dmSent", label: "DM'd", kind: "check" },
    { id: "replied", label: "Replied", kind: "check" },
    { id: "closed", label: "Closed", kind: "check" },
    { id: "dealValue", label: "Deal ($)", kind: "number" },
    { id: "lastTouch", label: "Last touch", kind: "date", width: 140 },
    { id: "owner", label: "Owner", kind: "text" },
    { id: "notes", label: "Notes", kind: "text", width: 240 },
  ];
  return { columns, rows };
}

/**
 * High-level sync function to pull Short-Form and Long-Form Notion databases and populate both Creator Sheets and combined Leads
 */
export async function syncNotionDatabases(config: NotionConfig): Promise<{ shortCount: number; longCount: number; totalLeads: number }> {
  let shortLeads: Lead[] = [];
  let longLeads: Lead[] = [];

  let shortRows: SheetRow[] = [];
  let longRows: SheetRow[] = [];

  let shortError: string | null = null;
  let longError: string | null = null;

  // 1. Sync Short-Form DB if specified
  if (config.shortDbId) {
    try {
      const rawPages = await queryNotionDbRaw(config.apiKey, config.shortDbId);
      const pages = sortNotionPagesByRank(rawPages);
      shortLeads = pages.map((p, i) => parseNotionPageToLead(p, "short", i));
      shortRows = pages.map((p, i) => parseNotionPageToSheetRow(p, "short", i));
      shortRows.sort((a, b) => (Number(a.cells["#"]) || 0) - (Number(b.cells["#"]) || 0));

      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_LEADS_SHORT, JSON.stringify(shortLeads));
        const sheetData = buildSheetData("short", shortRows);
        localStorage.setItem("pulse-creator-sheet-short", JSON.stringify(sheetData));
      }
    } catch (err: any) {
      console.error("Short-Form DB sync error:", err);
      shortError = err.message || String(err);
    }
  }

  // 2. Sync Long-Form DB if specified
  if (config.longDbId) {
    try {
      const rawPages = await queryNotionDbRaw(config.apiKey, config.longDbId);
      const pages = sortNotionPagesByRank(rawPages);
      longLeads = pages.map((p, i) => parseNotionPageToLead(p, "long", i));
      longRows = pages.map((p, i) => parseNotionPageToSheetRow(p, "long", i));
      longRows.sort((a, b) => (Number(a.cells["#"]) || 0) - (Number(b.cells["#"]) || 0));

      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_LEADS_LONG, JSON.stringify(longLeads));
        const sheetData = buildSheetData("long", longRows);
        localStorage.setItem("pulse-creator-sheet-long", JSON.stringify(sheetData));
      }
    } catch (err: any) {
      console.error("Long-Form DB sync error:", err);
      longError = err.message || String(err);
    }
  }

  if (shortError && longError) {
    throw new Error(`Sync failed. Short-Form: ${shortError}. Long-Form: ${longError}`);
  }

  // 3. Combine both into master leads list for /leads and /dashboard
  const combinedLeads = [...shortLeads, ...longLeads];
  if (combinedLeads.length > 0) {
    saveStoredNotionLeads(combinedLeads);
  }

  saveNotionConfig(config);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("pulse-notion-synced", {
        detail: {
          shortRows,
          longRows,
          shortLeads,
          longLeads,
        },
      }),
    );
  }

  return {
    shortCount: shortLeads.length,
    longCount: longLeads.length,
    totalLeads: combinedLeads.length,
  };
}

/**
 * Write-back handler for 2-Way Notion Sync.
 * Updates a page property in Notion live when edited inside Outreach Pulse.
 */
export async function updateNotionPageProperties(pageId: string, properties: Record<string, any>): Promise<boolean> {
  const config = getStoredNotionConfig();
  if (!config.apiKey || !pageId) return false;

  const cleanPageId = pageId.replace(/notion_creator_short_|notion_creator_long_|notion_short_|notion_long_|notion_/g, "").trim();
  if (!cleanPageId || cleanPageId.startsWith("uid_") || cleanPageId.startsWith("seed_")) return false;

  const res = await callNotionApi(`/pages/${cleanPageId}`, {
    method: "PATCH",
    body: { properties },
    apiKey: config.apiKey,
  });

  return res.ok;
}

export async function archiveNotionPage(pageId: string): Promise<boolean> {
  const config = getStoredNotionConfig();
  if (!config.apiKey || !pageId) return false;

  const cleanPageId = pageId.replace(/notion_creator_short_|notion_creator_long_|notion_short_|notion_long_|notion_/g, "").trim();
  if (!cleanPageId || cleanPageId.startsWith("uid_") || cleanPageId.startsWith("seed_")) return false;

  const res = await callNotionApi(`/pages/${cleanPageId}`, {
    method: "PATCH",
    body: { archived: true },
    apiKey: config.apiKey,
  });

  return res.ok;
}

export async function createNotionPage(
  kind: "short" | "long",
  initialCells: Record<string, any>,
  rowIndex?: number,
): Promise<string | null> {
  const config = getStoredNotionConfig();
  if (!config.apiKey) return null;

  const dbId = kind === "short" ? config.shortDbId : config.longDbId;
  const cleanedDbId = extractNotionDatabaseId(dbId);
  if (!cleanedDbId) return null;

  // Fetch database details to find title property key
  const getRes = await callNotionApi(`/databases/${cleanedDbId}`, { method: "GET", apiKey: config.apiKey });
  const existingProps = getRes.ok ? getRes.data?.properties || {} : {};
  const titleKey = Object.keys(existingProps).find((k) => existingProps[k]?.type === "title") || "Name";

  const creatorName = String(initialCells?.["creator"] || "New Creator");
  const handleVal = String(initialCells?.["handle"] || "@newcreator");
  const platformVal = String(initialCells?.["platform"] || (kind === "short" ? "Instagram" : "YouTube"));
  const nicheVal = String(initialCells?.["niche"] || (kind === "short" ? "Fitness" : "Business"));
  const followersVal = Number(initialCells?.["followers"] || 100000);
  const stageVal = String(initialCells?.["stage"] || "Not contacted");
  const dmSentVal = Boolean(initialCells?.["dmSent"]);
  const repliedVal = Boolean(initialCells?.["replied"]);
  const closedVal = Boolean(initialCells?.["closed"]);
  const dealVal = Number(initialCells?.["dealValue"] || 0);
  const lastTouchVal = String(initialCells?.["lastTouch"] || new Date().toISOString().slice(0, 10));
  const ownerVal = String(initialCells?.["owner"] || "Satyam");
  const notesVal = String(initialCells?.["notes"] || "");

  const propertiesPayload: Record<string, any> = {};

  const isTitleHandle = titleKey.toLowerCase().includes("handle");

  if (isTitleHandle) {
    // Handle is the title property in Notion
    propertiesPayload[titleKey] = { title: [{ text: { content: handleVal } }] };
    if (existingProps["Creator"]?.type === "rich_text") {
      propertiesPayload["Creator"] = { rich_text: [{ text: { content: creatorName } }] };
    }
    if (existingProps["Name"]?.type === "rich_text") {
      propertiesPayload["Name"] = { rich_text: [{ text: { content: creatorName } }] };
    }
  } else {
    // Creator/Name is the title property in Notion
    propertiesPayload[titleKey] = { title: [{ text: { content: creatorName } }] };
    if (existingProps["Creator"]?.type === "rich_text" && titleKey !== "Creator") {
      propertiesPayload["Creator"] = { rich_text: [{ text: { content: creatorName } }] };
    }
    if (existingProps["Handle"]?.type === "rich_text") {
      propertiesPayload["Handle"] = { rich_text: [{ text: { content: handleVal } }] };
    } else if (existingProps["Social Handle"]?.type === "rich_text") {
      propertiesPayload["Social Handle"] = { rich_text: [{ text: { content: handleVal } }] };
    }
  }

  // Populate # or No. column if present in Notion database
  if (rowIndex !== undefined && rowIndex !== null) {
    if (existingProps["#"]?.type === "number") {
      propertiesPayload["#"] = { number: rowIndex };
    } else if (existingProps["No."]?.type === "number") {
      propertiesPayload["No."] = { number: rowIndex };
    } else if (existingProps["Rank"]?.type === "number") {
      propertiesPayload["Rank"] = { number: rowIndex };
    } else if (existingProps["Index"]?.type === "number") {
      propertiesPayload["Index"] = { number: rowIndex };
    }
  }

  if (existingProps["Platform"]?.type === "select") {
    propertiesPayload["Platform"] = { select: { name: platformVal } };
  } else if (existingProps["Channel"]?.type === "select") {
    propertiesPayload["Channel"] = { select: { name: platformVal } };
  }

  if (existingProps["Niche"]?.type === "select") {
    propertiesPayload["Niche"] = { select: { name: nicheVal } };
  } else if (existingProps["Category"]?.type === "select") {
    propertiesPayload["Category"] = { select: { name: nicheVal } };
  }

  if (existingProps["Stage"]) {
    if (existingProps["Stage"].type === "status") {
      propertiesPayload["Stage"] = { status: { name: stageVal } };
    } else if (existingProps["Stage"].type === "select") {
      propertiesPayload["Stage"] = { select: { name: stageVal } };
    }
  } else if (existingProps["Status"]) {
    if (existingProps["Status"].type === "status") {
      propertiesPayload["Status"] = { status: { name: stageVal } };
    } else if (existingProps["Status"].type === "select") {
      propertiesPayload["Status"] = { select: { name: stageVal } };
    }
  }

  if (existingProps["Followers"]?.type === "number") {
    propertiesPayload["Followers"] = { number: followersVal };
  } else if (existingProps["Subscribers"]?.type === "number") {
    propertiesPayload["Subscribers"] = { number: followersVal };
  }

  if (existingProps["DM'd"]?.type === "checkbox") {
    propertiesPayload["DM'd"] = { checkbox: dmSentVal };
  }
  if (existingProps["Replied"]?.type === "checkbox") {
    propertiesPayload["Replied"] = { checkbox: repliedVal };
  }
  if (existingProps["Closed"]?.type === "checkbox") {
    propertiesPayload["Closed"] = { checkbox: closedVal };
  }

  if (existingProps["Deal ($)"]?.type === "number") {
    propertiesPayload["Deal ($)"] = { number: dealVal };
  } else if (existingProps["Deal"]?.type === "number") {
    propertiesPayload["Deal"] = { number: dealVal };
  } else if (existingProps["Value"]?.type === "number") {
    propertiesPayload["Value"] = { number: dealVal };
  }

  if (existingProps["Last touch"]?.type === "date") {
    propertiesPayload["Last touch"] = { date: { start: lastTouchVal } };
  } else if (existingProps["Date"]?.type === "date") {
    propertiesPayload["Date"] = { date: { start: lastTouchVal } };
  }

  if (existingProps["Owner"]?.type === "rich_text") {
    propertiesPayload["Owner"] = { rich_text: [{ text: { content: ownerVal } }] };
  }

  if (notesVal && existingProps["Notes"]?.type === "rich_text") {
    propertiesPayload["Notes"] = { rich_text: [{ text: { content: notesVal } }] };
  }

  const res = await callNotionApi("/pages", {
    method: "POST",
    body: {
      parent: { database_id: cleanedDbId },
      properties: propertiesPayload,
    },
    apiKey: config.apiKey,
  });

  if (res.ok && res.data?.id) {
    return res.data.id;
  }
  console.warn("Failed to create Notion page:", res.errorText);
  return null;
}

export async function writeBackCellToNotion(rowId: string, colId: string, value: any): Promise<boolean> {
  if (!rowId || rowId.startsWith("uid_") || rowId.startsWith("seed_")) return false;

  const candidatePayloads: Record<string, any>[] = [];

  switch (colId.toLowerCase()) {
    case "#":
    case "num":
    case "index":
    case "rank":
      candidatePayloads.push({ "#": { number: Number(value) || 0 } });
      candidatePayloads.push({ "No.": { number: Number(value) || 0 } });
      candidatePayloads.push({ Rank: { number: Number(value) || 0 } });
      candidatePayloads.push({ Index: { number: Number(value) || 0 } });
      break;
    case "creator":
    case "name":
      candidatePayloads.push({ Name: { title: [{ text: { content: String(value) } }] } });
      candidatePayloads.push({ Creator: { title: [{ text: { content: String(value) } }] } });
      candidatePayloads.push({ Lead: { title: [{ text: { content: String(value) } }] } });
      candidatePayloads.push({ Title: { title: [{ text: { content: String(value) } }] } });
      candidatePayloads.push({ Name: { rich_text: [{ text: { content: String(value) } }] } });
      candidatePayloads.push({ Creator: { rich_text: [{ text: { content: String(value) } }] } });
      break;
    case "stage":
    case "status":
      candidatePayloads.push({ Stage: { status: { name: String(value) } } });
      candidatePayloads.push({ Stage: { select: { name: String(value) } } });
      candidatePayloads.push({ Status: { status: { name: String(value) } } });
      candidatePayloads.push({ Status: { select: { name: String(value) } } });
      break;
    case "dmsent":
    case "dm":
      candidatePayloads.push({ "DM'd": { checkbox: Boolean(value) } });
      candidatePayloads.push({ "DM Sent": { checkbox: Boolean(value) } });
      candidatePayloads.push({ DMd: { checkbox: Boolean(value) } });
      break;
    case "replied":
      candidatePayloads.push({ Replied: { checkbox: Boolean(value) } });
      break;
    case "closed":
      candidatePayloads.push({ Closed: { checkbox: Boolean(value) } });
      break;
    case "dealvalue":
    case "deal":
    case "value":
      candidatePayloads.push({ "Deal ($)": { number: Number(value) || 0 } });
      candidatePayloads.push({ Value: { number: Number(value) || 0 } });
      candidatePayloads.push({ Amount: { number: Number(value) || 0 } });
      break;
    case "notes":
      candidatePayloads.push({ Notes: { rich_text: [{ text: { content: String(value) } }] } });
      candidatePayloads.push({ Description: { rich_text: [{ text: { content: String(value) } }] } });
      break;
    case "handle":
      candidatePayloads.push({ Handle: { rich_text: [{ text: { content: String(value) } }] } });
      candidatePayloads.push({ "Social Handle": { rich_text: [{ text: { content: String(value) } }] } });
      break;
    case "platform":
      candidatePayloads.push({ Platform: { select: { name: String(value) } } });
      candidatePayloads.push({ Channel: { select: { name: String(value) } } });
      break;
    case "niche":
      candidatePayloads.push({ Niche: { select: { name: String(value) } } });
      candidatePayloads.push({ Category: { select: { name: String(value) } } });
      break;
    case "owner":
      candidatePayloads.push({ Owner: { rich_text: [{ text: { content: String(value) } }] } });
      break;
    case "followers":
    case "subscribers":
      candidatePayloads.push({ Followers: { number: Number(value) || 0 } });
      candidatePayloads.push({ Subscribers: { number: Number(value) || 0 } });
      break;
    case "lasttouch":
    case "date":
      if (value) {
        candidatePayloads.push({ "Last touch": { date: { start: String(value) } } });
        candidatePayloads.push({ Date: { date: { start: String(value) } } });
      }
      break;
  }

  for (const props of candidatePayloads) {
    const success = await updateNotionPageProperties(rowId, props);
    if (success) return true;
  }

  return false;
}

/**
 * Updates Notion Database Column Headings and Select Options in Notion
 * to match Outreach Pulse creator sheet schemas automatically.
 */
export async function alignNotionDatabaseSchemas(
  customConfig?: NotionConfig,
  kind: "short" | "long" | "both" = "both",
): Promise<{ shortSuccess: boolean; longSuccess: boolean; shortError?: string; longError?: string }> {
  const config = customConfig || getStoredNotionConfig();
  if (!config.apiKey) return { shortSuccess: false, longSuccess: false, shortError: "Missing API Key" };

  const updateDbSchema = async (dbId: string, sheetKind: "short" | "long"): Promise<{ success: boolean; error?: string }> => {
    const cleanedDbId = extractNotionDatabaseId(dbId);
    if (!cleanedDbId) return { success: false, error: "Invalid Database ID" };

    const getRes = await callNotionApi(`/databases/${cleanedDbId}`, { method: "GET", apiKey: config.apiKey });
    if (!getRes.ok) {
      return { success: false, error: `Could not fetch database details (${getRes.status}): ${getRes.errorText}` };
    }

    const existingProps = getRes.data?.properties || {};
    const existingTitleKey = Object.keys(existingProps).find((k) => existingProps[k]?.type === "title");

    const platformOptions =
      sheetKind === "short"
        ? [{ name: "Instagram" }, { name: "TikTok" }, { name: "YouTube Shorts" }, { name: "X" }]
        : [{ name: "YouTube" }, { name: "Podcast" }, { name: "Twitch" }, { name: "Newsletter" }];

    const nicheOptions =
      sheetKind === "short"
        ? [{ name: "Fitness" }, { name: "Finance" }, { name: "Comedy" }, { name: "Beauty" }, { name: "Tech" }]
        : [{ name: "Business" }, { name: "Education" }, { name: "Tech Review" }, { name: "Interview" }, { name: "Documentary" }];

    const propertiesPayload: Record<string, any> = {};

    const addSafeProp = (key: string, desiredType: "rich_text" | "select" | "number" | "checkbox" | "date", extra?: any) => {
      const existing = existingProps[key];

      if (existing) {
        if (existing.type === "title" || key === existingTitleKey) return; // Do not touch title

        if (existing.type === desiredType) {
          if (desiredType === "select" && extra?.options) {
            propertiesPayload[key] = { select: { options: extra.options } };
          } else if (desiredType === "number" && extra?.format) {
            propertiesPayload[key] = { number: { format: extra.format } };
          } else {
            propertiesPayload[key] = { [desiredType]: {} };
          }
        } else {
          // If existing type differs, preserve existing type to prevent Notion 400 error
          propertiesPayload[key] = { [existing.type]: {} };
        }
        return;
      }

      // If property does not exist in Notion DB yet, create it!
      if (desiredType === "select") {
        propertiesPayload[key] = { select: { options: extra?.options || [] } };
      } else if (desiredType === "number") {
        propertiesPayload[key] = { number: { format: extra?.format || "number" } };
      } else {
        propertiesPayload[key] = { [desiredType]: {} };
      }
    };

    if (existingTitleKey !== "Creator" && !existingProps["Creator"]) {
      addSafeProp("Creator", "rich_text");
    }

    addSafeProp("#", "number", { format: "number" });
    addSafeProp("Handle", "rich_text");
    addSafeProp("Platform", "select", { options: platformOptions });
    addSafeProp("Niche", "select", { options: nicheOptions });
    if (sheetKind === "short") {
      addSafeProp("Followers", "number", { format: "number" });
    } else {
      addSafeProp("Subscribers", "number", { format: "number" });
    }
    addSafeProp("Stage", "select", {
      options: [
        { name: "Not contacted" },
        { name: "DM sent" },
        { name: "Replied" },
        { name: "In talks" },
        { name: "Closed" },
        { name: "Passed" },
      ],
    });
    addSafeProp("DM'd", "checkbox");
    addSafeProp("Replied", "checkbox");
    addSafeProp("Closed", "checkbox");
    addSafeProp("Deal ($)", "number", { format: "dollar" });
    addSafeProp("Last touch", "date");
    addSafeProp("Owner", "rich_text");
    addSafeProp("Notes", "rich_text");

    const patchRes = await callNotionApi(`/databases/${cleanedDbId}`, {
      method: "PATCH",
      body: { properties: propertiesPayload },
      apiKey: config.apiKey,
    });

    if (patchRes.ok) return { success: true };
    return { success: false, error: `PATCH Error (${patchRes.status}): ${patchRes.errorText || "Failed database update"}` };
  };

  let shortSuccess = false;
  let longSuccess = false;
  let shortError: string | undefined;
  let longError: string | undefined;

  if ((kind === "short" || kind === "both") && config.shortDbId) {
    const res = await updateDbSchema(config.shortDbId, "short");
    shortSuccess = res.success;
    shortError = res.error;
  }

  if ((kind === "long" || kind === "both") && config.longDbId) {
    const res = await updateDbSchema(config.longDbId, "long");
    longSuccess = res.success;
    longError = res.error;
  }

  return {
    shortSuccess,
    longSuccess,
    ...(shortError ? { shortError } : {}),
    ...(longError ? { longError } : {}),
  };
}

/**
 * Diagnostic utility to test Notion API connectivity and inspect database details
 */
export async function diagnoseNotionDatabases(configInput?: NotionConfig): Promise<{
  shortStatus: { ok: boolean; title?: string; propertyCount?: number; pageCount?: number; properties?: string[]; error?: string };
  longStatus: { ok: boolean; title?: string; propertyCount?: number; pageCount?: number; properties?: string[]; error?: string };
}> {
  const config = configInput || getStoredNotionConfig();

  const testDb = async (dbId: string) => {
    const cleaned = extractNotionDatabaseId(dbId);
    if (!cleaned) return { ok: false, error: "Invalid Database ID format" };

    const getRes = await callNotionApi(`/databases/${cleaned}`, { method: "GET", apiKey: config.apiKey });
    if (!getRes.ok) {
      return { ok: false, error: `HTTP ${getRes.status}: ${getRes.errorText || "Could not access database"}` };
    }

    const titleArr = getRes.data?.title || [];
    const titleText = titleArr.map((t: any) => t.plain_text || t.text?.content || "").join("") || "Untitled Database";
    const props = getRes.data?.properties || {};
    const propKeys = Object.keys(props);

    const queryRes = await callNotionApi(`/databases/${cleaned}/query`, { method: "POST", body: { page_size: 100 }, apiKey: config.apiKey });
    const pageCount = queryRes.ok && queryRes.data?.results ? queryRes.data.results.length : 0;

    return {
      ok: true,
      title: titleText,
      propertyCount: propKeys.length,
      properties: propKeys,
      pageCount,
    };
  };

  const shortStatus = config.shortDbId ? await testDb(config.shortDbId) : { ok: false, error: "Short DB ID not set" };
  const longStatus = config.longDbId ? await testDb(config.longDbId) : { ok: false, error: "Long DB ID not set" };

  return { shortStatus, longStatus };
}
