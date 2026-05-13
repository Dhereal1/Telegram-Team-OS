export type TeamOSPublicApiClientOptions = {
  baseUrl: string; // e.g. "https://your-domain.com"
  apiKey: string; // "teamos_sk_..."
};

export class TeamOSPublicApiClient {
  constructor(private readonly opts: TeamOSPublicApiClientOptions) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.opts.baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        authorization: `Bearer ${this.opts.apiKey}`,
        "content-type": "application/json",
      },
    });
    const body = (await res.json()) as { ok: boolean; data?: unknown; error?: string };
    if (!res.ok || !body.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
    return body.data as T;
  }

  meta() {
    return this.request<{ version: string; latest: string; name: string }>(`/api/public/v1/meta`, { method: "GET" });
  }

  listTasks(input?: { limit?: number; status?: string }) {
    const qs = new URLSearchParams();
    if (input?.limit) qs.set("limit", String(input.limit));
    if (input?.status) qs.set("status", input.status);
    const q = qs.toString();
    return this.request<{ tasks: unknown[] }>(`/api/public/v1/tasks${q ? `?${q}` : ""}`, { method: "GET" });
  }

  createTask(input: { title: string; description?: string; priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT"; dueAt?: string; assignedToId?: string }) {
    return this.request<{ task: unknown }>(`/api/public/v1/tasks`, { method: "POST", body: JSON.stringify(input) });
  }

  listWebhookSubscriptions() {
    return this.request<{ subscriptions: unknown[] }>(`/api/public/v1/webhooks/subscriptions`, { method: "GET" });
  }

  createWebhookSubscription(input: { url: string; events: string[] }) {
    return this.request<{ subscription: unknown }>(`/api/public/v1/webhooks/subscriptions`, { method: "POST", body: JSON.stringify(input) });
  }
}

