import "server-only";

import type { EventName } from "@/packages/events/events";

// Curated subset of internal domain events that are safe and useful externally.
// Expand only via governance review.
export const PUBLIC_EVENT_ALLOWLIST: ReadonlySet<EventName> = new Set<EventName>([
  "task.created",
  "task.assigned",
  "task.completed",
  "report.submitted",
  "invite.created",
  "invite.accepted",
  "member.joined",
]);

export function isPublicEvent(name: string): name is EventName {
  return (PUBLIC_EVENT_ALLOWLIST as ReadonlySet<string>).has(name);
}

