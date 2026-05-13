import "@/modules/bootstrap/server";

import { z } from "zod";
import { withApi, jsonOk } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { requireRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { ensureWorkspaceInstall } from "@/packages/platform-core/registry";
import { issuePublicApiKey } from "@/api-platform/auth/api-key-issue";
import { publicApiScopeSchema, publicApiScopesList } from "@/api-platform/scopes";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";
import { logSecurityEvent } from "@/modules/security/security-events.service";

export const dynamic = "force-dynamic";

const createKeySchema = z.object({
  appKey: z.string().min(3).max(80),
  name: z.string().min(1).max(80).default("Default"),
  scopes: z.array(publicApiScopeSchema).min(1).default([publicApiScopesList[0]]),
  expiresAt: z.string().datetime().optional(),
});

export const GET = withApi(async (request) => {
  const obs = obsStart(request, "/api/platform/public-api/keys");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    requireRole(session.roleKey ?? null, "ADMIN");

    const teamId = session.teamId!;
    const keys = await prisma.workspaceAppApiKey.findMany({
      where: { install: { teamId } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        status: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        install: { select: { id: true, app: { select: { key: true, name: true } } } },
      },
      take: 200,
    });

    obsEnd(obs, 200, { count: keys.length });
    return jsonOk({ keys }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    throw e;
  }
});

export const POST = withApi(async (request) => {
  const obs = obsStart(request, "/api/platform/public-api/keys");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    requireRole(session.roleKey ?? null, "ADMIN");

    const body = createKeySchema.parse(await request.json());
    const teamId = session.teamId!;
    const install = await ensureWorkspaceInstall(teamId, body.appKey, { status: "ENABLED" });

    // Retry-on-collision for unique prefix.
    let issued: ReturnType<typeof issuePublicApiKey> | null = null;
    for (let i = 0; i < 5; i++) {
      const candidate = issuePublicApiKey();
      const exists = await prisma.workspaceAppApiKey.findUnique({ where: { prefix: candidate.prefix }, select: { id: true } });
      if (!exists) {
        issued = candidate;
        break;
      }
    }
    if (!issued) throw new Error("Failed to issue API key");

    const row = await prisma.workspaceAppApiKey.create({
      data: {
        installId: install.id,
        name: body.name,
        prefix: issued.prefix,
        hash: issued.hash,
        scopes: body.scopes as never,
        actorUserId: session.userId,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        status: "ACTIVE",
      },
      select: { id: true, prefix: true, createdAt: true },
    });

    void logSecurityEvent({
      teamId,
      userId: session.userId,
      severity: "INFO",
      type: "public_api.key.created",
      message: "Public API key created",
      metadata: { appKey: body.appKey, apiKeyId: row.id, scopes: body.scopes, expiresAt: body.expiresAt ?? null },
    }).catch(() => {});

    obsEnd(obs, 200);
    return jsonOk(
      {
        key: {
          id: row.id,
          prefix: row.prefix,
          createdAt: row.createdAt,
          token: issued.token, // only returned once
        },
      },
      { headers: { "x-request-id": obs.requestId } },
    );
  } catch (e: unknown) {
    obsError(obs, e);
    throw e;
  }
});
