/**
 * Mock data service. Every export here is a pure, typed accessor — the UI never
 * builds its own data. Replacing these functions with Supabase queries is the
 * only change needed to go live.
 */
import type {
  ActivityEvent,
  Campaign,
  Channel,
  FollowUpFact,
  Lead,
  LeadSource,
  LeadStatus,
  OutreachFact,
  TeamMember,
  TimeSlotFact,
  Workspace,
} from "./types";
import { CHANNELS, LEAD_STATUSES } from "./types";

/* ------------------------------------------------------------------ seeded rng */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const pick = <T,>(r: () => number, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)]!;

const iso = (d: Date) => d.toISOString().slice(0, 10);

/* ------------------------------------------------------------------ entities */

export const workspaces: Workspace[] = [
  { id: "ws_growth", name: "Growth Studio", plan: "Scale" },
  { id: "ws_labs", name: "Pulse Labs", plan: "Enterprise" },
];

export const currentUser: TeamMember = {
  id: "u_satyam",
  name: "Satyam",
  role: "Founder",
  initials: "SA",
};

export const team: TeamMember[] = [currentUser];

export const campaigns: Campaign[] = [
  { id: "c_short", name: "Short-Form Creators", channel: "Instagram", status: "Active", startDate: "2026-08-01", cost: 0 },
  { id: "c_long", name: "Long-Form Creators", channel: "YouTube", status: "Active", startDate: "2026-08-01", cost: 0 },
];

const SOURCES: LeadSource[] = ["Manual", "Scraped", "Referral", "Inbound", "List Purchase"];

function parseCreatorSheetRows(key: string): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.rows)) {
        return parsed.rows;
      }
    }
  } catch {}
  return [];
}

export function buildFactsFromCreatorSheets(): OutreachFact[] {
  if (typeof window === "undefined") return [];

  const shortRows = parseCreatorSheetRows("pulse-creator-sheet-short");
  const longRows = parseCreatorSheetRows("pulse-creator-sheet-long");

  if (shortRows.length === 0 && longRows.length === 0) {
    return [];
  }

  const facts: OutreachFact[] = [];
  const todayStr = new Date().toISOString().slice(0, 10);

  const processRow = (r: any, kind: "short" | "long") => {
    const cells = r.cells || {};
    const rawPlatform = String(cells.platform || "").trim();
    let channel: Channel = kind === "short" ? "Instagram" : "YouTube";

    const pLower = rawPlatform.toLowerCase();
    if (pLower.includes("youtube") || pLower.includes("yt")) {
      channel = "YouTube";
    } else if (pLower.includes("tiktok")) {
      channel = "TikTok";
    } else if (pLower.includes("instagram") || pLower.includes("ig") || pLower.includes("reels")) {
      channel = "Instagram";
    } else if (pLower.includes("linkedin")) {
      channel = "LinkedIn";
    } else if (pLower.includes("twitter") || pLower === "x") {
      channel = "X";
    } else if (pLower.includes("whatsapp")) {
      channel = "WhatsApp";
    } else if (pLower.includes("podcast") || pLower.includes("spotify") || pLower.includes("apple pod")) {
      channel = "Podcast";
    } else if (pLower.includes("email") || pLower.includes("newsletter") || pLower.includes("substack")) {
      channel = "Email";
    } else if (rawPlatform) {
      channel = "Other";
    }

    const campaignId = kind === "short" ? "c_short" : "c_long";
    const rawOwner = String(cells.owner || "Satyam").trim();
    const memberId = rawOwner ? `u_${rawOwner.toLowerCase().replace(/\s+/g, "_")}` : "u_satyam";

    const date = typeof cells.lastTouch === "string" && /^\d{4}-\d{2}-\d{2}$/.test(cells.lastTouch)
      ? cells.lastTouch
      : todayStr;

    const dmSent = Boolean(cells.dmSent || cells.stage === "DM sent" || cells.stage === "Replied" || cells.stage === "In talks" || cells.stage === "Closed");
    const replied = Boolean(cells.replied || cells.stage === "Replied" || cells.stage === "In talks" || cells.stage === "Closed");
    const isClosed = Boolean(cells.closed || cells.stage === "Closed");
    const dealValue = isClosed ? (Number(cells.dealValue) || 0) : 0;
    const stage = String(cells.stage || "Not contacted");
    const niche = String(cells.niche || "");

    facts.push({
      date,
      channel,
      campaignId,
      memberId,
      source: "Manual",
      stage,
      niche,
      contacted: 1,
      dms: (channel === "Instagram" || channel === "TikTok" || channel === "X" || channel === "WhatsApp") ? 1 : 0,
      emails: (channel === "Email" || channel === "YouTube" || channel === "Podcast") ? 1 : 0,
      followUps: (stage === "In talks" || stage === "Closed") ? 1 : 0,
      replies: replied ? 1 : 0,
      positive: replied ? 1 : 0,
      negative: stage === "Passed" ? 1 : 0,
      interested: (stage === "In talks" || isClosed) ? 1 : 0,
      calls: (stage === "In talks" || isClosed) ? 1 : 0,
      deals: isClosed ? 1 : 0,
      revenue: dealValue,
    });
  };

  shortRows.forEach((r) => processRow(r, "short"));
  longRows.forEach((r) => processRow(r, "long"));

  return facts;
}

