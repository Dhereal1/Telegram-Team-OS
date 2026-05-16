import "server-only";

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
  server: {
    DATABASE_URL: z.string().min(1),
    TELEGRAM_BOT_TOKEN: z.string().min(1),
    // Required for invite deep links and bot command registration in production.
    // Prefer setting TELEGRAM_BOT_USERNAME; NEXT_PUBLIC_TELEGRAM_BOT_USERNAME can be used as fallback.
    TELEGRAM_BOT_USERNAME: z.string().min(1).optional(),
    // Required in production to validate Telegram webhook origin.
    TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    STRIPE_PRICE_PRO: z.string().min(1).optional(),
    STRIPE_PRICE_BUSINESS: z.string().min(1).optional(),
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
    TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
    TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO,
    STRIPE_PRICE_BUSINESS: process.env.STRIPE_PRICE_BUSINESS,
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
