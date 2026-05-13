import "server-only";

import crypto from "crypto";
import { env } from "@/lib/env";

function pepper() {
  // Optional for local/dev, strongly recommended in production.
  return env.PUBLIC_API_KEY_PEPPER ?? "";
}

export function hashApiKeySecret(input: { prefix: string; secret: string }) {
  // Stable, deterministic hash for lookup; include prefix in hash domain separation.
  return crypto
    .createHash("sha256")
    .update(`teamos:public-api-key:v1:${input.prefix}:${pepper()}:${input.secret}`)
    .digest("hex");
}

export function safeEqualHex(a: string, b: string) {
  // Constant-time compare; tolerate invalid hex by fallback compare.
  try {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return a === b;
  }
}

