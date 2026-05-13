import "@/modules/bootstrap/server";

import { cookies } from "next/headers";
import { withApi, jsonOk, jsonErr } from "@/packages/validation/api";
import { env } from "@/lib/env";
import { telegramAuthBodySchema, telegramWidgetUserSchema } from "@/lib/validators/auth";
import { verifyTelegramLoginWidget, verifyTelegramWebAppInitData } from "@/lib/telegram/verify";
import { prisma } from "@/lib/db/prisma";
import { createSessionToken } from "@/lib/auth/session";
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from "@/lib/auth/cookies";
import { ensureUserHasTeam } from "@/modules/team/team.service";
import { acceptInvite } from "@/modules/team/invites.service";
import { logActivity } from "@/modules/activity/activity.service";
import { enforceRateLimit } from "@/lib/ratelimit";
import { obsEnd, obsError, obsStart, obsLog } from "@/lib/obs/server";
import { HttpError } from "@/packages/core/http-error";

export const dynamic = "force-dynamic";

export const telegramAuthPOST = withApi(async (request) => {
  const obs = obsStart(request, "/api/auth/telegram");
  try {
    await enforceRateLimit({ request, preset: "auth", key: "auth" });
    const body = telegramAuthBodySchema.parse(await request.json());
    const botToken = env.TELEGRAM_BOT_TOKEN;

    const profile =
      body.type === "webapp"
        ? verifyTelegramWebAppInitData(body.initData, botToken)
        : verifyTelegramLoginWidget(telegramWidgetUserSchema.parse(body.user), botToken);

    if (!profile) throw new HttpError("Invalid Telegram auth payload", 401, "TELEGRAM_INVALID");

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
    return jsonOk({ userId: user.id, teamId }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e, { status: 400 });
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});

