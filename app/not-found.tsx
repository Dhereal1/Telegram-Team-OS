import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BUILT_BY } from "@/lib/constants/app";

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-xl place-items-center px-6 py-16 text-center">
      <div>
        <div className="text-sm text-muted-foreground">404</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This route doesn’t exist yet in Phase 1. Head back to the dashboard shell.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link href="/">Home</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
        <div className="mt-8 text-[10px] text-muted-foreground">{BUILT_BY}</div>
      </div>
    </div>
  );
}

