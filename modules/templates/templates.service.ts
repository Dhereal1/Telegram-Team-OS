import "server-only";

import { prisma } from "@/lib/db/prisma";
import { workflowDefinitionSchema } from "@/modules/workflow/workflow.types";
import * as repo from "@/modules/templates/templates.repository";

type TemplateDefinition = {
  workflows?: Array<{ name: string; definition: unknown }>;
  starterTasks?: Array<{ title: string; description?: string }>;
};

export async function bootstrapTemplates() {
  // Minimal set; extend gradually.
  const creator: TemplateDefinition = {
    workflows: [
      {
        name: "Overdue task reminder (Telegram)",
        definition: {
          triggers: [{ type: "domain_event", eventName: "task.overdue" }],
          conditions: [{ type: "always" }],
          actions: [
            {
              type: "telegram_notify",
              chatIdPath: "teamChatId",
              messageTemplate: "<b>Overdue task</b>: {{event.title}}\\n\\nOpen TeamOS to unblock.",
              priority: "HIGH",
              delaySeconds: 0,
            },
          ],
        },
      },
    ],
    starterTasks: [
      { title: "Define daily report format", description: "Decide: Completed | Blocked | Next. Keep it short." },
      { title: "Assign owners for top 3 priorities", description: "Every priority must have one clear owner." },
    ],
  };

  await repo.upsertTemplate({
    key: "creator",
    name: "Creator Ops (Starter)",
    description: "Daily cadence + accountability starter set for creator teams.",
    definition: creator as never,
  });
}

export async function listTemplates() {
  return repo.listTemplates();
}

export async function installTemplate(input: { teamId: string; installedById: string; templateKey: string; teamChatId?: string | null }) {
  const template = await repo.getTemplateByKey(input.templateKey);
  if (!template) throw new Error("Template not found");
  const def = (template.definition ?? {}) as TemplateDefinition;

  await prisma.$transaction(async (tx) => {
    await repo.installTemplate({ teamId: input.teamId, templateId: template.id, installedById: input.installedById });

    if (def.starterTasks?.length) {
      // Create tasks unassigned; founder can assign later.
      await tx.task.createMany({
        data: def.starterTasks.map((t) => ({
          teamId: input.teamId,
          createdById: input.installedById,
          title: t.title,
          description: t.description,
          priority: "NORMAL",
          status: "TODO",
        })),
        skipDuplicates: true,
      });
    }

    if (def.workflows?.length) {
      for (const wf of def.workflows) {
        const parsed = workflowDefinitionSchema.parse(wf.definition);
        // Inject teamChatId path convenience (workflow engine reads from event.*)
        // For template-driven notifications we standardize on event.teamChatId.
        // We'll keep it simple by storing as-is and rely on emitter payloads to include teamChatId when needed.
        const workflow = await tx.workflow.create({
          data: { teamId: input.teamId, name: wf.name, status: "ACTIVE" },
          select: { id: true },
        });
        await tx.workflowVersion.create({
          data: { workflowId: workflow.id, version: 1, isCurrent: true, definition: parsed as never },
          select: { id: true },
        });
      }
    }

    // Optionally bind team chat id.
    if (input.teamChatId) {
      await tx.team.update({ where: { id: input.teamId }, data: { telegramChatId: BigInt(input.teamChatId) } }).catch(() => {});
    }
  });

  return { installed: true as const, templateKey: template.key };
}