export function getFacts(): OutreachFact[] {
  return buildFactsFromCreatorSheets();
}

/* --------------------------------------------------------------- follow-ups */

export function getFollowUpFacts(): FollowUpFact[] {
  if (typeof window === "undefined") return [];

  const shortRows = parseCreatorSheetRows("pulse-creator-sheet-short");
  const longRows = parseCreatorSheetRows("pulse-creator-sheet-long");
  const allRows = [...shortRows, ...longRows];

  if (allRows.length === 0) {
    return [
      { step: 0, sent: 0, replies: 0, positive: 0 },
      { step: 1, sent: 0, replies: 0, positive: 0 },
      { step: 2, sent: 0, replies: 0, positive: 0 },
    ];
  }

  // Step 0: Initial DM/Email outreach
  const step0Sent = allRows.filter((r) => {
    const c = r.cells || {};
    return Boolean(c.dmSent || c.stage !== "Not contacted");
  }).length;

  const step0Replies = allRows.filter((r) => {
    const c = r.cells || {};
    return Boolean(c.replied || c.stage === "Replied" || c.stage === "In talks" || c.stage === "Closed");
  }).length;

  const step0Positive = allRows.filter((r) => {
    const c = r.cells || {};
    return Boolean(c.stage === "Replied" || c.stage === "In talks" || c.stage === "Closed");
  }).length;

  // Step 1: In-talks & Follow-up discussions
  const step1Sent = allRows.filter((r) => {
    const c = r.cells || {};
    return Boolean(c.stage === "In talks" || c.stage === "Closed" || (c.replied && c.stage !== "Not contacted"));
  }).length;

  const step1Replies = allRows.filter((r) => {
    const c = r.cells || {};
    return Boolean(c.stage === "In talks" || c.stage === "Closed");
  }).length;

  const step1Positive = allRows.filter((r) => {
    const c = r.cells || {};
    return Boolean(c.closed || c.stage === "Closed");
  }).length;

  // Step 2: Closing / Deal Finalization
  const step2Sent = allRows.filter((r) => {
    const c = r.cells || {};
    return Boolean(c.stage === "In talks" || c.stage === "Closed");
  }).length;

  const step2Replies = allRows.filter((r) => {
    const c = r.cells || {};
    return Boolean(c.closed || c.stage === "Closed");
  }).length;

  const step2Positive = step2Replies;

  return [
    { step: 0, sent: step0Sent, replies: step0Replies, positive: step0Positive },
    { step: 1, sent: step1Sent, replies: step1Replies, positive: step1Positive },
    { step: 2, sent: step2Sent, replies: step2Replies, positive: step2Positive },
  ];
}

/* --------------------------------------------------------------- time slots */

