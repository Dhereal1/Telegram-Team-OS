"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ApiResponse } from "@/types/api";
import { useAuthStore } from "@/store/auth-store";
import { useTeamMembers } from "@/hooks/use-team";

type TaskRow = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
};

type TaskDetail = TaskRow & {
  description: string | null;
  assignedToId: string | null;
  dueAt: string | null;
};

const UNASSIGNED_VALUE = "__unassigned__";

export function TaskRowActions({ task }: { task: TaskRow }) {
  const qc = useQueryClient();
  const roleKey = useAuthStore((s) => s.user?.roleKey ?? null);
  const canAssign = roleKey === "FOUNDER" || roleKey === "ADMIN";
  const { data: team } = useTeamMembers();
  const members = team?.members ?? [];
  const [editOpen, setEditOpen] = React.useState(false);
  const [title, setTitle] = React.useState(task.title);
  const [description, setDescription] = React.useState("");
  const [dueAt, setDueAt] = React.useState<string>("");
  const [assignedToUserId, setAssignedToUserId] = React.useState<string>(UNASSIGNED_VALUE);
  const [loadingDetails, setLoadingDetails] = React.useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = React.useState(false);
  
  async function openEdit() {
    setEditOpen(true);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`);
      const json = (await res.json()) as ApiResponse<{ task: TaskDetail }>;
      if (!res.ok || !json.ok) return;
      const t = json.data.task;
      setTitle(t.title ?? task.title);
      setDescription(t.description ?? "");
      setAssignedToUserId(t.assignedToId ?? UNASSIGNED_VALUE);
      setDueAt(t.dueAt ? String(t.dueAt).slice(0, 10) : "");
    } finally {
      setLoadingDetails(false);
    }
  }

  const patch = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as ApiResponse<{ task: TaskRow }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Update failed");
      return json.data.task;
    },
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueryData<{ tasks: TaskRow[] }>(["tasks"]);
      if (prev) {
        qc.setQueryData<{ tasks: TaskRow[] }>(["tasks"], {
          tasks: prev.tasks.map((t) => (t.id === task.id ? ({ ...t, ...body } as TaskRow) : t)),
        });
      }
      return { prev };
    },
    onError: (e, _body, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks"], ctx.prev);
      toast.error(e instanceof Error ? e.message : "Update failed");
    },
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["tasks"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });

  const archive = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      const json = (await res.json()) as ApiResponse<{ archived: boolean }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Archive failed");
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueryData<{ tasks: TaskRow[] }>(["tasks"]);
      if (prev) qc.setQueryData(["tasks"], { tasks: prev.tasks.filter((t) => t.id !== task.id) });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks"], ctx.prev);
      toast.error(e instanceof Error ? e.message : "Archive failed");
    },
    onSuccess: () => toast.success("Task archived"),
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["tasks"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });

  const busy = patch.isPending || archive.isPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={busy} aria-label="Task actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => {
              void openEdit();
            }}
          >
            <Pencil className="mr-2 size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => patch.mutate({ status: "TODO" })}>Mark TODO</DropdownMenuItem>
          <DropdownMenuItem onClick={() => patch.mutate({ status: "IN_PROGRESS" })}>Mark In progress</DropdownMenuItem>
          <DropdownMenuItem onClick={() => patch.mutate({ status: "BLOCKED" })}>Mark Blocked</DropdownMenuItem>
          <DropdownMenuItem onClick={() => patch.mutate({ status: "DONE" })}>Mark Done</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => patch.mutate({ priority: "LOW" })}>Priority: Low</DropdownMenuItem>
          <DropdownMenuItem onClick={() => patch.mutate({ priority: "NORMAL" })}>Priority: Normal</DropdownMenuItem>
          <DropdownMenuItem onClick={() => patch.mutate({ priority: "HIGH" })}>Priority: High</DropdownMenuItem>
          <DropdownMenuItem onClick={() => patch.mutate({ priority: "URGENT" })}>Priority: Urgent</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => {
              setConfirmArchiveOpen(true);
            }}
          >
            <Trash2 className="mr-2 size-4" />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Due date</Label>
                <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Assignee</Label>
                <Select
                  value={assignedToUserId}
                  onValueChange={setAssignedToUserId}
                  disabled={!canAssign}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={canAssign ? "Select" : "Admin only"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.user.id} value={m.user.id}>
                        {m.user.username ? `@${m.user.username}` : m.user.firstName ?? m.user.id.slice(0, 6)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const patchBody: Record<string, unknown> = {
                    title: title.trim(),
                    description: description.trim() || null,
                    dueAt: dueAt ? new Date(dueAt).toISOString() : null,
                  };
                  if (canAssign) patchBody.assignedToUserId = assignedToUserId === UNASSIGNED_VALUE ? null : assignedToUserId;
                  patch.mutate(patchBody);
                  setEditOpen(false);
                }}
                disabled={busy || loadingDetails || title.trim().length < 2}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmArchiveOpen} onOpenChange={setConfirmArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive task?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the task from active execution views. Use this for canceled work, not for completed delivery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={() => {
                archive.mutate();
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
