import "server-only";

import { registerApp } from "@/packages/platform-core/registry";

// Phase 4: internal apps registry (no public marketplace).
// This can later be replaced by migrations/seeds.
export async function bootstrapPlatformRegistry() {
  await registerApp({
    key: "teamos.core",
    name: "TeamOS Core",
    version: "0.1.0",
    description: "Operational execution core.",
    capabilities: ["teamos.tasks", "teamos.reports", "teamos.workflows", "teamos.notifications", "teamos.intelligence"],
    requiredGrants: [],
  });
}

