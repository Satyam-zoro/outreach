/**
 * PULSE domain model.
 * These types mirror the eventual database schema (Supabase/Postgres), so the
 * mock service layer in `data.ts` can be swapped for real queries without
 * touching UI code.
 */

export type Channel = "Instagram" | "Email" | "LinkedIn" | "X" | "WhatsApp" | "Other";

export const CHANNELS: Channel[] = ["Instagram", "Email", "LinkedIn", "X", "WhatsApp", "Other"];

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
  lastReply: string | null;
  createdAt: string;
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
  leadId: string;
  kind: ActivityKind;
  label: string;
  detail?: string;
  at: string;
}

/** One aggregated activity row: a single day, channel, campaign and owner. */
export interface OutreachFact {
  date: string;
  channel: Channel;
  campaignId: string;
  memberId: string;
  source: LeadSource;
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
