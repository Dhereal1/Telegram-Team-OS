"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/hooks/use-dashboard";
import { useAuthStore } from "@/store/auth-store";

const DISMISS_KEY = "dhereal:onboarding_dismissed";

export function OnboardingChecklist() {
  const roleKey = useAuthStore((s) => s.user?.roleKey ?? null);
  const isFounderLane = roleKey === "FOUNDER" || roleKey === "ADMIN";
  const { data, isLoading } = useDashboard();
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
      key: "telegramConnected",
      label: "Connect your Telegram team chat",
      done: onboarding.telegramConnected,
      href: "/settings",
      cta: "Telegram setup",
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
              </div>
            </div>
            {step.done ? null : (
              <Button asChild size="sm" variant="secondary">
                <Link href={step.href}>{step.cta}</Link>
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
