import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { MemberScore } from "@/lib/scores/calculate-member-score";
import { calculateMemberScore } from "@/lib/scores/calculate-member-score";

export async function calculateTeamScores(teamId: string, windowDays: number = 7): Promise<MemberScore[]> {
  const members = await prisma.teamMember.findMany({
    where: { teamId, isActive: true, status: "ACTIVE" },
    select: { userId: true },
    take: 5000,
  });

  const scores = await Promise.all(members.map((m) => calculateMemberScore(teamId, m.userId, windowDays)));
  scores.sort((a, b) => b.totalScore - a.totalScore);
  return scores;
}

