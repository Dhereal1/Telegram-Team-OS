import "server-only";

import type { Processor } from "bullmq";
import { Worker } from "bullmq";
import { getRedisConnection } from "@/modules/scheduler/redis";

function prefix() {
  return process.env.REDIS_QUEUE_PREFIX?.trim() || "teamos";
}

export function createWorker(name: string, processor: Processor, options?: { concurrency?: number }) {
  const connection = getRedisConnection();
  // Phase 10: allow per-worker tuning while keeping behavior predictable.
  return new Worker(`${prefix()}-${name}`, processor as never, { connection, concurrency: options?.concurrency ?? 1 });
}
