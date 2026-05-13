import "server-only";

import { z } from "zod";
import { emitDomainEvent } from "@/modules/events/event-dispatcher";

export type MeshEventDef<TSchema extends z.ZodTypeAny> = {
  name: string; // e.g. "teamos.task.created"
  version: number;
  schemaKey: string; // stable, e.g. "teamos.task.created"
  schema: TSchema;
};

declare global {
  var __teamosEventMesh: Map<string, MeshEventDef<z.ZodTypeAny>> | undefined;
}

function mesh() {
  const m = globalThis.__teamosEventMesh ?? new Map<string, MeshEventDef<z.ZodTypeAny>>();
  if (!globalThis.__teamosEventMesh) globalThis.__teamosEventMesh = m;
  return m;
}

export function defineMeshEvent<TSchema extends z.ZodTypeAny>(def: MeshEventDef<TSchema>) {
  mesh().set(def.name, def as MeshEventDef<z.ZodTypeAny>);
  return def;
}

export async function emitMeshEvent<TSchema extends z.ZodTypeAny>(
  def: MeshEventDef<TSchema>,
  payload: unknown,
  options?: { teamId?: string | null; dedupeKey?: string | null },
) {
  const parsed = def.schema.parse(payload) as z.infer<TSchema>;
  // Persist via durable domain event record with governance metadata.
  const teamIdFromParsed = (() => {
    if (!parsed || typeof parsed !== "object") return null;
    const v = (parsed as Record<string, unknown>)["teamId"];
    return typeof v === "string" && v.length ? v : null;
  })();
  return emitDomainEvent(def.name as never, parsed as never, {
    teamId: options?.teamId ?? teamIdFromParsed,
    dedupeKey: options?.dedupeKey ?? null,
  });
}
