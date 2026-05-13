"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ApiResponse } from "@/types/api";
import { useTeamMembers } from "@/hooks/use-team";
import { useAuthStore } from "@/store/auth-store";
import { formatPersonName } from "@/lib/ops";

type CreateTaskBody = {
  title: string;
  description?: string;
  assignedToUserId?: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueAt?: string;
};

export function NewTaskDialog() {
  const qc = useQueryClient();
  const roleKey = useAuthStore((state) => state.user?.roleKey ?? null);
  const canAssign = roleKey === "FOUNDER" || roleKey === "ADMIN";
  const { data: team } = useTeamMembers();
  const [open, setOpen] = React.useState(() => {
    if (typeof window === "undefined") return false;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("new") === "1";
  });
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<CreateTaskBody["priority"]>("NORMAL");
  const [dueAt, setDueAt] = React.useState("");
  const [assignedToUserId, setAssignedToUserId] = React.useState<string>("unassigned");

  const mutation = useMutation({
    mutationFn: async () => {
      const body: CreateTaskBody = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        assignedToUserId: canAssign && assignedToUserId !== "unassigned" ? assignedToUserId : undefined,
      };
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as ApiResponse<{ task: { id: string } }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Failed to create task");
      return json.data.task;
    },
    onSuccess: async () => {
      toast.success("Task created");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["tasks"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      setTitle("");
      setDescription("");
      setPriority("NORMAL");
      setDueAt("");
      setAssignedToUserId("unassigned");
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create task"),
  });

  const canSubmit = title.trim().length >= 2 && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">New Task</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              placeholder="e.g. Submit weekly ops report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              placeholder="Definition of done, current context, and what might block delivery."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as CreateTaskBody["priority"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-due">Due date</Label>
              <Input id="task-due" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Assignee</Label>
            <Select value={assignedToUserId} onValueChange={setAssignedToUserId} disabled={!canAssign}>
              <SelectTrigger>
                <SelectValue placeholder={canAssign ? "Assign owner" : "Founder/Admin only"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {(team?.members ?? []).map((member) => (
                  <SelectItem key={member.user.id} value={member.user.id}>
                    {formatPersonName(member.user)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={!canSubmit}>
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
