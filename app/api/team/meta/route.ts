import { jsonErr, jsonOk, HttpError } from "@/lib/utils/api";
import { requireApiSession } from "@/lib/auth/api";
import { requireRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { getTeamBillingMeta } from "@/services/billing/billing-service";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";
import { enforceRateLimit } from "@/lib/ratelimit";
import { logActivity } from "@/services/activity/activity-service";

export const dynamic = "force-dynamic";

const updateTeamMetaSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  timezone: z.string().min(1).optional(),
});

const teamSelect = {
  id: true,
  name: true,
  slug: true,
  telegramChatId: true,
  timezone: true,
  createdAt: true,
  updatedAt: true,
  planTier: true,
} as const;

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const obs = obsStart(request, "/api/team/meta");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;

    const team = (await prisma.team.findUnique({
      where: { id: session.teamId! },
      select: teamSelect as unknown as never,
    })) as unknown as {
      id: string;
      name: string;
      slug: string;
      telegramChatId: bigint | null;
      timezone: string;
      createdAt: Date;
      updatedAt: Date;
      planTier: "FREE" | "PRO" | "BUSINESS";
    } | null;
    if (!team) throw new HttpError("Not found", 404, "NOT_FOUND");
    const teamDto = { ...team, telegramChatId: team.telegramChatId ? String(team.telegramChatId) : null };

    const billing = await getTeamBillingMeta(session.teamId!);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    const webhookUrl = appUrl ? `${appUrl}/api/telegram/webhook` : null;

    obsEnd(obs, 200);
    return jsonOk(
      {
        team: teamDto,
        webhookUrl,
        billing,
      },
      { headers: { "x-request-id": obs.requestId } },
    );
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}

export async function PATCH(request: Request) {
  const obs = obsStart(request, "/api/team/meta");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    requireRole(session.roleKey ?? null, "ADMIN");
    await enforceRateLimit({ request, preset: "mutation", identity: `u:${session.userId}`, key: "mut" });

    const body = updateTeamMetaSchema.parse(await request.json());
    if (!body.name && !body.timezone) throw new HttpError("No updates provided", 400, "NO_UPDATES");

    if (body.timezone && !isValidTimezone(body.timezone)) {
      throw new HttpError("Invalid timezone", 400, "INVALID_TIMEZONE");
    }

    const updated = (await prisma.team.update({
      where: { id: session.teamId! },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.timezone ? { timezone: body.timezone } : {}),
      },
      select: teamSelect as unknown as never,
    })) as unknown as {
      id: string;
      name: string;
      slug: string;
      telegramChatId: bigint | null;
      timezone: string;
      createdAt: Date;
      updatedAt: Date;
      planTier: "FREE" | "PRO" | "BUSINESS";
    };
    const teamDto = { ...updated, telegramChatId: updated.telegramChatId ? String(updated.telegramChatId) : null };

    await logActivity({
      teamId: session.teamId!,
      actorId: session.userId,
      action: "team.updated",
      entityType: "Team",
      entityId: String(updated.id),
      metadata: { name: String(updated.name), timezone: String(updated.timezone) },
    });

    obsEnd(obs, 200);
    return jsonOk({ team: teamDto }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error && e.name === "ZodError") return jsonErr(e.message, { status: 400, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}
