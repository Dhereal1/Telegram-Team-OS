import crypto from "crypto";

export function createSessionToken() {
  // URL-safe, opaque token (not a JWT) to keep auth simple and revocable.
  return crypto.randomBytes(32).toString("base64url");
}

