/**
 * Dhereal TeamOS seed data (local development).
 * Built by Dhereal1
 */

import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import crypto from "crypto";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL for seed");

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: DATABASE_URL }),
});

async function ensureRoles() {
  const existing = await prisma.role.findMany({ select: { key: true } });
  const have = new Set(existing.map((r) => r.key));
  const wanted = [
    { key: "FOUNDER" as const, name: "Founder", description: "Full control over team and operations." },
    { key: "ADMIN" as const, name: "Admin", description: "Can manage staff operations and reviews." },
    { key: "STAFF" as const, name: "Staff", description: "Executes tasks and submits reports." },
  ];
  const toCreate = wanted.filter((r) => !have.has(r.key));
  if (toCreate.length) await prisma.role.createMany({ data: toCreate });
}

async function main() {
  await ensureRoles();

  const founderTelegramId = BigInt(111111111);
  const founder = await prisma.user.upsert({
    where: { telegramId: founderTelegramId },
    update: { username: "founder", firstName: "Dhereal", lastName: "Founder" },
    create: { telegramId: founderTelegramId, username: "founder", firstName: "Dhereal", lastName: "Founder" },
  });

  const team = await prisma.team.upsert({
    where: { slug: "dhereal-ops" },
    update: { name: "Dhereal Ops" },
    create: { name: "Dhereal Ops", slug: "dhereal-ops", createdByUserId: founder.id },
  });

  const founderRole = await prisma.role.findUnique({ where: { key: "FOUNDER" } });
  if (!founderRole) throw new Error("Missing founder role");

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: founder.id } },
    update: { roleId: founderRole.id, isActive: true, title: "Founder" },
    create: { teamId: team.id, userId: founder.id, roleId: founderRole.id, title: "Founder" },
  });

  const staffRole = await prisma.role.findUnique({ where: { key: "STAFF" } });
  if (!staffRole) throw new Error("Missing staff role");

  const staff = await prisma.user.upsert({
    where: { telegramId: BigInt(222222222) },
    update: { username: "staff", firstName: "Ops", lastName: "Staff" },
    create: { telegramId: BigInt(222222222), username: "staff", firstName: "Ops", lastName: "Staff" },
  });

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: staff.id } },
    update: { roleId: staffRole.id, isActive: true, title: "Staff" },
    create: { teamId: team.id, userId: staff.id, roleId: staffRole.id, title: "Staff" },
  });

  const task1 = await prisma.task.create({
    data: {
      teamId: team.id,
      createdById: founder.id,
      assignedToId: staff.id,
      title: "Verify Telegram webhook",
      priority: "HIGH",
    },
  });
  const task2 = await prisma.task.create({
    data: {
      teamId: team.id,
      createdById: founder.id,
      title: "Submit daily report",
      priority: "NORMAL",
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 12),
    },
  });

  const report = await prisma.report.create({
    data: {
      teamId: team.id,
      authorId: staff.id,
      reportDate: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z"),
      title: "Daily Ops Report",
      body: "Completed webhook smoke test. Blocked on prod env vars. Next: task CRUD polish.",
      status: "SUBMITTED",
    },
  });

  await prisma.activityLog.createMany({
    data: [
      {
        teamId: team.id,
        actorId: founder.id,
        action: "seed.created",
        entityType: "Team",
        entityId: team.id,
        metadata: { by: "Dhereal1" },
      },
      { teamId: team.id, actorId: founder.id, action: "task.created", entityType: "Task", entityId: task1.id, metadata: { title: task1.title } },
      { teamId: team.id, actorId: founder.id, action: "task.created", entityType: "Task", entityId: task2.id, metadata: { title: task2.title } },
      { teamId: team.id, actorId: staff.id, action: "report.submitted", entityType: "Report", entityId: report.id, metadata: { title: report.title } },
    ],
  });

  await prisma.aIInsight.create({
    data: {
      teamId: team.id,
      reportId: report.id,
      type: "SUMMARY",
      provider: "stub",
      inputHash: crypto.createHash("sha256").update(report.body).digest("hex"),
      content: "Summary (stub): Completed webhook smoke test · Blocked on prod env vars · Next: task CRUD polish.",
    },
  });

  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: {
      userId: founder.id,
      teamId: team.id,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });

  console.log("\nDhereal TeamOS seed complete. Built by Dhereal1");
  console.log(`Founder userId: ${founder.id}`);
  console.log(`TeamId: ${team.id}`);
  console.log(`Dev session cookie:\\n  dhereal_teamos_session=${token}\\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
