import { z } from "zod";

export const workflowTriggerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("domain_event"),
    eventName: z.string().min(1),
  }),
]);

export const workflowConditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("always") }),
  z.object({
    type: z.literal("event_field_equals"),
    path: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }),
]);

export const workflowActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("telegram_notify"),
    chatIdPath: z.string().min(1),
    messageTemplate: z.string().min(1),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
    delaySeconds: z.number().int().min(0).optional(),
  }),
]);

export const workflowDefinitionSchema = z.object({
  triggers: z.array(workflowTriggerSchema).min(1),
  conditions: z.array(workflowConditionSchema).default([]),
  actions: z.array(workflowActionSchema).min(1),
});

export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;

