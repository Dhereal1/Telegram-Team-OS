"use client";

import { ArrowRight, AlertTriangle, CheckCircle2, Clock3, FileWarning, TimerReset } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/use-dashboard";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

export function StatsGrid() {
  const { data, isLoading, error } = useDashboard();
  const roleKey = useAuthStore((state) => state.user?.roleKey ?? null);
  const s = data?.dashboard.stats;
  const summary = data?.dashboard.summary;
  const attention = data?.dashboard.attention;

  return (
    <div className="space-y-4">
      {error ? (
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Failed to load dashboard"}
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
        <div className="grid gap-5 p-5 md:grid-cols-[1.35fr_0.95fr] md:p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="h-6 rounded-full px-2.5 text-[10px] uppercase tracking-[0.18em]">
                Dhereal1
              </Badge>
              <Badge variant="outline" className="h-6 rounded-full px-2.5 text-[10px] uppercase tracking-[0.18em]">
                {roleKey === "STAFF" ? "Staff lane" : "Founder control"}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
                {isLoading ? <Skeleton className="h-9 w-72" /> : summary?.headline}
              </div>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {isLoading ? (
                  <Skeleton className="h-5 w-full max-w-xl" />
                ) : (
                  summary?.subheadline
                )}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {(summary?.focusItems ?? ["", "", ""]).map((item, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3 text-sm text-muted-foreground"
                >
                  {isLoading ? <Skeleton className="h-4 w-full" /> : item}
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            <div className="rounded-3xl border border-amber-500/20 bg-amber-500/8 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Needs attention</div>
                <AlertTriangle className="size-4 text-amber-500" />
              </div>
              <div className="mt-3 grid gap-2">
                {[
                  { label: "Overdue tasks", value: s?.taskOverdue ?? 0, tone: "amber" },
                  { label: "Blocked tasks", value: s?.blockedTasks ?? 0, tone: "rose" },
                  { label: "Missing reports", value: s?.missingReports ?? 0, tone: "slate" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl bg-background/85 px-3 py-2">
                    <div className="text-sm text-muted-foreground">{item.label}</div>
                    <div
                      className={cn(
                        "text-sm font-semibold",
                        item.tone === "amber" && "text-amber-600 dark:text-amber-300",
                        item.tone === "rose" && "text-rose-600 dark:text-rose-300",
                      )}
                    >
                      {isLoading ? <Skeleton className="h-4 w-8" /> : item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/8 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Execution quality</div>
                <ArrowRight className="size-4 text-emerald-500" />
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight">
                {isLoading ? <Skeleton className="h-8 w-20" /> : `${s?.completionRate ?? 0}%`}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Completed tasks as a share of current tracked work.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: roleKey === "STAFF" ? "My Open Tasks" : "Open Tasks",
            value: roleKey === "STAFF" ? s?.myOpenTasks : s?.taskPending,
            hint: roleKey === "STAFF" ? "Assigned to you" : "TODO, in progress, blocked",
            icon: TimerReset,
          },
          { label: "Due Today", value: s?.dueToday, hint: "Execution window", icon: Clock3 },
          { label: "Reports Today", value: s?.reportsToday, hint: "Submitted since UTC 00:00", icon: FileWarning },
          { label: "Completed", value: s?.taskCompleted, hint: "Delivered work", icon: CheckCircle2 },
          { label: "Team Members", value: s?.members, hint: "Active operators", icon: ArrowRight },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="rounded-3xl border-border/70 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{item.label}</div>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight">
                {isLoading ? <Skeleton className="h-7 w-12" /> : (item.value ?? 0)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{item.hint}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Card className="rounded-3xl border-border/70 p-4 shadow-sm xl:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">Overdue queue</div>
            <Badge variant="outline" className="text-[10px]">
              Act now
            </Badge>
          </div>
          <div className="grid gap-2">
            {isLoading
              ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-14 w-full rounded-2xl" />)
              : attention?.overdueTasks.length
                ? attention.overdueTasks.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/8 px-3 py-3">
                      <div className="text-sm font-medium">{task.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {task.assigneeLabel} · {task.priority.toLowerCase()} priority
                      </div>
                    </div>
                  ))
                : <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No overdue tasks right now.</div>}
          </div>
        </Card>

        <Card className="rounded-3xl border-border/70 p-4 shadow-sm xl:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">Blocked work</div>
            <Badge variant="outline" className="text-[10px]">
              Escalate
            </Badge>
          </div>
          <div className="grid gap-2">
            {isLoading
              ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-14 w-full rounded-2xl" />)
              : attention?.blockedTasks.length
                ? attention.blockedTasks.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-rose-500/20 bg-rose-500/8 px-3 py-3">
                      <div className="text-sm font-medium">{task.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {task.assigneeLabel} · {task.priority.toLowerCase()} priority
                      </div>
                    </div>
                  ))
                : <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">Nothing is currently blocked.</div>}
          </div>
        </Card>

        <Card className="rounded-3xl border-border/70 p-4 shadow-sm xl:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">Missing reports</div>
            <Badge variant="outline" className="text-[10px]">
              Daily close
            </Badge>
          </div>
          <div className="grid gap-2">
            {isLoading
              ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-14 w-full rounded-2xl" />)
              : attention?.missingReports.length
                ? attention.missingReports.map((member) => (
                    <div key={member.id} className="rounded-2xl border bg-background/70 px-3 py-3">
                      <div className="text-sm font-medium">{member.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {member.roleKey.toLowerCase()} · {member.title ?? "Team member"}
                      </div>
                    </div>
                  ))
                : <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">Reporting coverage is complete for today.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
