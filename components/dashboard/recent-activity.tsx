"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/use-dashboard";
import { formatPersonName, formatRelativeTime, humanizeActivityAction } from "@/lib/ops";

const filters = [
  { key: "all", label: "All" },
  { key: "task", label: "Tasks" },
  { key: "report", label: "Reports" },
  { key: "telegram", label: "Telegram" },
] as const;

export function RecentActivity() {
  const { data, isLoading } = useDashboard();
  const rows = data?.dashboard.activity ?? [];
  const [filter, setFilter] = React.useState<(typeof filters)[number]["key"]>("all");
  const filteredRows = rows.filter((row) => {
    if (filter === "all") return true;
    if (filter === "task") return row.action.startsWith("task.");
    if (filter === "report") return row.action.startsWith("report.");
    return row.action.startsWith("telegram.");
  });

  return (
    <Card className="rounded-3xl border-border/70 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Recent activity</div>
          <div className="text-xs text-muted-foreground">Execution memory with actor and action context.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={item.key === filter ? "rounded-full bg-secondary px-3 py-1 text-xs font-medium" : "rounded-full border px-3 py-1 text-xs text-muted-foreground"}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Context</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead className="text-right">When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-4 w-20" />
                  </TableCell>
                </TableRow>
              ))
            : filteredRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{humanizeActivityAction(r.action)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {r.entityType ?? "Event"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.actor ? formatPersonName(r.actor) : "System"}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatRelativeTime(r.createdAt)}</TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
      {!isLoading && filteredRows.length === 0 ? (
        <div className="mt-3 rounded-xl border bg-card/40 p-3 text-sm text-muted-foreground">
          No matching activity yet. Task changes, report submissions, and Telegram actions will appear here.
        </div>
      ) : null}
    </Card>
  );
}
