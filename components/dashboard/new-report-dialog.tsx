"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ApiResponse } from "@/types/api";

type CreateReportBody = {
  title: string;
  body: string;
};

export function NewReportDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(() => {
    if (typeof window === "undefined") return false;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("new") === "1";
  });
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState(
    "What was completed today?\n- \n\nWhat is blocked?\n- \n\nWhat needs attention next?\n- ",
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: CreateReportBody = { title: title.trim(), body: body.trim() };
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResponse<{ report: { id: string } }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Failed to submit report");
      return json.data.report;
    },
    onSuccess: async () => {
      toast.success("Report submitted");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["reports"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      setTitle("");
      setBody("What was completed today?\n- \n\nWhat is blocked?\n- \n\nWhat needs attention next?\n- ");
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to submit report"),
  });

  const canSubmit = title.trim().length >= 2 && body.trim().length >= 10 && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          New Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Submit report</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="r-title">Title</Label>
            <Input
              id="r-title"
              placeholder="e.g. Daily ops closeout"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="r-body">Body</Label>
            <div className="text-xs text-muted-foreground">
              Submit outcomes, blockers, and next actions so the founder can review quickly.
            </div>
            <Textarea
              id="r-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-40"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={!canSubmit}>
              Submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
