import "@/modules/bootstrap/server";

import { withApi, jsonOk } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { checkInDaily } from "@/modules/habits/habits.service";

export const dynamic = "force-dynamic";

export const checkinPOST = withApi(async () => {
  const session = await requireApiSession();
  const result = await checkInDaily({ teamId: session.teamId!, userId: session.userId });
  return jsonOk({ checkin: result });
});

