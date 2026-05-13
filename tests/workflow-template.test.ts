import { describe, expect, it } from "vitest";
import { workflowDefinitionSchema } from "@/modules/workflow/workflow.types";

describe("workflow definition schema", () => {
  it("accepts domain_event trigger and telegram action", () => {
    const parsed = workflowDefinitionSchema.parse({
      triggers: [{ type: "domain_event", eventName: "task.overdue" }],
      conditions: [{ type: "always" }],
      actions: [
        {
          type: "telegram_notify",
          chatIdPath: "chatId",
          messageTemplate: "Hello {{event.title}}",
        },
      ],
    });
    expect(parsed.triggers[0].type).toBe("domain_event");
  });
});

