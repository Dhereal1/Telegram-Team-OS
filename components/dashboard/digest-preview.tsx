"use client";

import { BrainCircuit } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/use-dashboard";
import { formatDateTime } from "@/lib/ops";

export function DigestPreview() {
  const { data, isLoading } = useDashboard();
  const digest = data?.dashboard.digest.digest ?? "";
  const provider = data?.dashboard.digest.provider ?? "stub";
  const createdAt = data?.dashboard.digest.createdAt;
  const blocks = digest.split("\n\n").filter(Boolean);

  return (
    <Card className="rounded-3xl border-border/70 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <BrainCircuit className="size-4 text-primary" />
            Daily digest
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {isLoading ? "Generating operational brief..." : `Refreshed ${formatDateTime(createdAt)}`}
          </div>
        </div>
        <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.16em]">
          AI {provider}
        </Badge>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 w-full rounded-3xl" />)
          : blocks.length
            ? blocks.map((block, index) => {
                const [title, ...rest] = block.split("\n");
                return (
                  <div key={index} className="rounded-3xl border bg-background/70 p-4">
                    <div className="text-sm font-medium">{title}</div>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6 text-muted-foreground">
                      {rest.join("\n") || "No digest content."}
                    </pre>
                  </div>
                );
              })
            : <div className="rounded-3xl border border-dashed p-4 text-sm text-muted-foreground">No digest has been generated yet.</div>}
      </div>
    </Card>
  );
}
