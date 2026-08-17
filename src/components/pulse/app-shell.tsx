import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  ChevronRight,
  Command as CommandIcon,
  CircleHelp,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateRangeControl, FilterControl } from "@/components/pulse/global-filters";
import { CommandPalette } from "@/components/pulse/command-palette";
import { mobileNav, navGroups, pageTitles } from "@/components/pulse/nav";
import { WorkspaceLogo } from "@/components/pulse/workspace-logo";
import { currentUser, workspaces } from "@/lib/pulse/data";
import { getStoredNotionConfig, syncNotionDatabases } from "@/lib/pulse/notion";
import { useTheme } from "@/lib/pulse/theme";
import { cn } from "@/lib/utils";

function Wordmark() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 px-1 py-1" aria-label="PULSE overview">
      <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
        <Activity className="size-4" aria-hidden />
      </span>
      <span className="text-sm font-semibold tracking-[0.2em] uppercase">Pulse</span>
    </Link>
  );
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  return (
    <nav className="flex-1 sidebar-scroll pb-6" aria-label="Main">
      {navGroups.map((group, gi) => (
        <div key={group.heading ?? gi} className="py-1">
          {group.heading ? (
            <p className="px-4 pt-3 pb-1 text-[10px] font-semibold tracking-[0.16em] text-sidebar-muted uppercase">
              {group.heading}
            </p>
          ) : null}
          {group.items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "group relative flex items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors duration-150",
                  active
                    ? "bg-sidebar-active font-semibold text-sidebar-foreground"
                    : "text-sidebar-muted hover:bg-sidebar-active/60 hover:text-sidebar-foreground",
                )}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{item.label}</span>
                </span>
                <ChevronRight
                  className={cn(
                    "size-3.5 shrink-0 transition-opacity",
                    active ? "opacity-100" : "opacity-0 group-hover:opacity-70",
                  )}
                  aria-hidden
                />
                {active ? (
                  <span className="absolute inset-y-0 left-0 w-[3px] rounded-r bg-primary animate-nav-indicator" aria-hidden />
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [workspace, setWorkspace] = useState(workspaces[0]!);
  const { theme, toggle } = useTheme();
  const title = pageTitles[pathname] ?? "Overview";

  useEffect(() => {
    const stored = window.localStorage.getItem("pulse-sidebar");
    if (stored === "collapsed") setOpen(false);
    if (window.matchMedia("(max-width: 1023px)").matches) setOpen(false);

    // Initial background Notion auto-sync for any visitor/browser
    const config = getStoredNotionConfig();
    if (config.apiKey && (config.shortDbId || config.longDbId)) {
      syncNotionDatabases(config).catch((err) => {
        console.warn("Background Notion auto-sync:", err);
      });
    }
  }, []);

  const toggleSidebar = () => {
    setOpen((o) => {
      window.localStorage.setItem("pulse-sidebar", o ? "collapsed" : "expanded");
      return !o;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-1.5 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* Scrim for the mobile drawer */}
      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={toggleSidebar}
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
        />
      ) : null}

      {/* Sidebar with buttery-smooth sliding animation */}
      <aside
        className={cn(
          "h-screen shrink-0 flex flex-col bg-sidebar text-sidebar-foreground overflow-hidden",
          "transition-[width,opacity,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "fixed inset-y-0 left-0 z-40 lg:static",
          open
            ? "w-[232px] opacity-100 border-r border-sidebar-border"
            : "w-0 opacity-0 border-r-0 pointer-events-none"
        )}
      >
        <div className="w-[232px] h-full flex flex-col shrink-0">
          <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3 shrink-0">
            <Wordmark />
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Close navigation"
              className="grid size-7 place-items-center rounded-md text-sidebar-muted hover:bg-sidebar-active hover:text-sidebar-foreground lg:hidden"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="px-4 py-4 shrink-0">
            <Button
              onClick={() => setPaletteOpen(true)}
              className="w-full justify-center gap-1.5 rounded-full border border-sidebar-border bg-transparent text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-active"
            >
              <Plus className="size-4" aria-hidden />
              New
            </Button>
          </div>

          <SidebarNav
            pathname={pathname}
            onNavigate={() => {
              if (window.matchMedia("(max-width: 1023px)").matches) setOpen(false);
            }}
          />

          <div className="border-t border-sidebar-border p-3 shrink-0">
            <button
              type="button"
              onClick={() => setWorkspace((w) => workspaces[(workspaces.indexOf(w) + 1) % workspaces.length]!)}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-sidebar-active"
            >
              <WorkspaceLogo size="sm" editable={false} className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{workspace.name}</span>
                <span className="block text-[11px] text-sidebar-muted">{workspace.plan} workspace</span>
              </span>
              <ChevronRight className="size-3.5 shrink-0 text-sidebar-muted" aria-hidden />
            </button>
          </div>
        </div>
      </aside>

      {/* Main column - Dedicated right scroll container */}
      <div className="flex flex-1 flex-col min-w-0 h-screen overflow-y-auto overflow-x-hidden">
        <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur-md shrink-0">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={open ? "Hide navigation" : "Show navigation"}
              className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <h1 className="truncate text-sm font-semibold tracking-tight">{title}</h1>

            <div className="ml-auto flex items-center gap-1.5">
              <span className="hidden md:block">
                <DateRangeControl />
              </span>
              <span className="hidden md:block">
                <FilterControl />
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPaletteOpen(true)}
                className="gap-2 text-muted-foreground"
              >
                <Search className="size-4" aria-hidden />
                <kbd className="hidden items-center gap-0.5 rounded border border-border px-1 text-[10px] sm:inline-flex">
                  <CommandIcon className="size-2.5" aria-hidden />K
                </kbd>
              </Button>
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative text-muted-foreground">
                <Bell className="size-4" aria-hidden />
                <span className="absolute top-2 right-2 size-1.5 rounded-full bg-primary" aria-hidden />
              </Button>
              <Button variant="ghost" size="icon" asChild aria-label="Help" className="text-muted-foreground">
                <Link to="/integrations">
                  <CircleHelp className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild aria-label="Settings" className="hidden text-muted-foreground sm:inline-flex">
                <Link to="/settings">
                  <Settings className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggle} className="text-muted-foreground">
                {theme === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
              </Button>
              <span className="grid size-7 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                {currentUser.initials}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-border px-4 py-2 md:hidden">
            <DateRangeControl />
            <FilterControl />
          </div>
        </header>

        <main id="main" className="flex-1 mx-auto w-full max-w-[1680px] px-4 pt-6 pb-24 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card lg:hidden"
        aria-label="Mobile"
      >
        {mobileNav.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
