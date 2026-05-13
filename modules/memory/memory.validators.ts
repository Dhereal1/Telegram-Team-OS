import { z } from "zod";

export const createMemorySchema = z.object({
  type: z.enum(["NOTE", "DECISION", "PROCEDURE", "INCIDENT"]).default("NOTE"),
  title: z.string().min(2).max(140),
  body: z.string().min(2).max(10_000),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
  pinned: z.boolean().default(false),
});

export const listMemorySchema = z.object({
  take: z.coerce.number().int().min(1).max(30).default(15),
  q: z.string().max(200).optional(),
  pinned: z.coerce.boolean().optional(),
  type: z.enum(["NOTE", "DECISION", "PROCEDURE", "INCIDENT"]).optional(),
});

