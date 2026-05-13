import "server-only";

import { z } from "zod";

// Public API scopes are intentionally small and operationally grounded.
// Add new scopes only through governance review.
export const publicApiScopeSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9_.:-]+$/i);

export type PublicApiScope = z.infer<typeof publicApiScopeSchema>;

export const PUBLIC_API_SCOPES = {
  "teamos.tasks.read": "Read tasks",
  "teamos.tasks.write": "Create/update tasks",
  "teamos.workflows.execute": "Execute workflows",
  "teamos.events.subscribe": "Manage webhook subscriptions",
  "teamos.operational.read": "Read operational aggregates (reports/analytics)",
} as const satisfies Record<string, string>;

export const publicApiScopesList = Object.keys(PUBLIC_API_SCOPES) as Array<keyof typeof PUBLIC_API_SCOPES>;

export function assertPublicApiScopes(scopes: string[]) {
  for (const s of scopes) publicApiScopeSchema.parse(s);
  return scopes as PublicApiScope[];
}

