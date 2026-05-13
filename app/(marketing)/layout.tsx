import * as React from "react";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { MarketingHeader } from "@/components/layout/marketing-header";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">{children}</main>
      <MarketingFooter />
    </div>
  );
}

