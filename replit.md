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

- `DATABASE_URL` — Neon PostgreSQL connection string (runtime managed)
- `SESSION_SECRET` — Express session secret
- `TELEGRAM_BOT_TOKEN` — Telegram bot token (for user auth and notifications)
- `ADMIN_IDS` — Comma-separated Telegram IDs of admins
- `JWT_SECRET` — JWT signing secret

## Running the App

```bash
npm run dev       # Development server (port 5000)
npm run build     # Production build
npm start         # Run production build (runs migrations first)
npm run db:migrate  # Run DB migrations manually
```

## Database

All tables are created via the migration runner (`server/migrate.ts`). In development, run `npm run db:migrate` to create/update tables. Tables: `users`, `gyms`, `bookings`, `time_slots`, `credit_payments`, `login_codes`, `gym_visits`, `gym_payments`, `gym_ratings`, `video_collections`, `online_classes`, `user_purchases`, `admin_settings`, `admin_expenses`, `partnership_messages`, `stored_files`, `session`.
