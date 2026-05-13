# TeamOS SDK (Phase 8)

Typed clients and helpers for the TeamOS public API.

This repo currently includes a minimal TypeScript client under `sdk/ts`.

Quickstart (TypeScript):
- Create an API key in TeamOS (admin): `POST /api/platform/public-api/keys`
- Use the key as `Authorization: Bearer teamos_sk_...`

Example:
```ts
import { TeamOSPublicApiClient } from "@/sdk/ts";

const client = new TeamOSPublicApiClient({ baseUrl: "https://your-teamos-domain", apiKey: process.env.TEAMOS_API_KEY! });
const { tasks } = await client.listTasks({ limit: 20 });
```
