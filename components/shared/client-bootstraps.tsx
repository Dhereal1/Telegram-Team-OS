"use client";

import { useAuthHydration } from "@/hooks/use-auth-hydration";
import { useTelegramBootstrap } from "@/hooks/use-telegram-bootstrap";

export function ClientBootstraps() {
  useTelegramBootstrap();
  useAuthHydration();

  return null;
}
