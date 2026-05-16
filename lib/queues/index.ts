import "server-only";

import IORedis from "ioredis";
import { Queue } from "bullmq";
import { env } from "@/lib/env";

export type NotificationJob = { teamId: string; userId: string; telegramUserId: bigint | string; message: string };
export type ReportReminderJob = { teamId: string };
export type DailyDigestJob = { teamId: string };

declare global {
  var __teamosWorkerRedis: IORedis | undefined;
}

export function getRedisConnection() {
  const url = env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is required for worker queues");

  const existing = globalThis.__teamosWorkerRedis;
  if (existing) return existing;

  const conn = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  if (process.env.NODE_ENV !== "production") globalThis.__teamosWorkerRedis = conn;
  return conn;
}

let _notificationsQueue: Queue<NotificationJob> | null = null;
let _cronQueue: Queue<ReportReminderJob | DailyDigestJob> | null = null;
let _domainEventsQueue: Queue<unknown> | null = null;

export function notificationsQueue() {
  if (_notificationsQueue) return _notificationsQueue;
  _notificationsQueue = new Queue<NotificationJob>("notifications", { connection: getRedisConnection() });
  return _notificationsQueue;
}

export function cronQueue() {
  if (_cronQueue) return _cronQueue;
  _cronQueue = new Queue<ReportReminderJob | DailyDigestJob>("cron", { connection: getRedisConnection() });
  return _cronQueue;
}

export function domainEventsQueue() {
  if (_domainEventsQueue) return _domainEventsQueue;
  _domainEventsQueue = new Queue("domain-events", { connection: getRedisConnection() });
  return _domainEventsQueue;
}
