"use client";

import { useAuthHydration } from "@/hooks/use-auth-hydration";
import { useTelegramBootstrap } from "@/hooks/use-telegram-bootstrap";
import { useDailyCheckin } from "@/hooks/use-daily-checkin";

export function ClientBootstraps() {
  useTelegramBootstrap();
  useAuthHydration();
  useDailyCheckin();

  return null;
}
