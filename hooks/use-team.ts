"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";

export type TeamMemberDto = {
  id: string;
  title: string | null;
  role: { key: "FOUNDER" | "ADMIN" | "STAFF"; name: string };
  user: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    photoUrl: string | null;
  };
};

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team", "members"],
    queryFn: async (): Promise<{ members: TeamMemberDto[] }> => {
      const res = await fetch("/api/team");
      const json = (await res.json()) as ApiResponse<{ members: TeamMemberDto[] }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Failed to load team");
      return json.data;
    },
  });
}

export type TeamInviteDto = {
  id: string;
  token: string;
  roleKey: "ADMIN" | "STAFF" | "FOUNDER";
  expiresAt: string;
  createdAt: string;
};

export function useTeamInvites() {
  return useQuery({
    queryKey: ["team", "invites"],
    queryFn: async (): Promise<{ invites: TeamInviteDto[] }> => {
      const res = await fetch("/api/team/invites");
      const json = (await res.json()) as ApiResponse<{ invites: TeamInviteDto[] }>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Failed to load invites");
      return json.data;
    },
    retry: 0,
  });
}

