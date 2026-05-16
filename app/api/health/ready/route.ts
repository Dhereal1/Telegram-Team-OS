import "server-only";

import IORedis from "ioredis";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export async function GET() {
  const checks: { db: "ok" | "fail"; redis: "ok" | "fail" } = { db: "fail", redis: "fail" };

  const dbPromise = withTimeout(prisma.$queryRaw`SELECT 1`, 3000)
    .then(() => {
      checks.db = "ok";
    })
    .catch(() => {
      checks.db = "fail";
    });

  const redisPromise = (async () => {
    const redis = new IORedis(env.REDIS_URL);
    try {
      await withTimeout(redis.ping(), 3000);
      checks.redis = "ok";
    } catch {
      checks.redis = "fail";
    } finally {
      try {
        await redis.quit();
      } catch {
        // ignore
      }
    }
  })();

  await Promise.all([dbPromise, redisPromise]);

  const ok = checks.db === "ok" && checks.redis === "ok";
  if (ok) return Response.json({ status: "ready", checks, ts: Date.now() }, { status: 200 });
  return Response.json({ status: "degraded", checks, ts: Date.now() }, { status: 503 });
}

