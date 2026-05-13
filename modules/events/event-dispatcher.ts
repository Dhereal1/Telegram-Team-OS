import "server-only";

import { eventBus, type EventName, type EventPayload } from "@/packages/events/events";
import { createDomainEvent } from "@/modules/events/domain-events.repository";
import { getQueue } from "@/modules/scheduler/queues";

function teamIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const v = (payload as Record<string, unknown>)["teamId"];
  return typeof v === "string" && v.length ? v : null;
}

export async function emitDomainEvent<TName extends EventName>(name: TName, payload: EventPayload<TName>, options?: { dedupeKey?: string | null; teamId?: string | null }) {
  // Always emit in-process (best-effort) for local/dev and single-process environments.
  void eventBus.emit(name, payload);

  // Persist for audit + replay and enqueue for durable processing when BullMQ is available.
  const evt = await createDomainEvent({
    teamId: options?.teamId ?? teamIdFromPayload(payload),
    name,
    version: 1,
    schemaKey: null,
    dedupeKey: options?.dedupeKey ?? null,
    payload: payload as never,
  }).catch(() => null);

  const queue = getQueue("domain-events");
  if (queue && evt) {
    await queue.add(
      "dispatch",
      { eventId: evt.id },
      {
        jobId: evt.id,
        attempts: 8,
        backoff: { type: "exponential", delay: 2_000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );
  }

  return evt;
}
