"use client";

import { TonConnectButton as TonButton, useTonConnectUI } from "@tonconnect/ui-react";

export function TonConnectButton() {
  const manifestUrl = process.env.NEXT_PUBLIC_TON_MANIFEST_URL;
  if (!manifestUrl) return null;

  return <TonConnectButtonInner />;
}

function TonConnectButtonInner() {
  const [tonConnectUI] = useTonConnectUI();
  // ensure initialization side effects occur in a safe, controlled place
  void tonConnectUI;
  return <TonButton />;
}
