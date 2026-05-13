import "server-only";

import { HttpError } from "@/lib/utils/api";
import { getServerSession } from "@/lib/auth/get-server-session";

export async function requireApiUserSession() {
  const session = await getServerSession();
  if (!session) throw new HttpError("Unauthorized", 401, "UNAUTHORIZED");
  return session;
}

export async function requireApiSession() {
  const session = await getServerSession();
  if (!session) throw new HttpError("Unauthorized", 401, "UNAUTHORIZED");
  if (!session.teamId) throw new HttpError("No team selected", 400, "NO_TEAM");
  if (!session.roleKey) throw new HttpError("Forbidden", 403, "FORBIDDEN");
  return session;
}
