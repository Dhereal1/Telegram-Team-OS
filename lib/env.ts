// Server-only — never import in client components
import "server-only";

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val || val.trim() === "") throw new Error(`Missing required environment variable: ${key}`);
  return val.trim();
}

function optionalEnv(key: string, defaultVal?: string): string | undefined {
  const trimmed = process.env[key]?.trim();
  if (trimmed && trimmed !== "") return trimmed;
  return defaultVal;
}

function optionalInt(key: string): number | undefined {
  const raw = optionalEnv(key);
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error(`Invalid integer environment variable: ${key}`);
  return n;
}

export const env = {
  // Core
  DATABASE_URL: requireEnv("DATABASE_URL"),
  NEXTAUTH_SECRET: requireEnv("NEXTAUTH_SECRET"),
  NEXT_PUBLIC_APP_URL: requireEnv("NEXT_PUBLIC_APP_URL"),

  // Telegram
  TELEGRAM_BOT_TOKEN: requireEnv("TELEGRAM_BOT_TOKEN"),
  TELEGRAM_BOT_USERNAME: requireEnv("TELEGRAM_BOT_USERNAME"),
  TELEGRAM_WEBHOOK_SECRET: requireEnv("TELEGRAM_WEBHOOK_SECRET"),

  // Redis
  REDIS_URL: requireEnv("REDIS_URL"),

  // Upstash (optional — rate limiting degrades gracefully)
  UPSTASH_REDIS_REST_URL: optionalEnv("UPSTASH_REDIS_REST_URL"),
  UPSTASH_REDIS_REST_TOKEN: optionalEnv("UPSTASH_REDIS_REST_TOKEN"),

  // Stripe
  STRIPE_SECRET_KEY: requireEnv("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: requireEnv("STRIPE_WEBHOOK_SECRET"),
  STRIPE_PRICE_PRO: requireEnv("STRIPE_PRICE_PRO"),
  STRIPE_PRICE_BUSINESS: requireEnv("STRIPE_PRICE_BUSINESS"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: requireEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),

  // AI (optional at v1)
  AI_PROVIDER: optionalEnv("AI_PROVIDER", "stub"),
  OPENAI_API_KEY: optionalEnv("OPENAI_API_KEY"),

  // Compatibility / misc
  NODE_ENV: optionalEnv("NODE_ENV", "development"),
  VERCEL_URL: optionalEnv("VERCEL_URL"),
  REDIS_QUEUE_PREFIX: optionalEnv("REDIS_QUEUE_PREFIX"),
  PUBLIC_API_KEY_PEPPER: optionalEnv("PUBLIC_API_KEY_PEPPER"),
  PUBLIC_API_DAILY_REQUEST_QUOTA: optionalInt("PUBLIC_API_DAILY_REQUEST_QUOTA"),
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: optionalEnv("NEXT_PUBLIC_TELEGRAM_BOT_USERNAME"),
  NEXT_PUBLIC_TON_MANIFEST_URL: optionalEnv("NEXT_PUBLIC_TON_MANIFEST_URL"),
  WORKER_QUEUES: optionalEnv("WORKER_QUEUES"),
  TELEGRAM_POLL_DELETE_WEBHOOK: optionalEnv("TELEGRAM_POLL_DELETE_WEBHOOK"),
} as const;

export function validateEnv() {
  // Accessing env triggers all required checks.
  void env;
  console.log("Environment validated");
}

export default validateEnv;

