"use client";

import * as React from "react";
import { useRawInitData, useLaunchParams } from "@tma.js/sdk-react";
import { useTelegramStore } from "@/store/telegram-store";

export function useTelegramBootstrap() {
  const initData = useRawInitData();
  const launchParams = useLaunchParams(true);
  const setMiniApp = useTelegramStore((s) => s.setMiniApp);
  const setInitData = useTelegramStore((s) => s.setInitData);

  React.useEffect(() => {
    setInitData(initData ?? null);
    setMiniApp(Boolean(initData));
  }, [initData, setInitData, setMiniApp]);

  return { initData, launchParams };
}

