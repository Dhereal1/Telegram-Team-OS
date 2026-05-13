import { z } from "zod";

export const capabilityKeySchema = z.string().min(3).max(80).regex(/^[a-z0-9_.:-]+$/i);

export const appManifestSchema = z.object({
  key: z.string().min(3).max(80).regex(/^[a-z0-9_.:-]+$/i),
  name: z.string().min(1).max(120),
  version: z.string().min(1).max(40),
  description: z.string().max(500).optional(),
  capabilities: z.array(capabilityKeySchema).default([]),
  requiredGrants: z.array(capabilityKeySchema).default([]),
  // Phase 8+: optional app classification for governance (no marketplace semantics).
  kind: z.enum(["core", "integration", "developer"]).optional(),
  integration: z
    .object({
      provider: z.string().min(2).max(60),
      auth: z.enum(["api_key", "oauth", "webhook_only"]).optional(),
      docsUrl: z.string().url().optional(),
    })
    .optional(),
}).passthrough();

export type AppManifest = z.infer<typeof appManifestSchema>;

export type PlatformContext = {
  teamId: string;
  userId: string;
  roleKey: "FOUNDER" | "ADMIN" | "STAFF";
  installedApps: Array<{ key: string; grants: string[]; status: "ENABLED" | "DISABLED" }>;
};
