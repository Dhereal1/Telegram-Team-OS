"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsOverview } from "@/hooks/use-analytics";

export function AnalyticsPlaceholder() {
  const { data, isLoading, error } = useAnalyticsOverview();
  const o = data?.overview;

  return (
    <Card className="p-4">
      <div className="text-sm font-medium">Analytics foundation</div>
      {error ? (
        <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Failed to load"}</p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Operational overview powered by real DB counts (Phase 1).
        </p>
      )}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          { label: "Open tasks", value: o?.openTasks },
          { label: "Reports due", value: o?.dueReports },
          { label: "Team members", value: o?.members },
        ].map((x) => (
          <div key={x.label} className="rounded-xl border bg-card/40 p-3 text-sm">
            <div className="text-xs text-muted-foreground">{x.label}</div>
            <div className="mt-1 text-lg font-semibold">
              {isLoading ? <Skeleton className="h-6 w-10" /> : (x.value ?? 0)}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
