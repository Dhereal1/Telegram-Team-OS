"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { ReportDto } from "@/hooks/use-reports";

export function useReport(reportId: string) {
  return useQuery({
    queryKey: ["reports", reportId],
    queryFn: async (): Promise<{ report: ReportDto; summary: string | null }> => {
      const res = await fetch(`/api/reports/${reportId}`);
      const json = (await res.json()) as ApiResponse<{ report: ReportDto; summary: string | null }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Failed to load report");
      return json.data;
    },
  });
}
