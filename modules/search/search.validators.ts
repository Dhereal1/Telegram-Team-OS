import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  take: z.coerce.number().int().min(1).max(25).default(10),
});

