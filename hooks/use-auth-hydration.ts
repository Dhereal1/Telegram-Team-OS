"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import type { ApiResponse } from "@/types/api";

type MeResponse = {
  session:
    | {
        sessionId: string;
        userId: string;
        teamId: string | null;
        roleKey: "FOUNDER" | "ADMIN" | "STAFF" | null;
      }
    | null;
};

export function useAuthHydration() {
  const setUser = useAuthStore((s) => s.setUser);

  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async (): Promise<MeResponse> => {
      const res = await fetch("/api/auth/me");
      const json = (await res.json()) as ApiResponse<MeResponse>;
      if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : "Auth failed");
      return json.data;
    },
    retry: 0,
    staleTime: 15_000,
  });

  React.useEffect(() => {
    if (!query.data) return;
    const s = query.data.session;
    setUser(s ? { userId: s.userId, teamId: s.teamId ?? "", roleKey: s.roleKey } : null);
  }, [query.data, setUser]);

  return query;
}
