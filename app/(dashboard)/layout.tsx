import * as React from "react";
import { requireSession } from "@/lib/auth/require-session";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return <DashboardShell>{children}</DashboardShell>;
}

