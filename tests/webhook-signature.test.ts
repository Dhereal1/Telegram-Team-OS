import { describe, expect, test } from "vitest";
import crypto from "crypto";
import { verifyTeamOSWebhookSignature } from "@/sdk/ts/webhook-verify";

describe("webhook signature", () => {
  test("verifies valid signature", () => {
    const secret = crypto.randomBytes(32).toString("hex");
    const body = JSON.stringify({ hello: "world", n: 1 });
    const timestamp = Math.floor(Date.now() / 1000);
    const mac = crypto.createHmac("sha256", secret);
    mac.update(`${timestamp}.${body}`);
    const sig = mac.digest("hex");
    const header = `t=${timestamp},v1=${sig}`;

    expect(verifyTeamOSWebhookSignature({ secret, timestamp, body, header })).toBe(true);
  });

  test("rejects mismatched signature", () => {
    const secret = "s1";
    const body = "{}";
    const timestamp = 123;
    const header = "t=123,v1=deadbeef";
    expect(verifyTeamOSWebhookSignature({ secret, timestamp, body, header })).toBe(false);
  });
});

