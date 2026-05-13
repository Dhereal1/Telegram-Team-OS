import crypto from "crypto";

export function verifyTeamOSWebhookSignature(input: { secret: string; timestamp: number; body: string; header: string }) {
  // header format: "t=...,v1=..."
  const parts = Object.fromEntries(
    input.header
      .split(",")
      .map((p) => p.trim())
      .map((p) => p.split("=", 2))
      .filter((kv) => kv.length === 2) as Array<[string, string]>,
  );
  const t = Number(parts["t"] ?? "0");
  const v1 = String(parts["v1"] ?? "");
  if (!t || !v1) return false;
  if (t !== input.timestamp) return false;

  const mac = crypto.createHmac("sha256", input.secret);
  mac.update(`${t}.${input.body}`);
  const expected = mac.digest("hex");

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(v1, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

