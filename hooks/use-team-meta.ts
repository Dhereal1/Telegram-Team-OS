"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";

export type TeamMetaDto = {
  team: {
    id: string;
    name: string;
    slug: string;
    telegramChatId: string | null;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    planTier: "FREE" | "PRO" | "BUSINESS";
  };
  webhookUrl: string | null;
  billing: {
    planTier: "FREE" | "PRO" | "BUSINESS";
    planStartedAt: string | null;
    billingProvider: string | null;
    billingCustomerId: string | null;
    billingStatus: string | null;
    usageWindowStart: string;
    usageTasksCount: number;
    usageReportsCount: number;
    usageInvitesCount: number;
  } | null;
};

export function useTeamMeta() {
  return useQuery({
    queryKey: ["team", "meta"],
    queryFn: async (): Promise<TeamMetaDto> => {
      const res = await fetch("/api/team/meta");
      const json = (await res.json()) as ApiResponse<TeamMetaDto>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Failed to load team meta");
      return json.data;
    },
  });
}