export function getTimeSlotFacts(): TimeSlotFact[] {
  const r = rng(77321);
  const hours = [8, 10, 12, 14, 16, 18, 20];
  const out: TimeSlotFact[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    for (const hour of hours) {
      const weekend = weekday >= 5 ? 0.3 : 1;
      // late afternoon mid-week performs best
      const hourPeak = 1 - Math.abs(hour - 16.5) / 12;
      const dayPeak = weekday === 1 ? 1.22 : weekday === 3 ? 1.16 : 1;
      const sent = Math.round(420 * weekend * (0.55 + hourPeak) * dayPeak * (0.85 + r() * 0.3));
      const rate = 0.09 + hourPeak * 0.1 * dayPeak * (0.9 + r() * 0.2);
      const replies = Math.round(sent * rate);
      out.push({ weekday, hour, sent, replies, positive: Math.round(replies * (0.3 + r() * 0.1)) });
    }
  }
  return out;
}

/* ------------------------------------------------------------------- leads */

const FIRST = ["Mike", "Sarah", "Jordan", "Priya", "Liam", "Nina", "Omar", "Chloe", "Ethan", "Ana", "Marcus", "Yuki", "Dev", "Elena", "Tom", "Grace"];
const LAST = ["Johnson", "Patel", "Rivera", "Okafor", "Nguyen", "Kowalski", "Haddad", "Bennett", "Silva", "Muller", "Ford", "Tanaka", "Sharma", "Petrova", "Boyle", "Adeyemi"];
const COMPANY = ["Northwind HVAC", "Loop Retail", "Arcadia Labs", "Vertex Fitness", "Brightline Dental", "Cobalt Studio", "Harbor Logistics", "Nimbus SaaS", "Foundry Homes", "Solstice Media", "Rampart Legal", "Kite Ecommerce"];
const CITY = ["Austin, TX", "London, UK", "Toronto, CA", "Berlin, DE", "Mumbai, IN", "Sydney, AU", "Chicago, IL", "Lisbon, PT"];

function buildLeads(): Lead[] {
  const r = rng(8842);
  const today = new Date();
  const leads: Lead[] = [];
  for (let i = 0; i < 240; i++) {
    const first = pick(r, FIRST);
    const last = pick(r, LAST);
    const company = pick(r, COMPANY);
    const channel = pick(r, CHANNELS);
    const eligible = campaigns.filter((c) => c.channel === channel);
    const campaign = eligible.length ? pick(r, eligible) : pick(r, campaigns);
    const status = pick(r, LEAD_STATUSES);
    const createdOffset = Math.floor(r() * 120) + 3;
    const created = new Date(today);
    created.setUTCDate(created.getUTCDate() - createdOffset);
    const contact = new Date(created);
    contact.setUTCDate(contact.getUTCDate() + Math.floor(r() * Math.min(createdOffset, 20)));
    const replied = ["Replied", "Positive", "Call Booked", "Negotiating", "Won", "Lost"].includes(status);
    const reply = new Date(contact);
    reply.setUTCDate(reply.getUTCDate() + 1 + Math.floor(r() * 5));
    const owner = pick(r, team);
    leads.push({
      id: `l_${i.toString().padStart(4, "0")}`,
      name: `${first} ${last}`,
      company,
      email: `${first.toLowerCase()}@${company.split(" ")[0]!.toLowerCase()}.com`,
      handle: `@${first.toLowerCase()}${last.slice(0, 3).toLowerCase()}`,
      channel,
      status,
      campaignId: campaign.id,
      ownerId: owner.id,
      source: pick(r, SOURCES),
      location: pick(r, CITY),
      value: [1200, 1800, 2400, 3200, 4800, 6400][Math.floor(r() * 6)]!,
      lastContact: iso(contact),
      lastReply: replied ? iso(reply) : null,
      createdAt: iso(created),
    });
  }
  return leads;
}

let _leads: Lead[] | null = null;

export function setCustomLeads(leads: Lead[]) {
  _leads = leads;
}

