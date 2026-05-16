"use client";

import { useDashboard } from "@/hooks/use-dashboard";
import { MissedReportsAlert } from "@/components/dashboard/missed-reports-alert";

export function DashboardAlerts() {
  const { data } = useDashboard();
  const missed = data?.dashboard.missedReports ?? [];
  return <MissedReportsAlert missed={missed} />;
}

