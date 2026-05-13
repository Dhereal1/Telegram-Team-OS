import "server-only";

import { registerApp } from "@/packages/platform-core/registry";

// Phase 8: controlled integration registry (no open marketplace).
// These are *manifests* only; actual adapters live in modules/services and require explicit installation.
export async function bootstrapIntegrationsRegistry() {
  await registerApp({
    key: "integration.slack",
    name: "Slack (Integration)",
    version: "0.1.0",
    kind: "integration",
    integration: { provider: "slack", auth: "oauth" },
    description: "Operational notifications and workflow triggers via Slack.",
    capabilities: ["teamos.events.subscribe", "teamos.tasks.read", "teamos.tasks.write"],
    requiredGrants: ["integration.slack.install"],
  });

  await registerApp({
    key: "integration.google_workspace",
    name: "Google Workspace (Integration)",
    version: "0.1.0",
    kind: "integration",
    integration: { provider: "google", auth: "oauth" },
    description: "Calendar and directory alignment for operational workflows.",
    capabilities: ["teamos.events.subscribe", "teamos.operational.read"],
    requiredGrants: ["integration.google_workspace.install"],
  });

  await registerApp({
    key: "integration.notion",
    name: "Notion (Integration)",
    version: "0.1.0",
    kind: "integration",
    integration: { provider: "notion", auth: "oauth" },
    description: "Operational knowledge sync for reports and playbooks.",
    capabilities: ["teamos.events.subscribe", "teamos.operational.read"],
    requiredGrants: ["integration.notion.install"],
  });
}

