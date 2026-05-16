import { ReportsList } from "@/components/dashboard/reports-list";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ReportsPage({ searchParams }: { searchParams?: { date?: string } }) {
  const isToday = searchParams?.date === "today";
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Weekly updates, AI summaries, and review-ready structure.</p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/reports"
          className={cn("rounded-full border px-3 py-1 text-sm", !isToday ? "bg-card" : "text-muted-foreground")}
        >
          All
        </Link>
        <Link
          href="/reports?date=today"
          className={cn("rounded-full border px-3 py-1 text-sm", isToday ? "bg-card" : "text-muted-foreground")}
        >
          Today
        </Link>
      </div>
      <ReportsList date={isToday ? "today" : null} />
    </div>
  );
}
