import "server-only";

import { cacheGetJson, cacheSetJson } from "@/modules/performance/cache";
import * as repo from "@/modules/feature-flags/flags.repository";

export async function getWorkspaceFlags(teamId: string) {
  const key = `flags:v1:${teamId}`;
  const cached = await cacheGetJson<Record<string, boolean>>(key).catch(() => null);
  if (cached) return cached;
  const fresh = await repo.getWorkspaceFlagMap(teamId);
  void cacheSetJson(key, fresh, 60).catch(() => {});
  return fresh;
}

export async function isEnabled(teamId: string, flagKey: string) {
  const flags = await getWorkspaceFlags(teamId);
  return Boolean(flags[flagKey]);
}

export { upsertFlag, listFlags, setWorkspaceOverride } from "@/modules/feature-flags/flags.repository";

