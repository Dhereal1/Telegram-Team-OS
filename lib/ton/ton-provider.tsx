"use client";

import * as React from "react";
import dynamic from "next/dynamic";

const TonConnectUIProvider = dynamic(
  () => import("@tonconnect/ui-react").then((mod) => mod.TonConnectUIProvider),
  { ssr: false },
);

export function TonProvider({ children }: { children: React.ReactNode }) {
  const manifestUrl = process.env.NEXT_PUBLIC_TON_MANIFEST_URL;
  if (!manifestUrl) return <>{children}</>;

  return <TonConnectUIProvider manifestUrl={manifestUrl}>{children}</TonConnectUIProvider>;
}
