import "@/modules/bootstrap/server";

import { withApi, jsonOk, parseJson } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { requireRole } from "@/lib/auth/permissions";
import { registerApp, listActiveApps } from "@/packages/platform-core/registry";
import { developerAppRegistrationSchema } from "@/developer-platform/app-registration";

export const dynamic = "force-dynamic";

function isDeveloperManifest(manifest: unknown): manifest is { kind: "developer" } {
  return Boolean(manifest && typeof manifest === "object" && (manifest as { kind?: unknown }).kind === "developer");
}

export const GET = withApi(async () => {
  const session = await requireApiSession();
  requireRole(session.roleKey ?? null, "ADMIN");
  const apps = await listActiveApps();
  const developerApps = apps.filter((a) => isDeveloperManifest(a.manifest));
  return jsonOk({ developerApps });
});

export const POST = withApi(async (request) => {
  const session = await requireApiSession();
  requireRole(session.roleKey ?? null, "ADMIN");
  const manifest = await parseJson(request, developerAppRegistrationSchema);
  const app = await registerApp(manifest);
  return jsonOk({ app });
});
