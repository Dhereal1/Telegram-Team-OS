"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useTeamMembers } from "@/hooks/use-team";
import { useAuthStore } from "@/store/auth-store";
import { InviteMemberDialog } from "@/components/dashboard/invite-member-dialog";
import type { ApiResponse } from "@/types/api";

function displayName(m: { username: string | null; firstName: string | null; lastName: string | null }) {
  if (m.username) return `@${m.username}`;
  return [m.firstName, m.lastName].filter(Boolean).join(" ") || "User";
}

export function TeamTable() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useTeamMembers();
  const roleKey = useAuthStore((s) => s.user?.roleKey ?? null);
  const members = data?.members ?? [];
  const canManage = roleKey === "FOUNDER";
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, setPending] = React.useState<null | { memberId: string; roleKey?: string; isActive?: boolean; title: string; description: string }>(null);

  const mutateMember = useMutation({
    mutationFn: async (input: { memberId: string; roleKey?: string; isActive?: boolean }) => {
      const res = await fetch(`/api/team/members/${input.memberId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roleKey: input.roleKey, isActive: input.isActive }),
      });
      const json = (await res.json()) as ApiResponse<{ member: unknown }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Update failed");
    },
    onSuccess: async () => {
      toast.success("Updated");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["team", "members"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium">Team members</div>
        {canManage ? <InviteMemberDialog /> : null}
      </div>
      {error ? (
        <div className="mb-3 rounded-xl border bg-card/40 p-3 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load"}
        </div>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Handle</TableHead>
            <TableHead className="text-right">Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="text-muted-foreground">Loading…</TableCell>
                  <TableCell />
                  <TableCell />
                </TableRow>
              ))
            : members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{displayName(m.user)}</TableCell>
                  <TableCell className="text-muted-foreground">{m.user.username ? `@${m.user.username}` : "—"}</TableCell>
                  <TableCell className="text-right">
                    {canManage ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="sm" disabled={mutateMember.isPending}>
                            {m.role.key}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              if (m.role.key === "ADMIN") {
                                setPending({
                                  memberId: m.id,
                                  roleKey: "STAFF",
                                  title: "Downgrade to staff?",
                                  description: "This removes admin permissions for this member.",
                                });
                                setConfirmOpen(true);
                                return;
                              }
                              mutateMember.mutate({ memberId: m.id, roleKey: "STAFF" });
                            }}
                          >
                            Staff
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => mutateMember.mutate({ memberId: m.id, roleKey: "ADMIN" })}>
                            Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setPending({
                                memberId: m.id,
                                isActive: false,
                                title: "Remove member?",
                                description: "This deactivates the member and removes their access immediately.",
                              });
                              setConfirmOpen(true);
                            }}
                          >
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        {m.role.key}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.title ?? "Confirm action"}</AlertDialogTitle>
            <AlertDialogDescription>{pending?.description ?? "This action affects team access and permissions."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutateMember.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!pending || mutateMember.isPending}
              onClick={() => {
                if (!pending) return;
                mutateMember.mutate({ memberId: pending.memberId, roleKey: pending.roleKey, isActive: pending.isActive });
                setPending(null);
                setConfirmOpen(false);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
