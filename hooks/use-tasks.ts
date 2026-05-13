"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";

type TaskDto = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueAt: string | null;
  completedAt: string | null;
  assignedToId: string | null;
  assignedTo: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  createdBy: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async (): Promise<{ tasks: TaskDto[] }> => {
      const res = await fetch("/api/tasks", { method: "GET" });
      const json = (await res.json()) as ApiResponse<{ tasks: TaskDto[] }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Failed to load tasks");
      return json.data;
    },
  });
}
