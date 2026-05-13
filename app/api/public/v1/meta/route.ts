import "@/modules/bootstrap/server";

import { withApi, jsonOk } from "@/packages/validation/api";
import { PUBLIC_API_LATEST } from "@/api-platform/governance/versioning";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  return jsonOk({
    version: "v1",
    latest: PUBLIC_API_LATEST,
    name: "TeamOS Public API",
  });
});

