"use client";

import * as React from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_NAME, BUILT_BY } from "@/lib/constants/app";
import { envClient } from "@/lib/env/client";

declare global {
  interface Window {
    TelegramLoginWidget?: unknown;
    onTelegramAuth?: (user: Record<string, unknown>) => void;
    Telegram?: {
      WebApp?: {
        initData?: string;
      };
    };
  }
}

export function LoginCard() {
  const sp = useSearchParams();
  const invite = sp.get("invite");
  const [loading, setLoading] = React.useState(false);
  const [initData, setInitData] = React.useState<string | null>(null);

  const refreshInitData = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const next = window.Telegram?.WebApp?.initData ?? null;
    setInitData(next);
  }, []);

  async function loginWithWebApp() {
    // Read the latest initData (Telegram injects it via telegram-web-app.js).
    const currentInitData = window.Telegram?.WebApp?.initData ?? initData;
    if (!currentInitData) {
      toast.error("Open this inside the Telegram Mini App to continue.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "webapp", initData: currentInitData, inviteToken: invite ?? undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Login failed");
      window.location.href = "/dashboard";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    window.onTelegramAuth = async (user) => {
      setLoading(true);
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "login_widget", user, inviteToken: invite ?? undefined }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Login failed");
        window.location.href = "/dashboard";
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Login failed");
      } finally {
        setLoading(false);
      }
    };
  }, [invite]);

  return (
    <Card className="p-6">
      <div className="text-center">
        <div className="text-sm text-muted-foreground">{APP_NAME}</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Login</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Telegram-first authentication for founders and staff.
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        <Button size="lg" onClick={loginWithWebApp} disabled={loading}>
          Continue in Telegram Mini App
        </Button>

        <div className="rounded-2xl border bg-card/40 p-4">
          <div className="text-xs font-medium">Telegram Login Widget</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Use this for browser login. The widget calls `window.onTelegramAuth(user)`.
          </p>
          <div className="mt-3 flex justify-center">
            <div id="telegram-login-widget" />
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-muted-foreground">{BUILT_BY}</div>

      <Script
        id="telegram-web-app-script"
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onLoad={refreshInitData}
      />
      <Script
        id="telegram-login-widget-script"
        src="https://telegram.org/js/telegram-widget.js?22"
        strategy="afterInteractive"
        onLoad={() => {
          refreshInitData();
          // Inject widget script tag with required attributes (Telegram parses them at runtime).
          const root = document.getElementById("telegram-login-widget");
          if (!root) return;
          root.innerHTML = "";
          const s = document.createElement("script");
          s.async = true;
          s.src = "https://telegram.org/js/telegram-widget.js?22";
          s.setAttribute("data-telegram-login", envClient.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "YOUR_BOT_USERNAME");
          s.setAttribute("data-size", "large");
          s.setAttribute("data-onauth", "onTelegramAuth(user)");
          s.setAttribute("data-request-access", "write");
          root.appendChild(s);
        }}
      />
    </Card>
  );
}
