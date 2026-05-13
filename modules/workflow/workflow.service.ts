import "server-only";

import { workflowDefinitionSchema } from "@/modules/workflow/workflow.types";
import * as repo from "@/modules/workflow/workflow.repository";
import { enqueueTelegramNotification } from "@/modules/notifications/notifications.service";

function getByPath(obj: unknown, path: string) {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    if (typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function renderTemplate(template: string, ctx: Record<string, unknown>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key) => {
    const v = getByPath(ctx, String(key));
    return v === undefined || v === null ? "" : String(v);
  });
}

export async function runWorkflowsForEvent(input: {
  teamId: string;
  eventId?: string | null;
  eventName: string;
  payload: Record<string, unknown>;
}) {
  const candidates = await repo.listActiveWorkflowVersionsByEvent(input.teamId, input.eventName);
  const results: Array<{ workflowId: string; executionId: string; status: "SUCCEEDED" | "FAILED" }> = [];

  for (const row of candidates) {
    const def = workflowDefinitionSchema.safeParse(row.definition);
    if (!def.success) continue;

    const execution = await repo.createExecution({
      teamId: input.teamId,
      workflowId: row.workflow.id,
      workflowVersionId: row.id,
      triggerEventId: input.eventId ?? null,
    });

    try {
      const ctx: Record<string, unknown> = { event: input.payload, teamId: input.teamId, workflow: { id: row.workflow.id, name: row.workflow.name } };

      // Conditions (AND)
      const ok = def.data.conditions.every((c) => {
        if (c.type === "always") return true;
        if (c.type === "event_field_equals") {
          return getByPath(ctx, `event.${c.path}`) === c.value;
        }
        return false;
      });

      if (!ok) {
        await repo.appendExecutionLog({ executionId: execution.id, level: "info", message: "Conditions not met" });
        await repo.finishExecution({ executionId: execution.id, status: "CANCELED" });
        continue;
      }

      for (const action of def.data.actions) {
        if (action.type === "telegram_notify") {
          const chatId = getByPath(ctx, `event.${action.chatIdPath}`);
          if (!chatId) {
            await repo.appendExecutionLog({ executionId: execution.id, level: "warn", message: "Missing chatId for telegram_notify", metadata: { chatIdPath: action.chatIdPath } });
            continue;
          }
          const text = renderTemplate(action.messageTemplate, ctx);
          const scheduledAt = action.delaySeconds ? new Date(Date.now() + action.delaySeconds * 1000) : null;
          await enqueueTelegramNotification({
            teamId: input.teamId,
            chatId: chatId as string | number,
            text,
            scheduledAt,
            priority: action.priority ?? "NORMAL",
          });
          await repo.appendExecutionLog({ executionId: execution.id, level: "info", message: "Enqueued telegram notification" });
        }
      }

      await repo.finishExecution({ executionId: execution.id, status: "SUCCEEDED" });
      results.push({ workflowId: row.workflow.id, executionId: execution.id, status: "SUCCEEDED" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Workflow execution failed";
      await repo.appendExecutionLog({ executionId: execution.id, level: "error", message: msg });
      await repo.finishExecution({ executionId: execution.id, status: "FAILED", lastError: msg });
      results.push({ workflowId: row.workflow.id, executionId: execution.id, status: "FAILED" });
    }
  }

  return results;
}
