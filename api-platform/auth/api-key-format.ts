import "server-only";

// Format:
// - Prefix allows fast lookup without storing plaintext secret.
// - Secret is never stored; only a hash (peppered) is stored.
export const PUBLIC_API_KEY_PREFIX = "teamos_sk_";

export function isPublicApiKey(raw: string) {
  return raw.startsWith(PUBLIC_API_KEY_PREFIX) && raw.length >= PUBLIC_API_KEY_PREFIX.length + 32;
}

export function splitPublicApiKey(raw: string) {
  // Expected: teamos_sk_<prefix>_<secret>
  // Where <prefix> is short (e.g. 10-16 chars) and <secret> is long random.
  const v = raw.trim();
  if (!isPublicApiKey(v)) return null;
  const rest = v.slice(PUBLIC_API_KEY_PREFIX.length);
  const idx = rest.indexOf("_");
  if (idx <= 0) return null;
  const prefix = rest.slice(0, idx);
  const secret = rest.slice(idx + 1);
  if (!prefix.length || secret.length < 24) return null;
  return { prefix, secret };
}

