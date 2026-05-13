import { AnalyticsPlaceholder } from "@/components/dashboard/analytics-placeholder";

export default function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Operational signals and team performance metrics.</p>
      </div>
      <AnalyticsPlaceholder />
    </div>
  );
}

