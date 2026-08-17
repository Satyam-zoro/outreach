import { useEffect, useState } from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/pulse/app-shell";
import { FullScreenPulseLoader } from "@/components/pulse/pulse-skeleton";
import { FiltersProvider } from "@/lib/pulse/filters";

export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
  pendingComponent: FullScreenPulseLoader,
});

function ShellLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setReady(true);
    }, 750);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return <FullScreenPulseLoader />;
  }

  return (
    <FiltersProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </FiltersProvider>
  );
}
