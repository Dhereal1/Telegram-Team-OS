import "@/modules/bootstrap/server";

import { withApi, jsonOk } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { requireRole } from "@/lib/auth/permissions";
import { bootstrapGovernance, listEventSchemas, listServiceOwnership } from "@/modules/governance/governance.service";

export const dynamic = "force-dynamic";

export const governanceGET = withApi(async () => {
  const session = await requireApiSession();
  requireRole(session.roleKey ?? null, "ADMIN");
  await bootstrapGovernance();
  const [eventSchemas, services] = await Promise.all([listEventSchemas(), listServiceOwnership()]);
  return jsonOk({ eventSchemas, services });
});

