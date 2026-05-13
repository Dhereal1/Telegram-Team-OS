"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  Settings,
  Shield,
  Target,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Wordmark } from "@/components/branding/wordmark";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: Target },
  { href: "/reports", label: "Reports", icon: Shield },
  { href: "/team", label: "Team", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r border-border/70 bg-card/55 backdrop-blur md:block">
      <div className="flex h-14 items-center px-4">
        <Link href="/dashboard" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Wordmark />
        </Link>
      </div>
      <Separator />
      <div className="p-3">
        <nav className="grid gap-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} className="focus-visible:outline-none">
                <Button
                  variant={active ? "secondary" : "ghost"}
                  className={cn("w-full justify-start gap-2 rounded-2xl", active && "bg-secondary/80 shadow-sm")}
                >
                  <Icon className="size-4" />
                  <span className="text-sm">{label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