export function getLeads(): Lead[] {
  if (!_leads) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("pulse_notion_leads");
        if (raw) {
          const parsed = JSON.parse(raw) as Lead[];
          if (Array.isArray(parsed)) {
            _leads = parsed;
            return _leads;
          }
        }
      } catch {}
    }
    _leads = [];
  }
  return _leads;
}

export function getLead(id: string): Lead | undefined {
  return getLeads().find((l) => l.id === id);
}

export function getLeadActivity(leadId: string): ActivityEvent[] {
  const lead = getLead(leadId);
  if (!lead) return [];
  const r = rng(Number(leadId.replace(/\D/g, "")) + 91);
  const events: ActivityEvent[] = [
    { id: `${leadId}_a0`, leadId, kind: "note", label: "Lead added", detail: `Source: ${lead.source}`, at: lead.createdAt },
    {
      id: `${leadId}_a1`,
      leadId,
      kind: "message",
      label: `Initial ${lead.channel === "Email" ? "email" : "DM"} sent`,
      detail: "Opener referencing their recent launch.",
      at: lead.lastContact,
    },
  ];
  if (r() > 0.35) {
    events.push({
      id: `${leadId}_a2`,
      leadId,
      kind: "follow-up",
      label: "Follow-up #1 sent",
      detail: "Short bump with a case study link.",
      at: lead.lastContact,
    });
  }
  if (lead.lastReply) {
    events.push({
      id: `${leadId}_a3`,
      leadId,
      kind: "reply",
      label: "Reply received",
      detail: "“Interesting — can you send more detail?”",
      at: lead.lastReply,
    });
  }
  if (["Call Booked", "Negotiating", "Won"].includes(lead.status)) {
    events.push({ id: `${leadId}_a4`, leadId, kind: "call", label: "Discovery call booked", detail: "30 min, Google Meet", at: lead.lastReply ?? lead.lastContact });
  }
  if (lead.status === "Won") {
    events.push({ id: `${leadId}_a5`, leadId, kind: "deal", label: "Deal closed", detail: `$${lead.value.toLocaleString()} contract value`, at: lead.lastReply ?? lead.lastContact });
  }
  events.push({ id: `${leadId}_a6`, leadId, kind: "status", label: `Status set to ${lead.status}`, at: lead.lastReply ?? lead.lastContact });
  return events.sort((a, b) => (a.at < b.at ? 1 : -1));
}

/* ---------------------------------------------------------- live activity */

export interface LiveEvent {
  id: string;
  text: string;
  tone: "neutral" | "positive" | "primary";
  minutesAgo: number;
}

export function getLiveActivity(): LiveEvent[] {
  return [
    { id: "e1", text: "Alex sent 12 DMs on Instagram", tone: "primary", minutesAgo: 2 },
    { id: "e2", text: "New reply from Mike Johnson — Northwind HVAC", tone: "positive", minutesAgo: 6 },
    { id: "e3", text: "Sarah Patel booked a call with Maya", tone: "positive", minutesAgo: 14 },
    { id: "e4", text: "HVAC Outreach — August reached 1,000 contacts", tone: "neutral", minutesAgo: 28 },
    { id: "e5", text: "Rahul sent 34 follow-ups", tone: "primary", minutesAgo: 41 },
    { id: "e6", text: "Deal closed — Kite Ecommerce · $6,400", tone: "positive", minutesAgo: 63 },
    { id: "e7", text: "Gmail sync completed · 218 threads", tone: "neutral", minutesAgo: 96 },
  ];
}

/* --------------------------------------------------------------- lookups */

export const memberById = (id: string) => team.find((m) => m.id === id);
export const campaignById = (id: string) => campaigns.find((c) => c.id === id);

export const statusTone = (status: LeadStatus): "neutral" | "primary" | "positive" | "negative" | "warning" => {
  switch (status) {
    case "Won":
    case "Positive":
      return "positive";
    case "Lost":
      return "negative";
    case "Call Booked":
    case "Negotiating":
      return "primary";
    case "Follow-up":
      return "warning";
    default:
      return "neutral";
  }
};
