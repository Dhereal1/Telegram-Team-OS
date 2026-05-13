import { describe, expect, it } from "vitest";
import { jsonErr, jsonOk } from "@/packages/validation/api";

describe("packages/validation/api", () => {
  it("jsonOk wraps data with ok=true", async () => {
    const res = jsonOk({ hello: "world" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; data: unknown };
    expect(body.ok).toBe(true);
    expect(body.data).toEqual({ hello: "world" });
  });

  it("jsonErr sets ok=false and status", async () => {
    const res = jsonErr("nope", { status: 418, code: "TEAPOT" });
    expect(res.status).toBe(418);
    const body = (await res.json()) as { ok: boolean; error: string; code?: string };
    expect(body.ok).toBe(false);
    expect(body.error).toBe("nope");
    expect(body.code).toBe("TEAPOT");
  });
});

