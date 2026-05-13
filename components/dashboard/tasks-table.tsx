"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasks } from "@/hooks/use-tasks";
import { NewTaskDialog } from "@/components/dashboard/new-task-dialog";
import { TaskRowActions } from "@/components/dashboard/task-row-actions";
import { formatPersonName, formatPriority, formatRelativeTime, formatShortDate, formatTaskStatus, getDueState } from "@/lib/ops";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

export function TasksTable() {
  const { data, isLoading, error } = useTasks();
  const authUser = useAuthStore((state) => state.user);
  const roleKey = authUser?.roleKey ?? null;
  const tasks = data?.tasks ?? [];
  const [filter, setFilter] = React.useState<"active" | "mine" | "done">("active");
  const filteredTasks = tasks.filter((task) => {
    if (filter === "done") return task.status === "DONE";
    if (filter === "mine") {
      return roleKey === "STAFF" ? task.assignedToId === authUser?.userId : task.assignedTo !== null;
    }
    return task.status !== "DONE" && task.status !== "CANCELED";
  });

  return (
    <Card className="rounded-3xl border-border/70 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-medium">Execution board</div>
          <div className="text-xs text-muted-foreground">Clear ownership, urgency, and next action state.</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "active", label: "Active" },
            { key: "mine", label: roleKey === "STAFF" ? "My lane" : "Assigned" },
            { key: "done", label: "Done" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key as typeof filter)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs text-muted-foreground transition",
                filter === item.key && "bg-secondary text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
          <NewTaskDialog />
        </div>
      </div>
      {error ? (
        <div className="rounded-2xl border bg-card/40 p-3 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load"}
        </div>
      ) : null}
      <div className="grid gap-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-3xl" />)
          : filteredTasks.map((t) => {
              const dueState = getDueState(t.dueAt);
              return (
                <div key={t.id} className="rounded-3xl border border-border/70 bg-background/70 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold tracking-tight">{t.title}</h3>
                        <Badge variant="secondary" className="text-[10px]">
                          {formatTaskStatus(t.status)}
                        </Badge>
                        <Badge variant={t.priority === "URGENT" ? "destructive" : "outline"} className="text-[10px]">
                          {formatPriority(t.priority)}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {t.description?.trim() || "No execution notes yet. Add detail so the assignee knows what done looks like."}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Owner {formatPersonName(t.assignedTo)}</span>
                        <span>Created by {formatPersonName(t.createdBy)}</span>
                        <span>Updated {formatRelativeTime(t.updatedAt)}</span>
                        {t.completedAt ? <span>Closed {formatShortDate(t.completedAt)}</span> : null}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-right">
                        <div
                          className={cn(
                            "text-sm font-medium",
                            dueState.tone === "danger" && "text-rose-600 dark:text-rose-300",
                            dueState.tone === "warn" && "text-amber-600 dark:text-amber-300",
                          )}
                        >
                          {dueState.label}
                        </div>
                        {t.dueAt ? <div className="text-xs text-muted-foreground">{formatShortDate(t.dueAt)}</div> : null}
                      </div>
                      <TaskRowActions task={t} />
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
      {!isLoading && filteredTasks.length === 0 ? (
        <div className="mt-3 rounded-3xl border border-dashed p-5 text-sm text-muted-foreground">
          {filter === "done"
            ? "No completed tasks yet."
            : roleKey === "STAFF"
              ? "Your lane is clear. New assignments will show here."
              : "No tasks match this view yet. Create the next execution item to keep the team moving."}
        </div>
      ) : null}
    </Card>
  );
}
