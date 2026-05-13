import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardLoading() {
  return (
    <div className="space-y-4">
      <Card className="rounded-3xl p-5">
        <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
          <div className="space-y-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-9 w-80" />
            <Skeleton className="h-5 w-full max-w-xl" />
            <div className="grid gap-2 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            <Skeleton className="h-36 w-full rounded-3xl" />
            <Skeleton className="h-32 w-full rounded-3xl" />
          </div>
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="rounded-3xl p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-7 w-16" />
            <Skeleton className="mt-2 h-3 w-28" />
          </Card>
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="rounded-3xl p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-24 w-full rounded-2xl" />
            <Skeleton className="mt-3 h-24 w-full rounded-2xl" />
          </Card>
        ))}
      </div>
    </div>
  );
}
