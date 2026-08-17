import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageIntro, Panel, Reveal } from "@/components/pulse/primitives";
import { WorkspaceLogo } from "@/components/pulse/workspace-logo";
import { currentUser, workspaces } from "@/lib/pulse/data";
import { useFilters, type RangePreset } from "@/lib/pulse/filters";
import { useTheme } from "@/lib/pulse/theme";

export const Route = createFileRoute("/_shell/settings")({
  head: () => ({
    meta: [
      { title: "Settings — PULSE" },
      {
        name: "description",
        content: "Personalise the PULSE dashboard: widget visibility and order, default date range, theme and saved views.",
      },
      { property: "og:title", content: "Settings — PULSE" },
      { property: "og:description", content: "Configure workspace, dashboard and notifications." },
    ],
  }),
  component: SettingsPage,
});

const defaultWidgets = [
  "KPI row",
  "Outreach activity graph",
  "Outreach funnel",
  "Conversion breakdown",
  "Channel performance",
  "Best time to outreach",
  "Live activity",
  "Pulse Intelligence",
  "Heatmap",
];

const presets: { id: Exclude<RangePreset, "custom">; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "ytd", label: "This year" },
];

function SettingsPage() {
  const { theme, toggle } = useTheme();
  const { preset, setPreset } = useFilters();
  const [widgets, setWidgets] = useState(defaultWidgets);
  const [hidden, setHidden] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    setWidgets((list) => {
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <PageIntro title="Settings" subtitle="Workspace, appearance and dashboard personalisation." />

      <div className="grid gap-4 xl:grid-cols-2">
        <Reveal>
          <Panel title="Workspace" description="Membership, branding and defaults for this workspace.">
            <div className="mb-5 flex items-center gap-4 border-b border-border pb-5">
              <WorkspaceLogo size="lg" />
              <div>
                <p className="text-sm font-semibold">{workspaces[0]!.name}</p>
                <p className="text-xs text-muted-foreground">Click the logo box to upload a custom brand logo (PNG, JPG, SVG).</p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Workspace</dt>
                <dd className="mt-0.5 font-medium">{workspaces[0]!.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Plan</dt>
                <dd className="mt-0.5 font-medium">{workspaces[0]!.plan}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Signed in as</dt>
                <dd className="mt-0.5 font-medium">{currentUser.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Role</dt>
                <dd className="mt-0.5 font-medium">{currentUser.role}</dd>
              </div>
            </dl>
          </Panel>
        </Reveal>

        <Reveal delay={60}>
          <Panel title="Appearance" description="Dark is the default; light is fully themed.">
            <div className="flex items-center justify-between gap-4 py-1">
              <div>
                <p className="text-sm font-medium">Light mode</p>
                <p className="text-xs text-muted-foreground">Switch the entire interface to the light theme.</p>
              </div>
              <Switch checked={theme === "light"} onCheckedChange={toggle} aria-label="Toggle light mode" />
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">Default date range</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPreset(p.id)}
                    className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                      preset === p.id
                        ? "border-primary/40 bg-primary-soft text-primary"
                        : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </Panel>
        </Reveal>
      </div>

      <Reveal>
        <Panel
          title="Edit dashboard"
          description="Drag to reorder widgets and toggle visibility. Applies to the overview page."
          actions={
            <Button
              variant="outline"
              size="sm"
              className="border-border bg-surface text-xs"
              onClick={() => {
                setWidgets(defaultWidgets);
                setHidden([]);
              }}
            >
              Reset
            </Button>
          }
        >
          <ul className="divide-y divide-border">
            {widgets.map((w, i) => (
              <li
                key={w}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null && dragIndex !== i) move(dragIndex, i);
                  setDragIndex(null);
                }}
                className="flex cursor-grab items-center gap-3 py-2.5"
              >
                <GripVertical className="size-4 text-muted-foreground" aria-hidden />
                <span className="num w-6 text-xs text-muted-foreground">{(i + 1).toString().padStart(2, "0")}</span>
                <span className="flex-1 text-sm">{w}</span>
                <Switch
                  checked={!hidden.includes(w)}
                  onCheckedChange={() => setHidden((h) => (h.includes(w) ? h.filter((x) => x !== w) : [...h, w]))}
                  aria-label={`Toggle ${w}`}
                />
              </li>
            ))}
          </ul>
        </Panel>
      </Reveal>
    </div>
  );
}
