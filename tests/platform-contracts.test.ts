import { describe, expect, it } from "vitest";
import { defineContract } from "@/packages/platform-core/gateway";
import { z } from "zod";

describe("platform contracts", () => {
  it("defineContract carries request/response schemas", () => {
    const c = defineContract({
      id: "x.test.v1",
      version: 1,
      request: z.object({ a: z.string() }),
      response: z.object({ ok: z.boolean() }),
    });
    expect(c.id).toBe("x.test.v1");
    expect(() => c.request.parse({ a: "1" })).not.toThrow();
  });
});

