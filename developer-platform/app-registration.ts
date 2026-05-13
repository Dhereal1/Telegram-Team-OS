import "server-only";

import { z } from "zod";
import { appManifestSchema } from "@/packages/platform-core/types";

// Minimal developer app registration schema (Phase 8).
// This does NOT create a public marketplace; it is admin-only.
export const developerAppRegistrationSchema = appManifestSchema.extend({
  kind: z.literal("developer").default("developer"),
});

