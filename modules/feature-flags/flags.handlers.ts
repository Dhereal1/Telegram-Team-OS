import "@/modules/bootstrap/server";

import { withApi, jsonOk } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { requireRole } from "@/lib/auth/permissions";
import { z } from "zod";
import { getWorkspaceFlags, setWorkspaceOverride, upsertFlag, listFlags } from "@/modules/feature-flags/flags.service";

export const dynamic = "force-dynamic";

const setOverrideSchema = z.object({
  key: z.string().min(3).max(80),
  enabled: z.boolean(),
});

const upsertFlagSchema = z.object({
  key: z.string().min(3).max(80),
  description: z.string().max(300).optional(),
  defaultEnabled: z.boolean().default(false),
});

export const flagsGET = withApi(async () => {
  const session = await requireApiSession();
  requireRole(session.roleKey ?? null, "ADMIN");
  const flags = await getWorkspaceFlags(session.teamId!);
  return jsonOk({ flags });
});

export const flagsPUT = withApi(async (request) => {
  const session = await requireApiSession();
  requireRole(session.roleKey ?? null, "ADMIN");
  const body = setOverrideSchema.parse(await request.json());
  await setWorkspaceOverride({ teamId: session.teamId!, flagKey: body.key, enabled: body.enabled });
  const flags = await getWorkspaceFlags(session.teamId!);
  return jsonOk({ flags });
});

// Internal-only: define known flags (no public console yet)
export const flagsAdminPOST = withApi(async (request) => {
  const session = await requireApiSession();
  requireRole(session.roleKey ?? null, "FOUNDER");
  const body = upsertFlagSchema.parse(await request.json());
  await upsertFlag({ key: body.key, description: body.description ?? null, defaultEnabled: body.defaultEnabled });
  return jsonOk({ flags: await listFlags() });
});

