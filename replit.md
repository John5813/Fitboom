# FitBoom

A digital fitness aggregator platform for gyms in Uzbekistan. Users can discover gyms across Tashkent, book time slots using a universal credit system, scan QR codes for gym entry, and watch online fitness courses.

## Tech Stack

- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Wouter routing, Leaflet maps
- **Backend**: Node.js + Express + TypeScript (tsx)
- **Database**: PostgreSQL via Neon serverless (`@neondatabase/serverless` + Drizzle ORM)
- **Auth**: Telegram-based login (users receive a verification code via Telegram bot)
- **Storage**: Replit Object Storage for images and receipts
- **PDF**: PDFKit for fiscal receipts

## Project Structure

- `client/` — React frontend
  - `src/pages/` — App pages (Welcome, Login, Home, Profile, Admin, Courses, Map, etc.)
  - `src/components/` — Reusable UI components
  - `src/contexts/` — Auth and Language (UZ/RU/EN) providers
- `server/` — Express backend
  - `index.ts` — Server entry point
  - `routes.ts` — All API routes (~2000 lines)
  - `telegram.ts` — Telegram bot logic and webhook
  - `storage.ts` — Data access layer (Drizzle ORM)
  - `auth.ts` — Passport.js session auth
  - `migrate.ts` — DB migration runner
- `shared/schema.ts` — Database schema (Drizzle + Zod types)
- `migrations/` — SQL migration files

## Routes

- `/` — Welcome/landing page
- `/login` — Telegram-based login
- `/register` — Registration
- `/home` — Gym listing (protected)
- `/map` — Gym map (Leaflet)
- `/courses` — Online video courses (protected)
- `/profile` — User profile (protected)
- `/settings` — Settings (protected)
- `/gym-owner` — Gym owner panel (protected)
- `/admin/*` — Admin dashboard (protected, admin only)

## Environment Variables / Secrets

Full list with comments: `.env.example`. Secrets are **never** committed — they
live in the Replit Secrets panel.

**Required** (the server refuses to start without them):

- `DATABASE_URL` — Neon PostgreSQL connection string
- `SESSION_SECRET` — Express session secret (`openssl rand -base64 32`)
- `JWT_SECRET` — mobile API JWT signing secret (`openssl rand -base64 48`)

**Important:**

- `ADMIN_PASSWORD` — bootstrap password for the admin panel (min 10 chars).
  Hashed into the DB on first successful login; change it afterwards via
  `/api/admin/change-password`.
- `TELEGRAM_BOT_TOKEN` — Telegram bot token
- `ADMIN_IDS` — comma-separated Telegram IDs of admins. **The single source of
  truth for admin rights**: `is_admin` is granted on login for IDs in this list
  and revoked for IDs removed from it.
- `TELEGRAM_WEBHOOK_SECRET` — webhook signature (derived from `SESSION_SECRET`
  when unset)

- `CRON_SECRET` — shared secret for the external scheduler. Without it,
  `POST /api/cron/run` returns 503 and background jobs only run while the
  container happens to be awake.
- `GYM_PAYOUT_PER_CREDIT_UZS` — so'm credited to a gym per credit spent
  (default 1500). **Must stay below what a user pays per credit** (~3000),
  otherwise every visit loses money. A test enforces a minimum 20% margin.

**Optional:** `QR_SECRET`, `DEVSMS_API_KEY`, `ALLOWED_ORIGINS`,
`JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`

## Scheduled jobs

Background work runs through one endpoint so it does not depend on the
container staying awake:

```
POST /api/cron/run
X-Cron-Secret: <CRON_SECRET>
```

Point an external scheduler (cron-job.org, Replit Scheduled Deployment) at it
every 15 minutes. It marks past-due bookings as missed and releases their
seats, clears expired login codes, and sends credit-expiry reminders after
09:00 Tashkent. Every job is independently guarded, and reminder delivery is
de-duplicated through the `notification_log` table, so running it more often
than needed is safe.

## Legal documents

`client/src/content/legal.ts` holds the public offer, privacy policy and terms.
Factual clauses (what data is collected, how credits expire, the 2-hour
cancellation window) are derived from actual behaviour and are accurate.
Clauses marked `TODO_YURIST` are **placeholders awaiting a lawyer** — the page
shows a visible draft banner while any remain. Do not publish as-is.

Users accept the offer and privacy policy during profile completion; the
timestamp and document version land in `users.terms_accepted_at` /
`users.terms_version`.

## Security invariants

Real money (credits) flows through this app. Do not break these:

- **Credits are only added after a verified payment** — receipt upload
  (`/api/credit-payments/submit`) followed by admin approval in Telegram.
  Think hard before adding any new endpoint that grants credits.
- **Credit and seat arithmetic must be atomic** — use `spendUserCredits`,
  `refundUserCredits`, `reserveTimeSlotSpot`, `releaseTimeSlotSpot`. The
  read-modify-write pattern causes double-spend under concurrency.
- **Gym QR codes are HMAC-signed** (`server/qrSignature.ts`) — never bypass
  `isAuthenticGymQr()` when verifying a scan.
- **`qrCode` and `ownerAccessCode` never leave the server** — always pass gym
  objects through `publicGym()` before responding.
- **Every write endpoint is authorized** — `requireAdmin`, `requireGymManager`
  or `requireGymOwner`.

## Running the App

```bash
npm run dev       # Development server (port 5000)
npm run check     # TypeScript typecheck (must be 0 errors)
npm test          # Vitest unit tests
npm run build     # Production build
npm start         # Run production build (runs migrations first)
npm run db:migrate  # Run DB migrations manually
```

CI (`.github/workflows/ci.yml`) runs typecheck, tests and build on every push
and pull request.

## Database

All tables are created via the migration runner (`server/migrate.ts`). In development, run `npm run db:migrate` to create/update tables. Tables: `users`, `gyms`, `bookings`, `time_slots`, `credit_payments`, `login_codes`, `gym_visits`, `gym_payments`, `gym_ratings`, `video_collections`, `online_classes`, `user_purchases`, `admin_settings`, `admin_expenses`, `partnership_messages`, `stored_files`, `session`.
