import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { jsonErr, jsonOk } from "@/lib/utils/api";
import { telegramAuthBodySchema, telegramWidgetUserSchema } from "@/lib/validators/auth";
import { verifyTelegramLoginWidget, verifyTelegramWebAppInitData } from "@/lib/telegram/verify";
import { prisma } from "@/lib/db/prisma";
import { createSessionToken } from "@/lib/auth/session";
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from "@/lib/auth/cookies";
import { ensureUserHasTeam } from "@/services/team/team-service";
import { logActivity } from "@/services/activity/activity-service";
import { acceptInvite } from "@/services/team/invite-service";
import { obsEnd, obsError, obsStart, obsLog } from "@/lib/obs/server";
import { enforceRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const obs = obsStart(request, "/api/auth/telegram");
  try {
    await enforceRateLimit({ request, preset: "auth", key: "auth" });
    const body = telegramAuthBodySchema.parse(await request.json());
    const botToken = env.TELEGRAM_BOT_TOKEN;

    const profile =
      body.type === "webapp"
        ? verifyTelegramWebAppInitData(body.initData, botToken)
        : verifyTelegramLoginWidget(telegramWidgetUserSchema.parse(body.user), botToken);

    if (!profile) return jsonErr("Invalid Telegram auth payload", { status: 401, code: "TELEGRAM_INVALID" });

    await enforceRateLimit({ request, preset: "auth", identity: `tg:${String(profile.telegramId)}`, key: "telegram" });

    const user = await prisma.user.upsert({
      where: { telegramId: profile.telegramId },
      update: {
        username: profile.username ?? undefined,
        firstName: profile.firstName ?? undefined,
        lastName: profile.lastName ?? undefined,
        photoUrl: profile.photoUrl ?? undefined,
      },
      create: {
        telegramId: profile.telegramId,
        username: profile.username ?? undefined,
        firstName: profile.firstName ?? undefined,
        lastName: profile.lastName ?? undefined,
        photoUrl: profile.photoUrl ?? undefined,
      },
      select: { id: true, username: true, firstName: true, lastName: true },
    });

    let teamId: string;
    if ("inviteToken" in body && body.inviteToken) {
      const joined = await acceptInvite({ token: body.inviteToken, userId: user.id });
      if (joined && joined.ok) {
        teamId = joined.teamId;
      } else {
        teamId = await ensureUserHasTeam(
          user.id,
          user.username ? `${user.username}'s Team` : user.firstName ? `${user.firstName}'s Team` : "Team",
        );
      }
    } else {
      teamId = await ensureUserHasTeam(
        user.id,
        user.username ? `${user.username}'s Team` : user.firstName ? `${user.firstName}'s Team` : "Team",
      );
    }

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await prisma.session.create({
      data: {
        userId: user.id,
        teamId,
        token,
        expiresAt,
      },
    });

    (await cookies()).set(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    await logActivity({
      teamId,
      actorId: user.id,
      action: "auth.login",
      entityType: "User",
      entityId: user.id,
      metadata: { via: body.type },
    });

    obsLog("auth.login", { requestId: obs.requestId, route: obs.route, method: obs.method, userId: user.id, teamId }, { via: body.type });
    obsEnd(obs, 200);
    return jsonOk(
      { userId: user.id, teamId },
      { headers: { "x-request-id": obs.requestId } },
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Bad request";
    const status = e instanceof Error && e.name === "ZodError" ? 400 : 400;
    obsError(obs, e, { status });
    return jsonErr(message, { status, code: "BAD_REQUEST", headers: { "x-request-id": obs.requestId } });
  }
}
