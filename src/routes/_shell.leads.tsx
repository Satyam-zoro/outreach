import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Check, Search, Users } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmptyState } from "@/components/pulse/empty-state";
import { LeadPanel } from "@/components/pulse/lead-panel";
import { Chip, PageIntro, Panel } from "@/components/pulse/primitives";
import { campaignById, getLeads, memberById, statusTone } from "@/lib/pulse/data";
import { money, number } from "@/lib/pulse/analytics";
import { useFilters } from "@/lib/pulse/filters";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/pulse/types";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ lead: z.string().optional() });

export const Route = createFileRoute("/_shell/leads")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Leads — PULSE" },
      {
        name: "description",
        content: "A searchable, filterable lead database with status pipeline, owners, campaigns and full activity timelines.",
      },
      { property: "og:title", content: "Leads — PULSE" },
      { property: "og:description", content: "Every prospect, every touch, every reply in one keyboard-driven table." },
    ],
  }),
  component: LeadsPage,
});

type SortKey = "name" | "company" | "status" | "lastContact" | "value";

const ALL_COLUMNS: { key: string; label: string }[] = [
  { key: "company", label: "Company" },
  { key: "channel", label: "Platform" },
  { key: "status", label: "Status" },
  { key: "campaign", label: "Campaign" },
  { key: "lastContact", label: "Last contact" },
  { key: "lastReply", label: "Last reply" },
  { key: "owner", label: "Owner" },
  { key: "value", label: "Value" },
];

const PAGE_SIZE = 12;

const savedViews: { id: string; label: string; statuses: LeadStatus[] }[] = [
  { id: "all", label: "All leads", statuses: [] },
  { id: "hot", label: "Hot pipeline", statuses: ["Positive", "Call Booked", "Negotiating"] },
  { id: "waiting", label: "Awaiting reply", statuses: ["Contacted", "Follow-up"] },
  { id: "won", label: "Closed won", statuses: ["Won"] },
];

