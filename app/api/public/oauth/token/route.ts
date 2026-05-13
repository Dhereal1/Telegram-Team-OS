import "@/modules/bootstrap/server";

import { withApi, jsonErr } from "@/packages/validation/api";

export const dynamic = "force-dynamic";

// Phase 8: OAuth foundations placeholder.
export const POST = withApi(async () => {
  return jsonErr("OAuth not enabled", { status: 501, code: "NOT_IMPLEMENTED" });
});

