/**
 * PULSE domain model.
 * These types mirror the eventual database schema (Supabase/Postgres), so the
 * mock service layer in `data.ts` can be swapped for real queries without
 * touching UI code.
 */

export type Channel =
  | "Instagram"
  | "YouTube"
  | "TikTok"
  | "Email"
  | "LinkedIn"
  | "X"
  | "WhatsApp"
  | "Podcast"
  | "Other";

export const CHANNELS: Channel[] = [
  "Instagram",
  "YouTube",
  "TikTok",
  "Email",
  "LinkedIn",
  "X",
  "WhatsApp",
  "Podcast",
  "Other",
];

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Follow-up"
  | "Replied"
  | "Positive"
  | "Call Booked"
  | "Negotiating"
  | "Won"
  | "Lost";

export const LEAD_STATUSES: LeadStatus[] = [
  "New",
  "Contacted",
  "Follow-up",
  "Replied",
  "Positive",
  "Call Booked",
  "Negotiating",
  "Won",
  "Lost",
];

export type LeadSource = "Manual" | "Scraped" | "Referral" | "Inbound" | "List Purchase";

export interface Workspace {
  id: string;
  name: string;
  plan: "Growth" | "Scale" | "Enterprise";
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: Channel;
  status: "Active" | "Paused" | "Completed";
  startDate: string;
  cost: number;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  handle: string;
  channel: Channel;
  status: LeadStatus;
  campaignId: string;
  ownerId: string;
  source: LeadSource;
  location: string;
  value: number;
  lastContact: string;
  score?: number | undefined;
  touchpoints?: number | undefined;
  nextStep?: string | undefined;
  lastReply?: string | undefined;
  createdAt?: string | undefined;
  niche?: string | undefined;
  platform?: string | undefined;
}

export type ActivityKind =
  | "message"
  | "reply"
  | "follow-up"
  | "call"
  | "note"
  | "status"
  | "deal";

export interface ActivityEvent {
  id: string;
  leadId?: string | undefined;
  kind: ActivityKind;
  label: string;
  detail?: string | undefined;
  at: string;
  timestamp?: string | undefined;
  channel?: Channel | undefined;
  type?: "dm_sent" | "email_sent" | "reply" | "call_booked" | "deal_won" | undefined;
  leadName?: string | undefined;
  leadCompany?: string | undefined;
  memberName?: string | undefined;
  metadata?: string | undefined;
}

/** One aggregated activity row: a single day, channel, campaign and owner. */
export interface OutreachFact {
  date: string;
  channel: Channel;
  campaignId: string;
  memberId: string;
  source: LeadSource;
  stage?: string;
  niche?: string;
  contacted: number;
  dms: number;
  emails: number;
  followUps: number;
  replies: number;
  positive: number;
  negative: number;
  interested: number;
  calls: number;
  deals: number;
  revenue: number;
}

/** Reply outcomes bucketed by follow-up index (0 = initial message). */
export interface FollowUpFact {
  step: number;
  sent: number;
  replies: number;
  positive: number;
}

/** Activity bucketed by weekday (0 = Monday) and hour of day. */
export interface TimeSlotFact {
  weekday: number;
  hour: number;
  sent: number;
  replies: number;
  positive: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface Filters {
  range: DateRange;
  channels: Channel[];
  campaignIds: string[];
  memberIds: string[];
  sources: LeadSource[];
  statuses: LeadStatus[];
  stages?: string[];
  niches?: string[];
}

export interface Totals {
  contacted: number;
  dms: number;
  emails: number;
  followUps: number;
  replies: number;
  positive: number;
  negative: number;
  interested: number;
  calls: number;
  deals: number;
  revenue: number;
}

export type Granularity = "day" | "week" | "month";
