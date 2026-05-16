"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ApiResponse } from "@/types/api";
import type { MemberScore } from "@/lib/scores/calculate-member-score";

type ScoresResponse = { scores: MemberScore[]; generatedAt: string; windowDays: number };

function badgeTone(label: MemberScore["label"]) {
  if (label === "Excellent") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border-emerald-500/30";
  if (label === "Good") return "bg-teal-500/15 text-teal-700 dark:text-teal-200 border-teal-500/30";
  if (label === "Fair") return "bg-amber-500/15 text-amber-700 dark:text-amber-200 border-amber-500/30";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-200 border-rose-500/30";
}

function ScoreBar({ value, max, tone }: { value: number; max: number; tone: "emerald" | "sky" }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-2 rounded-full", tone === "emerald" ? "bg-emerald-500" : "bg-sky-500")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function TeamScores() {
  const [windowDays, setWindowDays] = React.useState<7 | 30>(7);
  const q = useQuery({
    queryKey: ["team", "scores", windowDays],
    queryFn: async (): Promise<ScoresResponse> => {
      const res = await fetch(`/api/team/scores?window=${windowDays}`);
      const json = (await res.json()) as ApiResponse<ScoresResponse>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Failed to load scores");
      return json.data;
    },
  });

  const scores = q.data?.scores ?? [];

  return (
    <Card className="rounded-3xl border-border/70 p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-medium">Performance</div>
          <div className="text-xs text-muted-foreground">Signal, not surveillance. Scores are directional.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={windowDays === 7 ? "secondary" : "outline"} onClick={() => setWindowDays(7)}>
            Last 7 days
          </Button>
          <Button size="sm" variant={windowDays === 30 ? "secondary" : "outline"} onClick={() => setWindowDays(30)}>
            Last 30 days
          </Button>
        </div>
      </div>

      {q.error ? (
        <div className="mt-4 rounded-2xl border bg-card/40 p-3 text-sm text-muted-foreground">
          {q.error instanceof Error ? q.error.message : "Failed to load scores"}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-3">Member</th>
              <th className="px-3">Reports (50)</th>
              <th className="px-3">Tasks (50)</th>
              <th className="px-3">Total</th>
              <th className="px-3">Label</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="rounded-2xl border bg-background/70">
                    <td className="px-3 py-3">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="px-3 py-3">
                      <Skeleton className="h-2 w-56 rounded-full" />
                    </td>
                    <td className="px-3 py-3">
                      <Skeleton className="h-2 w-56 rounded-full" />
                    </td>
                    <td className="px-3 py-3">
                      <Skeleton className="h-4 w-10" />
                    </td>
                    <td className="px-3 py-3">
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </td>
                  </tr>
                ))
              : scores.map((s) => {
                  const name = s.username ? `@${s.username}` : s.firstName ?? s.userId.slice(0, 6);
                  return (
                    <tr key={s.userId} className="rounded-2xl border border-border/70 bg-background/70">
                      <td className="px-3 py-3 text-sm font-medium">{name}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-56">
                            <ScoreBar value={s.reportScore} max={50} tone="sky" />
                          </div>
                          <div className="text-xs text-muted-foreground">{s.reportScore}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-56">
                            <ScoreBar value={s.taskScore} max={50} tone="emerald" />
                          </div>
                          <div className="text-xs text-muted-foreground">{s.taskScore}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold">{s.totalScore}</td>
                      <td className="px-3 py-3">
                        <Badge variant="outline" className={cn("border", badgeTone(s.label))}>
                          {s.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

