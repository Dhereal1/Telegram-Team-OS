# Phase 8 — API Platform (Public)

TeamOS public APIs are **versioned**, **scoped**, and **governed**.

Principles:
- Telegram-native UX remains primary; public APIs extend operational interoperability.
- No anonymous access; all calls require an **API key** (Phase 8) or **OAuth** (foundation only).
- Keys are **workspace-install scoped** (an app must be installed in a workspace).
- Strictly controlled surface area: only operational workflows/data, not “generic SaaS”.

This folder contains:
- `scopes.ts`: scope registry for public access.
- `auth/*`: API key parsing + verification.
- `governance/*`: version + deprecation primitives.
- `usage/*`: usage accounting + quota primitives.

