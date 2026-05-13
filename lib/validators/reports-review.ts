import { z } from "zod";

export const reviewReportSchema = z.object({
  status: z.enum(["REVIEWED"]).optional(),
  reviewNotes: z.string().max(4000).nullable().optional(),
});

