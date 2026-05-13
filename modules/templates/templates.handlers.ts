import "@/modules/bootstrap/server";

import { withApi, jsonOk } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { requireRole } from "@/lib/auth/permissions";
import { z } from "zod";
import { bootstrapTemplates, installTemplate, listTemplates } from "@/modules/templates/templates.service";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const installSchema = z.object({
  key: z.enum(["creator"]),
});

export const templatesGET = withApi(async () => {
  const session = await requireApiSession();
  requireRole(session.roleKey ?? null, "ADMIN");
  await bootstrapTemplates();
  return jsonOk({ templates: await listTemplates() });
});

export const templatesPOST = withApi(async (request) => {
  const session = await requireApiSession();
  requireRole(session.roleKey ?? null, "ADMIN");
  await bootstrapTemplates();
  const body = installSchema.parse(await request.json());
  const team = await prisma.team.findUnique({ where: { id: session.teamId! }, select: { telegramChatId: true } });
  const res = await installTemplate({
    teamId: session.teamId!,
    installedById: session.userId,
    templateKey: body.key,
    teamChatId: team?.telegramChatId ? String(team.telegramChatId) : null,
  });
  return jsonOk(res, { status: 201 });
});

