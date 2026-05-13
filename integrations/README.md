# Phase 8 — Integrations (Controlled)

This layer defines how external systems connect to TeamOS **without** turning TeamOS into a generic marketplace.

Rules:
- Integrations must reinforce operational workflows.
- Every integration is a governed **Platform App** with explicit grants + install state.
- External connectivity uses:
  - Public API keys (workspace-install scoped)
  - Webhooks (signed, replayable)
  - Optional OAuth (foundation only in Phase 8)

