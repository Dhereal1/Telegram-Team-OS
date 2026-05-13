"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";

export type OverviewDto = { openTasks: number; dueReports: number; members: number; insights: number };

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: async (): Promise<{ overview: OverviewDto }> => {
      const res = await fetch("/api/analytics");
      const json = (await res.json()) as ApiResponse<{ overview: OverviewDto }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Failed to load analytics");
      return json.data;
    },
  });
}

