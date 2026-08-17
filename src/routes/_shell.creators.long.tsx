import { createFileRoute } from "@tanstack/react-router";

import { CreatorSheet } from "@/components/pulse/creator-sheet";

export const Route = createFileRoute("/_shell/creators/long")({
  head: () => ({
    meta: [
      { title: "Long-Form Creators — PULSE" },
      {
        name: "description",
        content:
          "Editable tracker for long-form creator outreach: YouTube, podcast, Twitch and newsletter partners with DM, reply and closed-deal status.",
      },
      { property: "og:title", content: "Long-Form Creators — PULSE" },
      { property: "og:description", content: "Track long-form creator outreach, replies and closed sponsorships in one editable sheet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LongFormPage,
});

function LongFormPage() {
  return (
    <div className="space-y-5 animate-fade-in">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Long-form creators</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          YouTube, podcast, Twitch and newsletter partners. A separate sheet with its own columns, stages and deal values.
        </p>
      </header>
      <CreatorSheet kind="long" />
    </div>
  );
}
