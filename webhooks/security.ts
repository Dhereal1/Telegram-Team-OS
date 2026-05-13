import "server-only";

import { lookup } from "dns/promises";
import net from "net";
import { HttpError } from "@/packages/core/http-error";

function isPrivateHostname(hostname: string) {
  const h = hostname.toLowerCase();
  if (h === "localhost") return true;
  if (h.endsWith(".localhost")) return true;
  if (h.endsWith(".local")) return true;
  if (h === "0.0.0.0") return true;
  if (h === "127.0.0.1") return true;
  if (h === "::1") return true;
  return false;
}

function isPrivateIpv4(ipv4: string) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ipv4);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  if (a === 0) return true;
  return false;
}

function isPrivateIpv6(ipv6: string) {
  const v = ipv6.toLowerCase();
  if (v === "::1") return true; // loopback
  if (v.startsWith("fe80:")) return true; // link-local
  if (v.startsWith("fc") || v.startsWith("fd")) return true; // unique local
  if (v === "::") return true;
  return false;
}

function isPrivateIpLiteral(hostname: string) {
  const t = net.isIP(hostname);
  if (t === 4) return isPrivateIpv4(hostname);
  if (t === 6) return isPrivateIpv6(hostname);
  return false;
}

async function resolvesToPrivateIp(hostname: string) {
  // Phase 10: DNS-aware SSRF guard. Reject hostnames that resolve to private ranges.
  // Note: This does not prevent all SSRF vectors (e.g. DNS rebinding at request time),
  // but it materially improves safety for common cases.
  const results = await lookup(hostname, { all: true, verbatim: true });
  return results.some((r) => isPrivateIpLiteral(r.address));
}

export async function validateWebhookTargetUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError("Invalid webhook URL", 400, "VALIDATION_ERROR");
  }

  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new HttpError("Webhook URL must be https", 400, "VALIDATION_ERROR");
  }

  if (isPrivateHostname(url.hostname) || isPrivateIpLiteral(url.hostname)) {
    throw new HttpError("Webhook URL must be publicly routable", 400, "VALIDATION_ERROR");
  }

  // Avoid credential injection.
  if (url.username || url.password) throw new HttpError("Webhook URL must not include credentials", 400, "VALIDATION_ERROR");

  // Reject hostnames that resolve to private IP ranges (common SSRF bypass).
  if (await resolvesToPrivateIp(url.hostname)) {
    throw new HttpError("Webhook URL must be publicly routable", 400, "VALIDATION_ERROR");
  }

  return url.toString();
}
