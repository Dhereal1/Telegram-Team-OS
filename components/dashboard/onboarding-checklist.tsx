"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/hooks/use-dashboard";
import { useTeamMeta } from "@/hooks/use-team-meta";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import type { ApiResponse } from "@/types/api";

const DISMISS_KEY = "dhereal:onboarding_dismissed";

export function OnboardingChecklist() {
  const roleKey = useAuthStore((s) => s.user?.roleKey ?? null);
  const isFounderLane = roleKey === "FOUNDER" || roleKey === "ADMIN";
  const { data, isLoading } = useDashboard();
  const teamMeta = useTeamMeta();
  const [deepLink, setDeepLink] = React.useState<string | null>(null);
  const [dismissed, setDismissed] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  });

  if (!isFounderLane) return null;
  if (isLoading) return null;
  const onboarding = data?.dashboard.onboarding;
  if (!onboarding) return null;
  if (onboarding.complete) return null;
  if (dismissed) return null;

  const telegramLinked = Boolean(teamMeta.data?.team.telegramChatId);

  const steps = [
    {
      key: "teamNameCustomized",
      label: "Set a real team name",
      done: onboarding.teamNameCustomized,
      href: "/settings",
      cta: "Open settings",
    },
    {
      key: "invitedStaff",
      label: "Invite your first staff member",
      done: onboarding.invitedStaff,
      href: "/team?invite=1",
      cta: "Invite member",
    },
    {
      key: "createdFirstTask",
      label: "Create your first task",
      done: onboarding.createdFirstTask,
      href: "/tasks?new=1",
      cta: "New task",
    },
    {
      key: "submittedFirstReport",
      label: "Submit your first report",
      done: onboarding.submittedFirstReport,
      href: "/reports?new=1",
      cta: "New report",
    },
    {
      key: "telegramLinked",
      label: "Link your Telegram group",
      done: telegramLinked,
      href: "/settings",
      cta: "Generate link",
    },
  ] as const;

  return (
    <Card className="rounded-3xl border-border/70 bg-card/95 p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" />
            Launch checklist
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Reach value in minutes. Next action: <span className="font-medium text-foreground">{onboarding.nextAction}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.16em]">
            Phase 1
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              window.localStorage.setItem(DISMISS_KEY, "1");
              setDismissed(true);
            }}
          >
            Dismiss
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {steps.map((step) => (
          <div key={step.key} className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-background/70 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              {step.done ? (
                <CheckCircle2 className="mt-0.5 size-5 text-emerald-500" />
              ) : (
                <Circle className="mt-0.5 size-5 text-muted-foreground" />
              )}
              <div>
                <div className="text-sm font-medium">{step.label}</div>
                <div className="text-xs text-muted-foreground">{step.done ? "Completed" : "Recommended to ship confidently"}</div>
                {step.key === "telegramLinked" && !step.done && deepLink ? (
                  <div className="mt-2 flex flex-col gap-2">
                    <input
                      className="h-9 w-full rounded-md border bg-background px-3 text-xs"
                      readOnly
                      value={deepLink}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          await navigator.clipboard.writeText(deepLink);
                          toast.success("Invite link copied");
                        }}
                      >
                        Copy link
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <a href={deepLink} target="_blank" rel="noreferrer">
                          Open in Telegram
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            {step.done ? null : (
              step.key === "telegramLinked" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/team/invites", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ roleKey: "STAFF" }),
                      });
                      const json = (await res.json()) as ApiResponse<{ deepLink: string }>;
                      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Failed to generate invite link");
                      setDeepLink(json.data.deepLink);
                      toast.success("Invite link generated");
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "Failed to generate invite link");
                    }
                  }}
                  disabled={teamMeta.isLoading}
                >
                  {step.cta}
                </Button>
              ) : (
                <Button asChild size="sm" variant="secondary">
                  <Link href={step.href}>{step.cta}</Link>
                </Button>
              )
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
