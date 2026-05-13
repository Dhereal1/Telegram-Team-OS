import "@/modules/bootstrap/server";

import { withApi, jsonOk } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { requireRole } from "@/lib/auth/permissions";
import { listActiveApps } from "@/packages/platform-core/registry";
import { bootstrapPlatformRegistry } from "@/platform/bootstrap";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const session = await requireApiSession();
  requireRole(session.roleKey ?? null, "ADMIN");
  await bootstrapPlatformRegistry();
  const apps = await listActiveApps();
  return jsonOk({ apps });
});
