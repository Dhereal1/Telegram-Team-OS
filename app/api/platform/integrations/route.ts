import "@/modules/bootstrap/server";

import { withApi, jsonOk } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { requireRole } from "@/lib/auth/permissions";
import { listActiveApps } from "@/packages/platform-core/registry";
import { bootstrapIntegrationsRegistry } from "@/integrations/registry";

export const dynamic = "force-dynamic";

function isIntegrationManifest(manifest: unknown): manifest is { kind: "integration" } {
  return Boolean(manifest && typeof manifest === "object" && (manifest as { kind?: unknown }).kind === "integration");
}

export const GET = withApi(async () => {
  const session = await requireApiSession();
  requireRole(session.roleKey ?? null, "ADMIN");
  await bootstrapIntegrationsRegistry();
  const apps = await listActiveApps();
  const integrations = apps.filter((a) => isIntegrationManifest(a.manifest));
  return jsonOk({ integrations });
});