function LeadsPage() {
  const { lead: leadParam } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { filters, toggle } = useFilters();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "lastContact", dir: "desc" });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [view, setView] = useState("all");
  const [visible, setVisible] = useState<string[]>(ALL_COLUMNS.map((c) => c.key));

  const activeView = savedViews.find((v) => v.id === view)!;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = getLeads().filter((l) => {
      const matchesQuery =
        !q || `${l.name} ${l.company} ${l.email} ${l.handle}`.toLowerCase().includes(q);
      const matchesView = activeView.statuses.length === 0 || activeView.statuses.includes(l.status);
      const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(l.status);
      const matchesChannel = filters.channels.length === 0 || filters.channels.includes(l.channel);
      const matchesCampaign = filters.campaignIds.length === 0 || filters.campaignIds.includes(l.campaignId);
      const matchesOwner = filters.memberIds.length === 0 || filters.memberIds.includes(l.ownerId);
      return matchesQuery && matchesView && matchesStatus && matchesChannel && matchesCampaign && matchesOwner;
    });
    list = [...list].sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "value") return (a.value - b.value) * dir;
      return String(a[sort.key]).localeCompare(String(b[sort.key])) * dir;
    });
    return list;
  }, [query, sort, filters, activeView]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const openLead = leadParam ? getLeads().find((l) => l.id === leadParam) : undefined;

  const setLead = (lead?: Lead) =>
    void navigate({ to: ".", search: lead ? { lead: lead.id } : {} });

  const show = (key: string) => visible.includes(key);

  const headerButton = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }))}
      className={cn("inline-flex items-center gap-1 hover:text-foreground", sort.key === key && "text-foreground")}
    >
      {label}
      {sort.key === key ? (
        sort.dir === "desc" ? <ArrowDown className="size-3" aria-hidden /> : <ArrowUp className="size-3" aria-hidden />
      ) : null}
    </button>
  );

  return (
    <div className="space-y-5">
      <PageIntro
        title="Leads"
        subtitle={`${number(rows.length)} prospects match the current filters and view.`}
        actions={
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="border-border bg-surface text-xs">
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52 space-y-1.5">
                {ALL_COLUMNS.map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-accent">
                    <Checkbox
                      checked={show(c.key)}
                      onCheckedChange={() =>
                        setVisible((v) => (v.includes(c.key) ? v.filter((k) => k !== c.key) : [...v, c.key]))
                      }
                    />
                    {c.label}
                  </label>
                ))}
              </PopoverContent>
            </Popover>
            <Button size="sm" className="text-xs">Add lead</Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {savedViews.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => {
              setView(v.id);
              setPage(0);
            }}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs transition-colors",
              view === v.id
                ? "border-primary/40 bg-primary-soft text-primary"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {v.label}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search name, company or handle…"
            aria-label="Search leads"
            className="h-9 border-border bg-surface pl-8 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {LEAD_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              toggle("statuses", s);
              setPage(0);
            }}
            aria-pressed={filters.statuses.includes(s)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-[11px] transition-colors",
              filters.statuses.includes(s)
                ? "border-primary/40 bg-primary-soft text-primary"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/25 bg-primary-soft px-4 py-2.5 text-xs">
          <span className="num font-medium">{selected.length} selected</span>
          <Button size="sm" variant="outline" className="h-7 border-border bg-surface text-xs">Change status</Button>
          <Button size="sm" variant="outline" className="h-7 border-border bg-surface text-xs">Assign owner</Button>
          <Button size="sm" variant="outline" className="h-7 border-border bg-surface text-xs">Add to campaign</Button>
          <button type="button" className="ml-auto text-muted-foreground hover:text-foreground" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      ) : null}

      <Panel bodyClassName="p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No leads match these filters."
            body="Loosen the filters, clear the search, or import a fresh list to keep the pipeline moving."
            actionLabel="Import leads"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <caption className="sr-only">Lead database</caption>
                <thead>
                  <tr className="border-b border-border text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                    <th scope="col" className="w-10 px-4 py-2.5">
                      <Checkbox
                        aria-label="Select page"
                        checked={current.every((l) => selected.includes(l.id)) && current.length > 0}
                        onCheckedChange={(checked) =>
                          setSelected(checked ? [...new Set([...selected, ...current.map((l) => l.id)])] : [])
                        }
                      />
                    </th>
                    <th scope="col" className="py-2.5 pr-4 text-left font-medium">{headerButton("name", "Name")}</th>
                    {show("company") ? <th scope="col" className="py-2.5 pr-4 text-left font-medium">{headerButton("company", "Company")}</th> : null}
                    {show("channel") ? <th scope="col" className="py-2.5 pr-4 text-left font-medium">Platform</th> : null}
                    {show("status") ? <th scope="col" className="py-2.5 pr-4 text-left font-medium">{headerButton("status", "Status")}</th> : null}
                    {show("campaign") ? <th scope="col" className="py-2.5 pr-4 text-left font-medium">Campaign</th> : null}
                    {show("lastContact") ? <th scope="col" className="py-2.5 pr-4 text-left font-medium">{headerButton("lastContact", "Last contact")}</th> : null}
                    {show("lastReply") ? <th scope="col" className="py-2.5 pr-4 text-left font-medium">Last reply</th> : null}
                    {show("owner") ? <th scope="col" className="py-2.5 pr-4 text-left font-medium">Owner</th> : null}
                    {show("value") ? <th scope="col" className="py-2.5 pl-4 text-right font-medium">{headerButton("value", "Value")}</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {current.map((lead) => (
                    <tr
                      key={lead.id}
                      tabIndex={0}
                      onClick={() => setLead(lead)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setLead(lead);
                      }}
                      className="cursor-pointer border-b border-border/70 transition-colors last:border-0 hover:bg-elevated focus-visible:bg-elevated"
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          aria-label={`Select ${lead.name}`}
                          checked={selected.includes(lead.id)}
                          onCheckedChange={(checked) =>
                            setSelected((s) => (checked ? [...s, lead.id] : s.filter((id) => id !== lead.id)))
                          }
                        />
                      </td>
                      <th scope="row" className="py-3 pr-4 text-left font-normal">
                        <span className="block font-medium">{lead.name}</span>
                        <span className="block text-xs text-muted-foreground">{lead.handle}</span>
                      </th>
                      {show("company") ? <td className="py-3 pr-4">{lead.company}</td> : null}
                      {show("channel") ? <td className="py-3 pr-4 text-muted-foreground">{lead.channel}</td> : null}
                      {show("status") ? (
                        <td className="py-3 pr-4">
                          <Chip tone={statusTone(lead.status)}>{lead.status}</Chip>
                        </td>
                      ) : null}
                      {show("campaign") ? (
                        <td className="py-3 pr-4 text-xs text-muted-foreground">{campaignById(lead.campaignId)?.name ?? "—"}</td>
                      ) : null}
                      {show("lastContact") ? <td className="num py-3 pr-4 text-muted-foreground">{lead.lastContact}</td> : null}
                      {show("lastReply") ? <td className="num py-3 pr-4 text-muted-foreground">{lead.lastReply ?? "—"}</td> : null}
                      {show("owner") ? <td className="py-3 pr-4 text-muted-foreground">{memberById(lead.ownerId)?.name ?? "—"}</td> : null}
                      {show("value") ? <td className="num py-3 pl-4 text-right">{money(lead.value)}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span className="num">
                {page * PAGE_SIZE + 1}–{Math.min(rows.length, (page + 1) * PAGE_SIZE)} of {number(rows.length)}
              </span>
              <span className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 border-border bg-surface text-xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="num">
                  {page + 1} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 border-border bg-surface text-xs"
                  disabled={page + 1 >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </span>
            </div>
          </>
        )}
      </Panel>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Check className="size-3" aria-hidden />
        Rows are keyboard focusable — press Enter to open a lead.
      </p>

      {openLead ? <LeadPanel lead={openLead} onClose={() => setLead()} /> : null}
    </div>
  );
}
