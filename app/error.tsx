"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { BUILT_BY } from "@/lib/constants/app";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-xl place-items-center px-6 py-16 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Something broke</h1>
        <p className="mt-3 break-words text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center">
          <Button onClick={reset} variant="secondary">
            Retry
          </Button>
        </div>
        <div className="mt-8 text-[10px] text-muted-foreground">{BUILT_BY}</div>
      </div>
    </div>
  );
}

