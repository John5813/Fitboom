# FitBoom - Gym Management Platform

## Overview
FitBoom is a full-stack gym/fitness management platform built for Uzbekistan (Tashkent). It allows users to discover gyms, book slots, purchase credits, and access online fitness courses. Gym owners can manage their facilities, and admins have full control over users, payments, and content.

## Architecture

- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, Radix UI, TanStack Query, Wouter routing
- **Backend**: Node.js + Express, TypeScript, served on port 5000
- **Database**: PostgreSQL via Neon serverless (`@neondatabase/serverless`)
- **ORM**: Drizzle ORM (schema in `shared/schema.ts`)
- **Auth**: Passport.js (local strategy) + Telegram bot authentication
- **File Storage**: `@replit/object-storage` for persistent file uploads
- **Integrations**: Telegram Bot, Stripe payments

## Project Structure

```
client/          # React frontend (Vite)
  src/
    components/  # Reusable UI components (shadcn/ui + custom)
    pages/       # App views (Home, Admin, Courses, Gym Owner, etc.)
    contexts/    # Auth and Language contexts
    hooks/       # Custom hooks
    lib/         # Utilities
server/          # Express backend
  index.ts       # Entry point
  routes.ts      # All API routes (~2280 lines)
  storage.ts     # Database abstraction layer
  auth.ts        # Authentication (Passport.js)
  telegram.ts    # Telegram bot integration
  migrate.ts     # Database migration runner
  vite.ts        # Vite dev server integration
shared/
  schema.ts      # Drizzle ORM schema + Zod validation (single source of truth)
migrations/      # SQL migration files
uploads/         # User uploads directory
```

## Key Scripts

- `npm run dev` — Start development server (via `npx tsx server/index.ts`)
- `npm run build` — Build frontend + backend for production
- `npm start` — Run production build (runs migrations then starts server)
- `NODE_ENV=production npx tsx server/migrate.ts` — Run database migrations

## Environment Variables Required

- `DATABASE_URL` — PostgreSQL connection string (Neon serverless)
- `SESSION_SECRET` — Express session secret
- `TELEGRAM_BOT_TOKEN` — Telegram bot token (optional, disables bot if missing)
- `STRIPE_SECRET_KEY` — Stripe secret key (optional)
- `VITE_STRIPE_PUBLIC_KEY` — Stripe publishable key (optional)
- `OBJECT_STORAGE_BUCKET_ID` — Replit object storage bucket (for file uploads)

## Database Schema Tables

- `users` — Platform users (telegram auth + phone)
- `gyms` — Gym listings with location, hours, categories
- `bookings` — Gym slot bookings
- `time_slots` — Available time slots per gym
- `gym_visits` — Visit history
- `gym_payments` — Gym payment records
- `gym_ratings` — User ratings for gyms
- `video_collections` — Online course collections
- `online_classes` — Individual videos in collections
- `user_purchases` — Course purchase records
- `credit_payments` — Credit top-up payment records
- `login_codes` — Phone OTP login codes
- `admin_settings` — Key-value admin configuration
- `partnership_messages` — Gym partner inquiries
- `admin_expenses` — Monthly expense tracking
- `stored_files` — Files stored in database (fallback)
- `categories` — Gym/activity categories

## Workflow

- **Start application** — `NODE_ENV=development npx tsx server/index.ts` (port 5000, webview)

## Migration Notes

- Migrations were initially created with drizzle-kit v0.18.1 (outdated)
- The live database schema was synced manually via SQL during the Replit migration
- Future schema changes: modify `shared/schema.ts` then write SQL migrations manually or upgrade drizzle-kit
