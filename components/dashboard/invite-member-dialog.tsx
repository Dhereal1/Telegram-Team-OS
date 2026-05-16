"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiResponse } from "@/types/api";

export function InviteMemberDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(() => {
    if (typeof window === "undefined") return false;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("invite") === "1";
  });
  const [roleKey, setRoleKey] = React.useState<"ADMIN" | "STAFF">("STAFF");
  const [inviteLink, setInviteLink] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/team/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roleKey }),
      });
      const json = (await res.json()) as ApiResponse<{ invite: { token: string } }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Invite failed");
      return json.data.invite.token;
    },
    onSuccess: async (token) => {
      const base = process.env.NEXT_PUBLIC_APP_URL;
      if (!base) throw new Error("NEXT_PUBLIC_APP_URL is not configured");
      const link = `${base}/login?invite=${encodeURIComponent(token)}`;
      setInviteLink(link);
      toast.success("Invite created");
      await qc.invalidateQueries({ queryKey: ["team", "invites"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Invite failed"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setInviteLink(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          Invite member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite to team</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select value={roleKey} onValueChange={(v) => setRoleKey(v as "ADMIN" | "STAFF")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STAFF">Staff</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              Create invite
            </Button>
          </div>
          {inviteLink ? (
            <div className="grid gap-2 rounded-2xl border bg-card/40 p-3">
              <div className="text-xs font-medium text-muted-foreground">Invite link</div>
              <Input readOnly value={inviteLink} />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(inviteLink);
                    toast.success("Copied");
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
