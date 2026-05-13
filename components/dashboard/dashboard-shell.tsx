"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { BUILT_BY } from "@/lib/constants/app";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)] bg-background">
      <CommandPalette />
      <div className="grid min-h-dvh grid-cols-1 md:grid-cols-[280px_1fr]">
        <Sidebar />
        <div className="flex min-w-0 flex-col">
          <Topbar />
          <main className="flex-1 px-4 py-5 md:px-8 md:py-7">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
          <div className="px-4 pb-6 text-center text-[10px] text-muted-foreground md:px-8">
            {BUILT_BY}
          </div>
        </div>
      </div>
    </div>
  );
}
