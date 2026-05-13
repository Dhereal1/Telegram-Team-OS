import "server-only";

import crypto from "crypto";

export function signWebhookBody(input: { secret: string; timestamp: number; body: string }) {
  const mac = crypto.createHmac("sha256", input.secret);
  mac.update(`${input.timestamp}.${input.body}`);
  return mac.digest("hex");
}

export function webhookSignatureHeader(input: { secret: string; timestamp: number; body: string }) {
  const sig = signWebhookBody(input);
  return `t=${input.timestamp},v1=${sig}`;
}

