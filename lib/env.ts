import "server-only";

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    TELEGRAM_BOT_TOKEN: z.string().min(1),
    TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
    // BullMQ / durable processing (Redis protocol over TCP)
    REDIS_URL: z.string().min(1).optional(),
    REDIS_QUEUE_PREFIX: z.string().min(1).optional(),
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    // Phase 8: public API key hashing pepper (recommended in production).
    PUBLIC_API_KEY_PEPPER: z.string().optional(),
    // Phase 10: daily request quota for public API keys (soft-launch default is conservative).
    PUBLIC_API_DAILY_REQUEST_QUOTA: z.coerce.number().int().positive().optional(),
    AI_PROVIDER: z
      .enum(["stub", "openai", "anthropic", "google", "xai"])
      .default("stub"),
    AI_API_KEY: z.string().optional(),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_QUEUE_PREFIX: process.env.REDIS_QUEUE_PREFIX,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    PUBLIC_API_KEY_PEPPER: process.env.PUBLIC_API_KEY_PEPPER,
    PUBLIC_API_DAILY_REQUEST_QUOTA: process.env.PUBLIC_API_DAILY_REQUEST_QUOTA,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_API_KEY: process.env.AI_API_KEY,
  },
  emptyStringAsUndefined: true,
});
