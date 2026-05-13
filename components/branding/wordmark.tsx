import { APP_NAME } from "@/lib/constants/app";

export function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <span className="text-sm font-semibold tracking-tight">OS</span>
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold tracking-tight">{APP_NAME}</div>
        <div className="text-[11px] text-muted-foreground">Telegram-native ops</div>
      </div>
    </div>
  );
}

