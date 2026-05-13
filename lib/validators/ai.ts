import { z } from "zod";

export const summarizeSchema = z.object({
  reportId: z.string().cuid().optional(),
  text: z.string().min(10).max(40_000).optional(),
});

