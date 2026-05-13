import "server-only";

import { z } from "zod";
import { HttpError } from "@/packages/core/http-error";
import { obsLog } from "@/lib/obs/server";
import type { PlatformContext } from "@/packages/platform-core/types";

export type ContractDef<TReq extends z.ZodTypeAny, TRes extends z.ZodTypeAny> = {
  id: string; // e.g. "teamos.core.tasks.list.v1"
  version: number;
  request: TReq;
  response: TRes;
};

export function defineContract<TReq extends z.ZodTypeAny, TRes extends z.ZodTypeAny>(def: ContractDef<TReq, TRes>) {
  return def;
}

export type ContractHandler<TReq extends z.ZodTypeAny, TRes extends z.ZodTypeAny> = (input: z.infer<TReq>, ctx: PlatformContext) => Promise<z.infer<TRes>>;

type RegistryEntry = {
  def: ContractDef<z.ZodTypeAny, z.ZodTypeAny>;
  handler: ContractHandler<z.ZodTypeAny, z.ZodTypeAny>;
};

declare global {
  var __teamosContractRegistry: Map<string, RegistryEntry> | undefined;
}

function registry() {
  const m = globalThis.__teamosContractRegistry ?? new Map<string, RegistryEntry>();
  if (!globalThis.__teamosContractRegistry) globalThis.__teamosContractRegistry = m;
  return m;
}

export function registerContract<TReq extends z.ZodTypeAny, TRes extends z.ZodTypeAny>(
  def: ContractDef<TReq, TRes>,
  handler: ContractHandler<TReq, TRes>,
) {
  registry().set(def.id, { def: def as never, handler: handler as never });
}

export async function callInternal<TReq extends z.ZodTypeAny, TRes extends z.ZodTypeAny>(
  def: ContractDef<TReq, TRes>,
  input: unknown,
  ctx: PlatformContext,
) {
  const entry = registry().get(def.id);
  if (!entry) throw new HttpError(`Contract not registered: ${def.id}`, 500, "CONTRACT_MISSING");

  const req = def.request.parse(input) as z.infer<TReq>;
  obsLog("platform.contract.call", { requestId: "internal", route: def.id, method: "INTERNAL", userId: ctx.userId, teamId: ctx.teamId }, { version: def.version });

  const out = await entry.handler(req as never, ctx);
  return def.response.parse(out) as z.infer<TRes>;
}

