"use client";

import * as React from "react";

const KEY = "teamos:last_checkin_utc";

function utcDateKey(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function useDailyCheckin() {
  React.useEffect(() => {
    const today = utcDateKey(new Date());
    const last = window.localStorage.getItem(KEY);
    if (last === today) return;
    window.localStorage.setItem(KEY, today);
    void fetch("/api/habits/checkin", { method: "POST" }).catch(() => {});
  }, []);
}

