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

export class HttpError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

