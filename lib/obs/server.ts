import "server-only";

import crypto from "crypto";

export type ObsContext = {
  requestId: string;
  startMs: number;
  route: string;
  method: string;
  userId?: string;
  teamId?: string | null;
};

function nowMs() {
  return Date.now();
}

export function getRequestId(request: Request) {
  const incoming = request.headers.get("x-request-id")?.trim();
  if (incoming) return incoming.slice(0, 96);
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.randomBytes(16).toString("hex");
}

export function obsStart(request: Request, route: string, meta?: { userId?: string; teamId?: string | null }) {
  const ctx: ObsContext = {
    requestId: getRequestId(request),
    startMs: nowMs(),
    route,
    method: request.method,
    userId: meta?.userId,
    teamId: meta?.teamId ?? null,
  };
  obsLog("api.request", ctx, {});
  return ctx;
}

export function obsEnd(ctx: ObsContext, status: number, extra?: Record<string, unknown>) {
  const durationMs = nowMs() - ctx.startMs;
  obsLog("api.response", ctx, { status, durationMs, ...extra });
}

export function obsError(ctx: ObsContext, error: unknown, extra?: Record<string, unknown>) {
  const durationMs = nowMs() - ctx.startMs;
  const isDev = process.env.NODE_ENV !== "production";
  const err = error instanceof Error ? error : new Error("Unknown error");
  obsLog("api.error", ctx, {
    durationMs,
    message: err.message,
    name: err.name,
    ...(isDev ? { stack: err.stack } : {}),
    ...extra,
  });
}

export function obsLog(type: string, ctx: Pick<ObsContext, "requestId" | "route" | "method" | "userId" | "teamId">, extra: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    type,
    requestId: ctx.requestId,
    route: ctx.route,
    method: ctx.method,
    userId: ctx.userId ?? null,
    teamId: ctx.teamId ?? null,
    ...extra,
  };
  // One-line JSON for production log pipelines.
  console.log(JSON.stringify(payload));
}

