"use client";

import * as React from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function MissedReportsAlert(props: { missed: Array<{ username: string | null; firstName: string | null }> }) {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;
  if (!props.missed.length) return null;

  const labels = props.missed
    .slice(0, 8)
    .map((m) => (m.username ? `@${m.username}` : m.firstName ? m.firstName : "member"));

  return (
    <div className={cn("rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 text-amber-600 dark:text-amber-300" />
          <div>
            <div className="text-sm font-medium">
              {props.missed.length} team member{props.missed.length === 1 ? "" : "s"} haven&apos;t submitted their report today
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {labels.join(", ")}
              {props.missed.length > labels.length ? "…" : ""}
            </div>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={() => setDismissed(true)} aria-label="Dismiss">
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

