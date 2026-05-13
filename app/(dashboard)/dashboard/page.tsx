import { StatsGrid } from "@/components/dashboard/stats-grid";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DigestPreview } from "@/components/dashboard/digest-preview";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-6">
      <OnboardingChecklist />
      <StatsGrid />
      <DigestPreview />
      <RecentActivity />
    </div>
  );
}
