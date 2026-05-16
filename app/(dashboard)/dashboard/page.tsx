import { StatsGrid } from "@/components/dashboard/stats-grid";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DigestPreview } from "@/components/dashboard/digest-preview";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { DashboardAlerts } from "@/components/dashboard/dashboard-alerts";

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-6">
      <OnboardingChecklist />
      <DashboardAlerts />
      <StatsGrid />
      <DigestPreview />
      <RecentActivity />
    </div>
  );
}
