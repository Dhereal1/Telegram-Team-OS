import "server-only";

import { Queue } from "bullmq";
import { getRedisConnection } from "@/modules/scheduler/redis";

export type QueueName = "domain-events" | "notifications" | "workflow-executions" | "webhooks" | "intelligence" | "cron";

function prefix() {
  return process.env.REDIS_QUEUE_PREFIX?.trim() || "teamos";
}

declare global {
  var __teamosQueues: Map<QueueName, Queue> | undefined;
}

export function getQueue(name: QueueName) {
  const connection = getRedisConnection();

  const cache = (globalThis.__teamosQueues ??= new Map<QueueName, Queue>());
  const existing = cache.get(name);
  if (existing) return existing;

  const queue = new Queue(`${prefix()}-${name}`, { connection });
  cache.set(name, queue);
  return queue;
}
