# Dhereal TeamOS

Telegram-native AI staff operations platform for founders and teams running business inside Telegram.

Built by Dhereal1.

## Getting Started

### 1) Configure environment

Copy `.env.example` → `.env` and set:

- `DATABASE_URL` (Neon Postgres)
- `TELEGRAM_BOT_TOKEN`
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (for Login Widget)

### 2) Prisma

```bash
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
```

### 3) Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Structure (Phase 1)

- `app/` App Router routes (marketing + dashboard + API route handlers)
- `components/` UI system + app shell
- `lib/` auth, db, telegram, ton, ai, validators, utils
- `services/` modular business services
- `prisma/` schema and migrations

## Notes

- Telegram Mini App auth: `/api/auth/telegram` supports `initData` validation.
- Webhook scaffold: `/api/telegram/webhook` supports Telegram secret-token header validation.
- TON Connect is gated by `NEXT_PUBLIC_TON_MANIFEST_URL`.
