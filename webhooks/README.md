# Phase 8 — Webhooks

Webhook delivery is **durable** and **governed**:
- Subscription ownership is a workspace app install
- Deliveries are signed (HMAC) and replayable
- Retries are queued (BullMQ) when enabled

