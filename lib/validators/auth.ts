import { z } from "zod";

export const telegramWidgetUserSchema = z
  .object({
    id: z.number().int(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    username: z.string().optional(),
    photo_url: z.string().url().optional(),
    auth_date: z.number().int(),
    hash: z.string().min(1),
  })
  .passthrough();

export const telegramLoginWidgetPayloadSchema = z.object({
  type: z.literal("login_widget"),
  user: z.record(z.string(), z.unknown()),
  inviteToken: z.string().min(10).optional(),
});

export const telegramWebAppPayloadSchema = z.object({
  type: z.literal("webapp"),
  initData: z.string().min(1),
  inviteToken: z.string().min(10).optional(),
});

export const telegramAuthBodySchema = z.union([
  telegramLoginWidgetPayloadSchema,
  telegramWebAppPayloadSchema,
]);
