import { useState } from "react";
import { CalendarClock, Mail, MessageSquare, PhoneCall, Plus, StickyNote, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Chip } from "@/components/pulse/primitives";
import { campaignById, getLeadActivity, memberById, statusTone } from "@/lib/pulse/data";
import { money } from "@/lib/pulse/analytics";
import type { ActivityKind, Lead } from "@/lib/pulse/types";

const kindIcon: Record<ActivityKind, typeof Mail> = {
  message: MessageSquare,
  reply: Mail,
  "follow-up": MessageSquare,
  call: PhoneCall,
  note: StickyNote,
  status: CalendarClock,
  deal: PhoneCall,
};

export function LeadPanel({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const activity = getLeadActivity(lead.id);
  const owner = memberById(lead.ownerId);
  const campaign = campaignById(lead.campaignId);

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-label={`${lead.name} details`}>
      <button type="button" className="flex-1 bg-background/70 backdrop-blur-sm" aria-label="Close panel" onClick={onClose} />
      <aside className="flex h-full w-full max-w-[440px] flex-col border-l border-border bg-surface shadow-lift rise">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold tracking-tight">{lead.name}</h2>
            <p className="truncate text-xs text-muted-foreground">{lead.company}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" aria-hidden />
          </Button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <div className="flex flex-wrap gap-2">
            <Chip tone={statusTone(lead.status)}>{lead.status}</Chip>
            <Chip>{lead.channel}</Chip>
            <Chip tone="primary">{money(lead.value)} potential</Chip>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            {[
              ["Email", lead.email],
              ["Handle", lead.handle],
              ["Campaign", campaign?.name ?? "—"],
              ["Owner", owner?.name ?? "—"],
              ["Source", lead.source],
              ["Location", lead.location],
              ["Last contact", lead.lastContact],
              ["Last reply", lead.lastReply ?? "No reply yet"],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="truncate">{value}</dd>
              </div>
            ))}
          </dl>

          <section>
            <h3 className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Activity timeline
            </h3>
            <ol className="mt-3 space-y-3 border-l border-border pl-4">
              {activity.map((event) => {
                const Icon = kindIcon[event.kind];
                return (
                  <li key={event.id} className="relative">
                    <span className="absolute top-1 -left-[21px] grid size-3.5 place-items-center rounded-full border border-border bg-surface">
                      <Icon className="size-2 text-muted-foreground" aria-hidden />
                    </span>
                    <p className="text-sm">{event.label}</p>
                    {event.detail ? <p className="text-xs text-muted-foreground">{event.detail}</p> : null}
                    <p className="num mt-0.5 text-[11px] text-muted-foreground/70">{event.at}</p>
                  </li>
                );
              })}
              {notes.map((n, i) => (
                <li key={`note-${i}`} className="relative">
                  <span className="absolute top-1 -left-[21px] grid size-3.5 place-items-center rounded-full border border-border bg-surface">
                    <StickyNote className="size-2 text-muted-foreground" aria-hidden />
                  </span>
                  <p className="text-sm">Note added</p>
                  <p className="text-xs text-muted-foreground">{n}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <footer className="space-y-2 border-t border-border px-5 py-4">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note about this lead…"
            className="min-h-[72px] resize-none bg-background text-sm"
          />
          <Button
            size="sm"
            className="w-full gap-2"
            disabled={!note.trim()}
            onClick={() => {
              setNotes((n) => [note.trim(), ...n]);
              setNote("");
            }}
          >
            <Plus className="size-4" aria-hidden />
            Save note
          </Button>
        </footer>
      </aside>
    </div>
  );
}
