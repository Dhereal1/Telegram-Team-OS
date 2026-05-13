import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(2).max(140),
  description: z.string().max(4000).optional(),
  assignedToUserId: z.string().cuid().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  dueAt: z.string().datetime().optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().min(2).max(140).optional(),
    description: z.string().max(4000).nullable().optional(),
    assignedToUserId: z.string().cuid().nullable().optional(),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
    status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELED"]).optional(),
    dueAt: z.string().datetime().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No updates provided" });
