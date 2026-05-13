import { ReportsList } from "@/components/dashboard/reports-list";

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Weekly updates, AI summaries, and review-ready structure.</p>
      </div>
      <ReportsList />
    </div>
  );
}

