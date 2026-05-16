"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamMeta } from "@/hooks/use-team-meta";
import type { ApiResponse } from "@/types/api";

export function SettingsPanel() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useTeamMeta();
  const [teamName, setTeamName] = React.useState<string | null>(null);
  const teamNameValue = (teamName ?? data?.team?.name ?? "").trim();
  const [timezone, setTimezone] = React.useState<string | null>(null);
  const timezoneValue = (timezone ?? data?.team?.timezone ?? "UTC").trim();

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/team/meta", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: teamNameValue }),
      });
      const json = (await res.json()) as ApiResponse<{ team: { id: string } }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Save failed");
    },
    onSuccess: async () => {
      toast.success("Saved");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["team", "meta"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const saveTimezone = useMutation({
    mutationFn: async (tz: string) => {
      const res = await fetch("/api/team/meta", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ timezone: tz }),
      });
      const json = (await res.json()) as ApiResponse<{ team: { id: string } }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Save failed");
    },
    onSuccess: async () => {
      toast.success("Saved");
      await qc.invalidateQueries({ queryKey: ["team", "meta"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const webhookUrl = data?.webhookUrl ?? "";
  const billing = data?.billing;

  return (
    <Card className="p-4">
      <div className="text-sm font-medium">Settings</div>
      <Tabs defaultValue="general" className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Export (stub)</DropdownMenuItem>
              <DropdownMenuItem>Rotate keys (stub)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <TabsContent value="general" className="mt-4">
          {error ? (
            <div className="mb-4 rounded-2xl border bg-card/40 p-3 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Failed to load settings"}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="team-name">Team name</Label>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Input
                  id="team-name"
                  placeholder="Your team name"
                  value={teamName ?? data?.team?.name ?? ""}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timezone">Timezone</Label>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <select
                  id="timezone"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={timezoneValue}
                  onChange={(e) => {
                    const tz = e.target.value;
                    setTimezone(tz);
                    saveTimezone.mutate(tz);
                  }}
                  disabled={saveTimezone.isPending}
                >
                  {[
                    "Africa/Lagos",
                    "Africa/Nairobi",
                    "Africa/Accra",
                    "Europe/London",
                    "Europe/Paris",
                    "America/New_York",
                    "America/Chicago",
                    "America/Los_Angeles",
                    "America/Sao_Paulo",
                    "Asia/Dubai",
                    "Asia/Singapore",
                    "Asia/Tokyo",
                    "Asia/Kolkata",
                    "Australia/Sydney",
                    "UTC",
                  ].map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="webhook">Telegram webhook URL</Label>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Input id="webhook" readOnly value={webhookUrl || "Set NEXT_PUBLIC_APP_URL to compute webhook URL"} />
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  Telegram setup
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Telegram foundation</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <Alert>
                    <AlertTitle>Webhook ready</AlertTitle>
                    <AlertDescription>
                      Set your bot webhook to `/api/telegram/webhook`. If you set `TELEGRAM_WEBHOOK_SECRET`, Telegram will
                      send `X-Telegram-Bot-Api-Secret-Token` and the route validates it.
                    </AlertDescription>
                  </Alert>
                  <div className="rounded-xl border bg-card/40 p-3">
                    Mini App auth uses `initData` validation in `/api/auth/telegram`.
                  </div>
                  <div className="rounded-xl border bg-card/40 p-3">
                    {data?.team?.telegramChatId ? "Telegram chat is connected." : "Telegram chat is not connected yet. Run /start in your team chat to bind it."}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => save.mutate()}
              disabled={
                isLoading ||
                save.isPending ||
                teamNameValue.length < 2
              }
            >
              Save
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border bg-card/40 p-4">
              <div className="text-sm font-medium">Upstash Redis</div>
              <p className="mt-2 text-sm text-muted-foreground">Cache + rate limits scaffolded. Enable via env vars.</p>
            </div>
            <div className="rounded-2xl border bg-card/40 p-4">
              <div className="text-sm font-medium">TON Connect</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Wallet UI is gated behind `NEXT_PUBLIC_TON_MANIFEST_URL`.
              </p>
            </div>
            <div className="rounded-2xl border bg-card/40 p-4 md:col-span-2">
              <div className="text-sm font-medium">Billing foundation</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Plan: {billing?.planTier ?? data?.team?.planTier ?? "FREE"} · Usage (tasks/reports/invites):{" "}
                {billing ? `${billing.usageTasksCount}/${billing.usageReportsCount}/${billing.usageInvitesCount}` : "—"}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
