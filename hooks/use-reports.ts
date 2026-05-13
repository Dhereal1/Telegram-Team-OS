"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";

export type ReportDto = {
  id: string;
  title: string;
  status: "DRAFT" | "SUBMITTED" | "REVIEWED";
  createdAt: string;
  updatedAt: string;
  authorId: string;
  body: string;
  author: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  reviewNotes: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  reviewedBy: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  periodStart: string | null;
  periodEnd: string | null;
};

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: async (): Promise<{ reports: ReportDto[] }> => {
      const res = await fetch("/api/reports");
      const json = (await res.json()) as ApiResponse<{ reports: ReportDto[] }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Failed to load reports");
      return json.data;
    },
  });
}
