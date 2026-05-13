"use client";

import { Search, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/ui-store";
import { TonConnectButton } from "@/components/ton/ton-connect-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function Topbar() {
  const openCommand = useUiStore((s) => s.openCommandPalette);
  const qc = useQueryClient();
  const logout = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: async () => {
      toast.success("Logged out");
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
      window.location.href = "/login";
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Logout failed"),
  });

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
        <Button variant="secondary" className="gap-2" onClick={openCommand}>
          <Search className="size-4" />
          <span className="hidden text-sm sm:inline">Command</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">⌘K</span>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Wallet" className="hidden sm:inline-flex">
            <Wallet className="size-4" />
          </Button>
          <TonConnectButton />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" disabled={logout.isPending}>
                Account
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => logout.mutate()}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
