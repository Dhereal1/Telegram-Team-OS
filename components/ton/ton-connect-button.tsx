"use client";

import { TonConnectButton as TonButton, useTonConnectUI } from "@tonconnect/ui-react";
import { envClient } from "@/lib/env/client";

export function TonConnectButton() {
  const manifestUrl = envClient.NEXT_PUBLIC_TON_MANIFEST_URL;
  if (!manifestUrl) return null;

  return <TonConnectButtonInner />;
}

function TonConnectButtonInner() {
  const [tonConnectUI] = useTonConnectUI();
  // ensure initialization side effects occur in a safe, controlled place
  void tonConnectUI;
  return <TonButton />;
}
