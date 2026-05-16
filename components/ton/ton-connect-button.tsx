"use client";

import { TonConnectButton as TonButton, useTonConnectUI } from "@tonconnect/ui-react";
import * as React from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function TonConnectButton() {
  const manifestUrl = process.env.NEXT_PUBLIC_TON_MANIFEST_URL;
  if (!manifestUrl) return null;

  return <TonConnectButtonInner />;
}

function TonConnectButtonInner() {
  const [tonConnectUI] = useTonConnectUI();
  const qc = useQueryClient();
  const inFlightRef = React.useRef(false);

  React.useEffect(() => {
    const unsubscribe = tonConnectUI.onStatusChange(async (wallet) => {
      if (!wallet) return;
      if (inFlightRef.current) return;

      const connectItems = (wallet as unknown as { connectItems?: unknown }).connectItems as
        | {
            tonProof?: { proof?: unknown };
            ton_proof?: { proof?: unknown };
          }
        | undefined;

      const proof = (connectItems?.tonProof?.proof ?? connectItems?.ton_proof?.proof) as
        | {
            timestamp?: number;
            domain?: { value?: string };
            signature?: string;
            payload?: string;
            state_init?: string;
          }
        | undefined;

      const account = (wallet as unknown as { account?: { address?: string; chain?: string } }).account;
      const address = account?.address;
      const network = account?.chain;

      if (!address || (network !== "-239" && network !== "-3") || !proof?.timestamp || !proof.signature || !proof.payload || !proof.domain?.value) {
        return;
      }

      inFlightRef.current = true;
      try {
        const res = await fetch("/api/auth/ton", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ address, network, proof }),
        });
        if (!res.ok) {
          await tonConnectUI.disconnect();
          toast.error("Wallet verification failed — please try again");
          return;
        }

        toast.success("Wallet connected");
        await qc.invalidateQueries({ queryKey: ["team", "meta"] });
      } catch {
        await tonConnectUI.disconnect();
        toast.error("Wallet verification failed — please try again");
      } finally {
        inFlightRef.current = false;
      }
    });

    return () => unsubscribe();
  }, [qc, tonConnectUI]);

  return <TonButton />;
}
