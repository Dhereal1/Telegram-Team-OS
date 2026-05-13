import "server-only";

import crypto from "crypto";
import { PUBLIC_API_KEY_PREFIX } from "@/api-platform/auth/api-key-format";
import { hashApiKeySecret } from "@/api-platform/auth/api-key-hash";

function base64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function issuePublicApiKey() {
  const prefix = base64url(crypto.randomBytes(9)); // ~12 chars
  const secret = base64url(crypto.randomBytes(32)); // ~43 chars
  const token = `${PUBLIC_API_KEY_PREFIX}${prefix}_${secret}`;
  const hash = hashApiKeySecret({ prefix, secret });
  return { token, prefix, secret, hash };
}

