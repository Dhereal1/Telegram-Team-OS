import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wordmark } from "@/components/branding/wordmark";

export default function LandingPage() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-b from-card to-background p-8 md:p-12">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(70%_60%_at_30%_10%,hsl(var(--primary)/0.25),transparent_60%)]" />
        <div className="relative">
          <div className="flex items-center justify-between gap-6">
            <Wordmark />
            <Button asChild variant="secondary">
              <Link href="/login">
                Open TeamOS <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 md:items-center">
            <div>
              <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
                Telegram-native staff operations — with AI accountability built in.
              </h1>
              <p className="mt-4 max-w-xl text-pretty text-muted-foreground">
                Dhereal TeamOS is a founder-grade operating layer for teams running business inside Telegram: tasks,
                reporting, activity, and AI summaries — built to feel native, fast, and secure.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/login">
                    Continue with Telegram <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/dashboard">View Dashboard Shell</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Built for operators. TON-ready. AI-native. Telegram-first.
              </p>
            </div>
            <div className="grid gap-3 md:justify-items-end">
              <Card className="w-full max-w-md p-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="size-4 text-primary" />
                  <div className="text-sm font-medium">AI summaries & staff scoring</div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Provider-agnostic AI service layer prepared for reports, daily digests, and performance scoring.
                </p>
              </Card>
              <Card className="w-full max-w-md p-4">
                <div className="flex items-center gap-3">
                  <Users className="size-4 text-primary" />
                  <div className="text-sm font-medium">Roles & accountability</div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Founder/Admin/Staff roles, activity logging, and task ownership — structured for real operations.
                </p>
              </Card>
              <Card className="w-full max-w-md p-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="size-4 text-primary" />
                  <div className="text-sm font-medium">Production-safe foundations</div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Typed APIs, Zod validation, Prisma + Neon-ready schema, Upstash-ready cache/ratelimits.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

