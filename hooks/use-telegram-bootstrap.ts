"use client";

import * as React from "react";
import { useTelegramStore } from "@/store/telegram-store";

export function useTelegramBootstrap() {
  const setMiniApp = useTelegramStore((s) => s.setMiniApp);
  const setInitData = useTelegramStore((s) => s.setInitData);

  React.useEffect(() => {
    const w = window as unknown as {
      Telegram?: {
        WebApp?: {
          initData?: string;
        };
      };
    };

    const initData = w.Telegram?.WebApp?.initData;
    const isTelegram = typeof initData === "string" && initData.trim().length > 0;

    setInitData(isTelegram ? initData : null);
    setMiniApp(isTelegram);
  }, [setInitData, setMiniApp]);

  return { initData: null, launchParams: null };
}
