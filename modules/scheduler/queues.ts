import "server-only";

import { env } from "@/lib/env";
import { Queue } from "bullmq";
import { getRedisConnection } from "@/modules/scheduler/redis";

export type QueueName = "domain-events" | "notifications" | "workflow-executions" | "webhooks" | "intelligence" | "cron";

function prefix() {
  return env.REDIS_QUEUE_PREFIX ?? "teamos";
}

export function getQueue(name: QueueName) {
  const connection = getRedisConnection();
  if (!connection) return null;
  return new Queue(`${prefix()}-${name}`, { connection });
}
