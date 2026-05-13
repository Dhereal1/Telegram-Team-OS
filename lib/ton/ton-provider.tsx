"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { envClient } from "@/lib/env/client";

const TonConnectUIProvider = dynamic(
  () => import("@tonconnect/ui-react").then((mod) => mod.TonConnectUIProvider),
  { ssr: false },
);

export function TonProvider({ children }: { children: React.ReactNode }) {
  const manifestUrl = envClient.NEXT_PUBLIC_TON_MANIFEST_URL;
  if (!manifestUrl) return <>{children}</>;

  return <TonConnectUIProvider manifestUrl={manifestUrl}>{children}</TonConnectUIProvider>;
}
