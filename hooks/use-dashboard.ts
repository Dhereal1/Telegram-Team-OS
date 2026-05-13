"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";

export type DashboardDto = {
  team: {
    id: string;
    name: string;
    slug: string;
    telegramChatId: string | null;
    planTier: "FREE" | "PRO" | "BUSINESS";
    createdAt: string;
    updatedAt: string;
  };
  stats: {
    taskPending: number;
    taskCompleted: number;
    taskOverdue: number;
    blockedTasks: number;
    dueToday: number;
    reportsToday: number;
    missingReports: number;
    completionRate: number;
    myOpenTasks: number;
    members: number;
  };
  onboarding: {
    teamNameCustomized: boolean;
    invitedStaff: boolean;
    createdFirstTask: boolean;
    submittedFirstReport: boolean;
    telegramConnected: boolean;
    complete: boolean;
    nextAction: string;
  };
  summary: {
    headline: string;
    subheadline: string;
    focusItems: string[];
  };
  attention: {
    overdueTasks: Array<{
      id: string;
      title: string;
      status: "TODO" | "IN_PROGRESS" | "BLOCKED";
      priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
      dueAt: string | null;
      assigneeLabel: string;
    }>;
    blockedTasks: Array<{
      id: string;
      title: string;
      status: "BLOCKED";
      priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
      updatedAt: string;
      assigneeLabel: string;
    }>;
    missingReports: Array<{
      id: string;
      name: string;
      roleKey: "ADMIN" | "STAFF";
      title: string | null;
    }>;
  };
  activity: Array<{
    id: string;
    action: string;
    entityType: string | null;
    entityId: string | null;
    createdAt: string;
    metadata?: Record<string, unknown> | null;
    actor: { id: string; username: string | null; firstName: string | null; lastName: string | null } | null;
  }>;
  digest: {
    digest: string;
    provider: string;
    createdAt: string;
  };
};

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async (): Promise<{ dashboard: DashboardDto }> => {
      const res = await fetch("/api/dashboard");
      const json = (await res.json()) as ApiResponse<{ dashboard: DashboardDto }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Failed to load dashboard");
      return json.data;
    },
  });
}
