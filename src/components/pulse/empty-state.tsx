import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  body,
  actionLabel = "Import data",
  actionTo = "/integrations",
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  actionTo?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="grid size-11 place-items-center rounded-xl border border-border bg-elevated">
        <Icon className="size-5 text-muted-foreground" aria-hidden />
      </span>
      <div className="max-w-sm space-y-1.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      {children ?? (
        <Button asChild size="sm">
          <Link to={actionTo}>
            {actionLabel}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      )}
    </div>
  );
}
