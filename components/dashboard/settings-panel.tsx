"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { getPlanLimits } from "@/lib/billing/plans";
import { useSearchParams } from "next/navigation";
import type { ApiResponse } from "@/types/api";

export function SettingsPanel() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useTeamMeta();
  const sp = useSearchParams();
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

  React.useEffect(() => {
    const upgraded = sp.get("upgraded");
    if (upgraded === "1") {
      toast.success(`You are now on the ${data?.team?.planTier ?? "PRO"} plan`);
    }
  }, [sp, data?.team?.planTier]);

  const usage = useQuery({
    queryKey: ["team", "usage"],
    queryFn: async () => {
      const res = await fetch("/api/team/usage");
      const json = (await res.json()) as ApiResponse<{
        planTier: "FREE" | "PRO" | "BUSINESS";
        limits: ReturnType<typeof getPlanLimits>;
        usage: { tasks: number; reports: number; members: number };
        windowStart: string;
      }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Failed to load usage");
      return json.data;
    },
  });

  const upgrade = useMutation({
    mutationFn: async (plan: "PRO" | "BUSINESS") => {
      const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan }) });
      const json = (await res.json()) as ApiResponse<{ url: string }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Checkout failed");
      return json.data.url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Checkout failed"),
  });

  const portal = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = (await res.json()) as ApiResponse<{ url: string }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Portal failed");
      return json.data.url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Portal failed"),
  });

  const planTier = usage.data?.planTier ?? data?.team?.planTier ?? "FREE";
  const limits = usage.data?.limits ?? getPlanLimits(planTier);
  const used = usage.data?.usage;
  const pct = (val: number, max: number) => Math.max(0, Math.min(100, Math.round((val / Math.max(1, max)) * 100)));

  return (
    <Card className="p-4">
      <div className="text-sm font-medium">Settings</div>
      <Tabs defaultValue="general" className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
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

        <TabsContent value="billing" className="mt-4">
          <div className="grid gap-3">
            <div className="rounded-2xl border bg-card/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Plan</div>
                  <div className="mt-1 text-xs text-muted-foreground">Billing and usage limits reset every 30 days.</div>
                </div>
                <div className="rounded-full border px-3 py-1 text-xs">{planTier}</div>
              </div>
              {usage.error ? (
                <div className="mt-3 text-sm text-muted-foreground">{usage.error instanceof Error ? usage.error.message : "Failed to load usage"}</div>
              ) : null}
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  { label: "Tasks", used: used?.tasks ?? 0, max: limits.maxTasksPerMonth },
                  { label: "Reports", used: used?.reports ?? 0, max: limits.maxReportsPerMonth },
                  { label: "Members", used: used?.members ?? 0, max: limits.maxMembers },
                ].map((m) => (
                  <div key={m.label} className="rounded-2xl border bg-background/70 p-3">
                    <div className="text-xs text-muted-foreground">{m.label}</div>
                    <div className="mt-1 text-sm font-medium">
                      {m.used} / {m.max}
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct(m.used, m.max)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {planTier === "FREE" ? (
                  <Button size="sm" onClick={() => upgrade.mutate("PRO")} disabled={upgrade.isPending}>
                    Upgrade to PRO
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => portal.mutate()} disabled={portal.isPending}>
                    Manage billing
                  </Button>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
