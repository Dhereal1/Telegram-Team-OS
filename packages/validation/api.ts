import { z } from "zod";
import { HttpError } from "@/packages/core/http-error";

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; code?: string };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data } satisfies ApiOk<T>, init);
}

export function jsonErr(error: string, init?: ResponseInit & { code?: string }) {
  const { code, ...rest } = init ?? {};
  const status = rest.status ?? 400;
  return Response.json({ ok: false, error, code } satisfies ApiErr, { ...rest, status });
}

export async function parseJson<TSchema extends z.ZodTypeAny>(request: Request, schema: TSchema) {
  const raw = await request.json();
  return schema.parse(raw) as z.infer<TSchema>;
}

export type ApiHandler<TCtx = unknown> = (request: Request, ctx: TCtx) => Promise<Response>;

export function withApi<TCtx>(handler: ApiHandler<TCtx>): ApiHandler<TCtx> {
  return async (request, ctx) => {
    try {
      return await handler(request, ctx);
    } catch (e: unknown) {
      if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code });
      if (e instanceof z.ZodError) return jsonErr("Invalid request", { status: 400, code: "VALIDATION_ERROR" });
      if (e instanceof Error) return jsonErr(e.message, { status: 500, code: "INTERNAL_ERROR" });
      return jsonErr("Unknown error", { status: 500, code: "INTERNAL_ERROR" });
    }
  };
}
