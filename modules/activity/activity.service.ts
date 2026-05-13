import "server-only";

import { createActivityLog, type ActivityCreateInput } from "@/modules/activity/activity.repository";

export async function logActivity(input: ActivityCreateInput) {
  await createActivityLog(input);
}

