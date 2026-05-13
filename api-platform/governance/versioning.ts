import "server-only";

export type PublicApiVersion = "v1";

export const PUBLIC_API_LATEST: PublicApiVersion = "v1";

export function publicApiBasePath(version: PublicApiVersion) {
  return `/api/public/${version}`;
}

export function publicApiResponseHeaders(input: { version: PublicApiVersion; requestId?: string }) {
  const headers: Record<string, string> = {
    "x-teamos-api-version": input.version,
  };
  if (input.requestId) headers["x-request-id"] = input.requestId;
  return headers;
}

