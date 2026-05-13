import "server-only";

import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/get-server-session";

export async function requireSession() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return session;
}

