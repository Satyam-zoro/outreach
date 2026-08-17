import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/pulse/app-shell";
import { FiltersProvider } from "@/lib/pulse/filters";

export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  return (
    <FiltersProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </FiltersProvider>
  );
}
