export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; code?: string };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

