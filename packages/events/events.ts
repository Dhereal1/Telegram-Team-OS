import "server-only";

export type EventMap = {
  "task.created": { teamId: string; actorId: string; taskId: string; title: string };
  "task.assigned": { teamId: string; actorId: string; taskId: string; title: string; assignedToUserId: string };
  "task.completed": { teamId: string; actorId: string; taskId: string; title: string };
  "task.overdue": { teamId: string; taskId: string; title: string; dueAt: string; assignedToUserId?: string | null; teamChatId?: string | null };
  "report.submitted": { teamId: string; actorId: string; reportId: string; title: string };
  "report.missed": { teamId: string; userId: string; dateKey: string; teamChatId?: string | null };
  "invite.created": { teamId: string; actorId: string; inviteId: string; roleKey: "FOUNDER" | "ADMIN" | "STAFF" };
  "invite.accepted": { teamId: string; actorId: string; inviteId: string };
  "member.joined": { teamId: string; actorId: string; memberId: string; roleKey: "FOUNDER" | "ADMIN" | "STAFF" };
  "member.inactive": { teamId: string; userId: string; daysInactive: number };
};

export type EventName = keyof EventMap;
export type EventPayload<TName extends EventName> = EventMap[TName];
export type EventListener<TName extends EventName> = (payload: EventPayload<TName>) => Promise<void> | void;

class EventBus {
  private listeners: { [K in EventName]?: Array<EventListener<K>> } = {};

  on<TName extends EventName>(name: TName, listener: EventListener<TName>) {
    const list = (this.listeners[name] ??= []);
    list.push(listener as never);
    return () => {
      const next = (this.listeners[name] ?? []).filter((l) => l !== (listener as never));
      this.listeners[name] = next as never;
    };
  }

  async emit<TName extends EventName>(name: TName, payload: EventPayload<TName>) {
    const list = (this.listeners[name] ?? []) as Array<EventListener<TName>>;
    await Promise.all(
      list.map(async (listener) => {
        try {
          await listener(payload);
        } catch {
          // Listener failures must never break the primary request path.
        }
      }),
    );
  }
}

declare global {
  var __teamosEventBus: EventBus | undefined;
}

export const eventBus: EventBus = globalThis.__teamosEventBus ?? new EventBus();
if (process.env.NODE_ENV !== "production") globalThis.__teamosEventBus = eventBus;
