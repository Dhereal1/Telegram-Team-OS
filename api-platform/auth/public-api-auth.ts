import "server-only";

import { HttpError } from "@/packages/core/http-error";
import { prisma } from "@/lib/db/prisma";
import { splitPublicApiKey } from "@/api-platform/auth/api-key-format";
import { hashApiKeySecret, safeEqualHex } from "@/api-platform/auth/api-key-hash";
import { assertPublicApiScopes, type PublicApiScope } from "@/api-platform/scopes";
import { enforcePublicApiDailyQuota } from "@/api-platform/usage/quota";

export type PublicApiAuthContext = {
  teamId: string;
  installId: string;
  appKey: string;
  apiKeyId: string;
  actorUserId: string | null;
  scopes: PublicApiScope[];
};

function bearerFromRequest(request: Request) {
  const h = request.headers.get("authorization")?.trim() ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1]?.trim() ?? null;
}

export async function requirePublicApiAuth(request: Request, requiredScopes: PublicApiScope[] = []) {
  const token = bearerFromRequest(request);
  if (!token) throw new HttpError("Missing Authorization header", 401, "UNAUTHORIZED");

  const parsed = splitPublicApiKey(token);
  if (!parsed) throw new HttpError("Invalid API key", 401, "UNAUTHORIZED");

  const hash = hashApiKeySecret(parsed);
  const row = await prisma.workspaceAppApiKey.findFirst({
    where: { prefix: parsed.prefix, status: "ACTIVE" },
    select: {
      id: true,
      hash: true,
      scopes: true,
      expiresAt: true,
      actorUserId: true,
      install: { select: { id: true, status: true, teamId: true, app: { select: { key: true } } } },
    },
  });
  if (!row || !safeEqualHex(row.hash, hash)) throw new HttpError("Invalid API key", 401, "UNAUTHORIZED");
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) throw new HttpError("API key expired", 401, "UNAUTHORIZED");
  if (!row.install || row.install.status !== "ENABLED") throw new HttpError("App install disabled", 403, "FORBIDDEN");

  const scopes = assertPublicApiScopes(Array.isArray(row.scopes) ? (row.scopes as string[]) : []);
  for (const s of requiredScopes) {
    if (!scopes.includes(s)) throw new HttpError("Missing scope", 403, "FORBIDDEN");
  }

  // Phase 10: quota enforcement (market readiness).
  // Keep this here so all public API routes inherit it consistently.
  await enforcePublicApiDailyQuota({ apiKeyId: row.id });

  // Best-effort lastUsedAt.
  void prisma.workspaceAppApiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return {
    teamId: row.install.teamId,
    installId: row.install.id,
    appKey: row.install.app.key,
    apiKeyId: row.id,
    actorUserId: row.actorUserId ?? null,
    scopes,
  } satisfies PublicApiAuthContext;
}
