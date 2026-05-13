"use client";

import Link from "next/link";
import { FileCheck2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useReports } from "@/hooks/use-reports";
import { NewReportDialog } from "@/components/dashboard/new-report-dialog";
import { formatDateTime, formatPersonName, formatRelativeTime } from "@/lib/ops";

export function ReportsList() {
  const { data, isLoading, error } = useReports();
  const reports = data?.reports ?? [];

  return (
    <div className="grid gap-3">
      <Card className="rounded-3xl border-border/70 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Reporting lane</div>
            <div className="text-xs text-muted-foreground">Daily submissions with founder-ready review context.</div>
          </div>
          <NewReportDialog />
        </div>
        {error ? (
          <div className="mt-4 rounded-xl border bg-card/40 p-3 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Failed to load"}
          </div>
        ) : null}
        <div className="mt-4 grid gap-2">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between rounded-3xl border px-4 py-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))
            : reports.map((r) => (
                <Link
                  key={r.id}
                  href={`/reports/${r.id}`}
                  className="rounded-3xl border border-border/70 bg-background/70 px-4 py-4 transition hover:bg-card/60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-medium">{r.title}</div>
                        <Badge variant="secondary" className="text-[10px]">
                          {r.status}
                        </Badge>
                        {r.status === "REVIEWED" ? (
                          <Badge variant="outline" className="text-[10px]">
                            Founder cleared
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {r.body}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{formatPersonName(r.author)}</span>
                        <span>Submitted {formatRelativeTime(r.createdAt)}</span>
                        {r.reviewedAt ? <span>Reviewed {formatDateTime(r.reviewedAt)}</span> : <span>Awaiting review</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {r.status === "REVIEWED" ? (
                        <FileCheck2 className="size-4 text-emerald-500" />
                      ) : (
                        <Sparkles className="size-4 text-amber-500" />
                      )}
                    </div>
                  </div>
                </Link>
              ))}
        </div>
        {!isLoading && reports.length === 0 ? (
          <div className="mt-3 rounded-3xl border border-dashed p-5 text-sm text-muted-foreground">
            No reports yet. Staff can submit a daily closeout here or from Telegram with `/report`.
          </div>
        ) : null}
      </Card>
    </div>
  );
}
