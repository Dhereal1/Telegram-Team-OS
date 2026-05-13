import "server-only";

import { HttpError } from "@/lib/utils/api";

export type RoleKey = "FOUNDER" | "ADMIN" | "STAFF";

export const ROLE_RANK: Record<RoleKey, number> = {
  FOUNDER: 3,
  ADMIN: 2,
  STAFF: 1,
};

export function requireRole(role: RoleKey | null | undefined, min: RoleKey) {
  if (!role) throw new HttpError("Forbidden", 403, "FORBIDDEN");
  if (ROLE_RANK[role] < ROLE_RANK[min]) throw new HttpError("Forbidden", 403, "FORBIDDEN");
  return role;
}

export function can(role: RoleKey | null | undefined, min: RoleKey) {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

