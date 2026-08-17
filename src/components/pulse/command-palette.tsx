import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarRange, Plus, Search } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { getLeads } from "@/lib/pulse/data";
import { navGroups } from "@/components/pulse/nav";
import { useFilters } from "@/lib/pulse/filters";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { setPreset } = useFilters();
  const [leads] = useState(() => getLeads().slice(0, 60));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (to: string) => {
    onOpenChange(false);
    void navigate({ to });
  };

  const items = navGroups.flatMap((g) => g.items);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search leads, pages and actions…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {items.map((item) => (
            <CommandItem key={item.to} value={`go ${item.label}`} onSelect={() => go(item.to)}>
              <item.icon className="size-4 text-muted-foreground" aria-hidden />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem value="create campaign" onSelect={() => go("/campaigns")}>
            <Plus className="size-4 text-muted-foreground" aria-hidden />
            Create campaign
          </CommandItem>
          <CommandItem value="add lead" onSelect={() => go("/leads")}>
            <Plus className="size-4 text-muted-foreground" aria-hidden />
            Add lead
          </CommandItem>
          <CommandItem value="generate report" onSelect={() => go("/reports")}>
            <Search className="size-4 text-muted-foreground" aria-hidden />
            Generate report
          </CommandItem>
          <CommandItem
            value="change date range last 7 days"
            onSelect={() => {
              setPreset("7d");
              onOpenChange(false);
            }}
          >
            <CalendarRange className="size-4 text-muted-foreground" aria-hidden />
            Date range · Last 7 days
          </CommandItem>
          <CommandItem
            value="change date range last 30 days"
            onSelect={() => {
              setPreset("30d");
              onOpenChange(false);
            }}
          >
            <CalendarRange className="size-4 text-muted-foreground" aria-hidden />
            Date range · Last 30 days
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Leads">
          {leads.map((lead) => (
            <CommandItem
              key={lead.id}
              value={`${lead.name} ${lead.company}`}
              onSelect={() => {
                onOpenChange(false);
                void navigate({ to: "/leads", search: { lead: lead.id } });
              }}
            >
              <span className="text-sm">{lead.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{lead.company}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
