"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Bot, FileClock, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useReport } from "@/hooks/use-report";
import { useAuthStore } from "@/store/auth-store";
import type { ApiResponse } from "@/types/api";
import { formatDateTime, formatPersonName } from "@/lib/ops";

export function ReportDetail({ reportId }: { reportId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useReport(reportId);
  const roleKey = useAuthStore((s) => s.user?.roleKey ?? null);

  const report = data?.report;
  const summary = data?.summary;
  const [notes, setNotes] = React.useState<string>("");

  const canReview = roleKey === "FOUNDER" || roleKey === "ADMIN";

  const review = useMutation({
    mutationFn: async () => {
      const payloadNotes = notes !== "" ? notes : report?.reviewNotes ?? "";
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reviewNotes: payloadNotes, status: "REVIEWED" }),
      });
      const json = (await res.json()) as ApiResponse<{ report: { id: string } }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Review failed");
    },
    onSuccess: async () => {
      toast.success("Report reviewed");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["reports"] }),
        qc.invalidateQueries({ queryKey: ["reports", reportId] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Review failed"),
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Loading report…</div>
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Failed to load"}</div>
      </Card>
    );
  }
  if (!report) return null;

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border-border/70 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Report detail</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{report.title}</h1>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Submitted {formatDateTime(report.createdAt)}</span>
              <span>By {formatPersonName(report.author)}</span>
              {report.reviewedAt ? <span>Reviewed {formatDateTime(report.reviewedAt)}</span> : <span>Awaiting founder review</span>}
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.16em]">
            {report.status}
          </Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border bg-background/70 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileClock className="size-4 text-primary" />
              Submission state
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {report.status === "REVIEWED" ? "Founder review completed." : "Waiting for review and closure notes."}
            </div>
          </div>
          <div className="rounded-2xl border bg-background/70 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="size-4 text-primary" />
              Confidence
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {report.body.length > 120 ? "High detail report." : "Add more specifics on blockers, outcomes, and next steps."}
            </div>
          </div>
          <div className="rounded-2xl border bg-background/70 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BadgeCheck className="size-4 text-primary" />
              Review notes
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {report.reviewNotes?.trim() || "No founder notes left yet."}
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border bg-card/40 p-4">
          <div className="text-xs font-medium text-muted-foreground">Body</div>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-7">{report.body}</pre>
        </div>
      </Card>

      <Card className="rounded-3xl border-border/70 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bot className="size-4 text-primary" />
            AI summary
          </div>
          <div className="text-xs text-muted-foreground">Operational digest view</div>
        </div>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-7 text-muted-foreground">
          {summary ?? "Generating operational summary…"}
        </pre>
      </Card>

      <Card className="rounded-3xl border-border/70 p-5 shadow-sm">
        <div className="text-sm font-medium">Review notes</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Founder and admin can close the reporting loop with clear next-step notes.
        </p>
        <div className="mt-3 grid gap-3">
          <Textarea
            key={report.id}
            defaultValue={report.reviewNotes ?? ""}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!canReview}
          />
          <div className="flex justify-end">
            <Button onClick={() => review.mutate()} disabled={!canReview || review.isPending}>
              Mark reviewed
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
