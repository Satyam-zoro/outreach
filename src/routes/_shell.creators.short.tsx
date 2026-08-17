import { createFileRoute } from "@tanstack/react-router";

import { CreatorSheet } from "@/components/pulse/creator-sheet";

export const Route = createFileRoute("/_shell/creators/short")({
  head: () => ({
    meta: [
      { title: "Short-Form Creators — PULSE" },
      {
        name: "description",
        content:
          "Editable tracker for short-form creator outreach: who we DM'd, who replied and who closed, across Instagram, TikTok and Shorts.",
      },
      { property: "og:title", content: "Short-Form Creators — PULSE" },
      { property: "og:description", content: "Track short-form creator DMs, replies and closed deals in one editable sheet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShortFormPage,
});

function ShortFormPage() {
  return (
    <div className="space-y-5 animate-fade-in">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Short-form creators</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reels, TikToks and Shorts partners. Add rows, add your own columns, and log every DM, reply and close.
        </p>
      </header>
      <CreatorSheet kind="short" />
    </div>
  );
}
