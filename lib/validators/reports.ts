import { z } from "zod";

export const createReportSchema = z.object({
  title: z.string().min(2).max(140),
  body: z.string().min(10).max(20_000),
});
