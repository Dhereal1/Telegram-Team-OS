import "server-only";

import { env } from "@/lib/env";
import { Queue } from "bullmq";
import { getRedisConnection } from "@/modules/scheduler/redis";

export type QueueName = "domain-events" | "notifications" | "workflow-executions" | "webhooks" | "intelligence" | "cron";

function prefix() {
  return env.REDIS_QUEUE_PREFIX ?? "teamos";
}

declare global {
  var __teamosQueues: Map<QueueName, Queue> | undefined;
}

export function getQueue(name: QueueName) {
  const connection = getRedisConnection();
  if (!connection) return null;

  const cache = (globalThis.__teamosQueues ??= new Map<QueueName, Queue>());
  const existing = cache.get(name);
  if (existing) return existing;

  const queue = new Queue(`${prefix()}-${name}`, { connection });
  cache.set(name, queue);
  return queue;
}
