import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const envClient = createEnv({
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
  server: {},
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_TON_MANIFEST_URL: z.string().url().optional(),
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z.string().min(1).optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
    NEXT_PUBLIC_TON_MANIFEST_URL: process.env.NEXT_PUBLIC_TON_MANIFEST_URL,
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
  },
  emptyStringAsUndefined: true,
});
