import { BUILT_BY } from "@/lib/constants/app";

export function MarketingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 text-xs text-muted-foreground md:px-6">
        <div>{BUILT_BY}</div>
        <div className="opacity-80">Dhereal TeamOS</div>
      </div>
    </footer>
  );
}

