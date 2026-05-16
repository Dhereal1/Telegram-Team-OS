## Pre-deploy
- [ ] All env vars from `.env.example` are set in production
- [ ] Stripe webhook endpoint registered: `POST /api/billing/webhook`
- [ ] Telegram webhook registered: `POST /api/telegram/webhook` (with secret token header)
- [ ] `REDIS_URL` points to a persistent Redis (not Upstash REST — that is for rate limiting only)
- [ ] `DATABASE_URL` points to production Neon branch (not dev branch)
- [ ] Run `npx prisma migrate deploy` against production DB before deploying

## Deploy
- [ ] Deploy Next.js app (Vercel / Railway / Fly)
- [ ] Deploy worker process separately: `npm run worker`
- [ ] Confirm `/api/health/live` returns 200
- [ ] Confirm `/api/health/ready` returns 200 (db + redis green)

## Post-deploy
- [ ] Send `/start` in a test Telegram group with a valid invite link
- [ ] Assign a test task via `/assign` — confirm DM notification received
- [ ] Submit a test report via `/report` — confirm no errors
- [ ] Trigger a test Stripe checkout — confirm plan upgrades correctly
- [ ] Check worker logs for "Workers started" and "Bot commands registered with Telegram"

## Registering the Telegram webhook
Run once after deploy (replace values):

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://yourdomain.com/api/telegram/webhook","secret_token":"<TELEGRAM_WEBHOOK_SECRET>"}'
```

