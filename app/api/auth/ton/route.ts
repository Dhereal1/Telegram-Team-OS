import "@/modules/bootstrap/server";

import { withApi, jsonOk, jsonErr } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { verifyTonProof, type TonProofPayload } from "@/lib/ton/verify-proof";
import { logActivity } from "@/modules/activity/activity.service";

export const dynamic = "force-dynamic";

export const POST = withApi(async (request) => {
  const session = await requireApiSession();
  const body = (await request.json()) as TonProofPayload;

  const result = await verifyTonProof(body);
  if (!result.valid || !result.address) return jsonErr(result.error ?? "Wallet verification failed", { status: 400 });

  const wallet = await prisma.wallet.upsert({
    where: { address: result.address },
    create: {
      provider: "TON",
      status: "CONNECTED",
      address: result.address,
      userId: session.userId,
      teamId: session.teamId,
    },
    update: {
      status: "CONNECTED",
      userId: session.userId,
      teamId: session.teamId,
    },
    select: { id: true },
  });

  await logActivity({
    teamId: session.teamId!,
    actorId: session.userId,
    action: "wallet.connected",
    entityType: "Wallet",
    entityId: wallet.id,
    metadata: { address: result.address },
  });

  return jsonOk({ address: result.address, connected: true });
});

