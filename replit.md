# FitBoom Fitness Marketplace

## Overview
FitBoom is a fitness marketplace that offers a credit-based subscription system for accessing multiple gyms and fitness studios. It allows users to browse gyms, book classes, watch online fitness content, and manage bookings via a mobile-first interface. The platform aims to provide a flexible and convenient way for users to engage with various fitness options, leveraging a React frontend, Express backend, and PostgreSQL database. The project envisions significant market potential by consolidating fitness services and enhancing user accessibility.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend uses React 18 with TypeScript, Vite for bundling, and Wouter for routing. UI components are built with shadcn/ui (Radix UI + Tailwind CSS) and custom components, adhering to a mobile-first design with a bottom navigation pattern, inspired by ClassPass/Mindbody aesthetics. State management utilizes React Query for server state and React Context for authentication. Styling is handled by Tailwind CSS, incorporating CSS variables for theming and an HSL color system.

### Backend Architecture
The backend is an Express.js application written in TypeScript, implementing a RESTful API design. Authentication is session-based using Passport.js (Local Strategy), with routes for user authentication, gyms, classes, bookings, and categories. All routes are protected by authentication middleware, with additional admin-only routes for specific functionalities. Telegram Bot authentication has been integrated as the primary login method, handling user registration, login, and profile completion flows.

### Database Architecture
PostgreSQL, hosted via Neon serverless, serves as the primary database. Drizzle ORM is used for type-safe queries and migrations. The schema includes `users` (with `telegramId`, `creditBalance`, `isAdmin`, `profileImageUrl`), `gyms`, `onlineClasses`, `bookings`, `categories`, `adminSettings` (for secure password storage), `partnershipMessages` (for partner requests), and `timeSlots` (for gym scheduling with weekly pattern, capacity management, and rest day support). A repository pattern (`IStorage` interface) abstracts database operations for better maintainability and testability.

### Time Slot System
- Weekly schedule pattern: Mon-Sat with hourly slots (09:00-21:00) by default
- Each slot tracks capacity and availableSpots (default 15 per hour)
- Auto-generate endpoint creates 72 slots (12 hours × 6 days) with one click
- Booking decrements availableSpots; cancellation restores them
- Admin and gym owner can manage slots via their respective panels
- Each gym has `closedDays` (array of day-of-week numbers as strings: "0"=Sunday, "6"=Saturday)
- Booking dialog dynamically filters available dates based on gym's closedDays (no more hardcoded Sunday block)

### Booking Cancellation Policy
- If cancelled ≥2 hours before scheduled start: credits are fully refunded
- If cancelled <2 hours before start: booking is cancelled but no credit refund
- Frontend pre-check warns user before they confirm late cancellation (window.confirm)
- Server enforces the policy regardless of frontend; `noRefund: true` in response when no refund given

### Project Structure
The project is organized as a monorepo:
- `/client`: React frontend.
- `/server`: Express backend.
- `/shared`: Code shared between frontend and backend (e.g., database schema, Zod validation schemas).
- `/migrations`: Database migration files.
Development uses Vite, and production builds static assets served by Express.

### Key Design Patterns
- **Component Patterns**: Presentational/Container, Compound Components, Controlled Components with React Hook Form, Custom Hooks.
- **Data Fetching**: React Query for caching, refetching, and optimistic updates.
- **Error Handling**: Global error boundaries, React Query error states, toast notifications, HTTP status codes.
- **Security**: Bcrypt password hashing, secure session management, Zod for input validation, role-based authorization, Telegram authentication security features (rate limiting, code expiry, attempt throttling).
- **Telegram Bot**: Completely rewritten (Feb 2026). Bot token stored in secrets (not hardcoded). Login codes stored in PostgreSQL `login_codes` table (persistent across restarts). Webhook URL auto-detected from REPLIT_DOMAINS/REPLIT_DEV_DOMAIN environment variables. Exported functions: `setupTelegramBot`, `setupTelegramWebhook`, `notifyProfileCompleted`, `sendPaymentReceiptToAdmin`.

## External Dependencies

### Third-Party Services
- **Database**: Neon PostgreSQL (serverless database).
- **Payment Processing**: Stripe for credit purchases, including Checkout Sessions and webhook handling.
- **Telegram Bot API**: For user authentication and registration.

### UI Component Libraries
- **Radix UI Primitives**: Accessible, unstyled UI primitives.
- **shadcn/ui**: Component library built on Radix UI and Tailwind CSS.
- **Additional UI Libraries**: `cmdk` (command palette), `react-day-picker` (date selection), `lucide-react` (icons), `vaul` (drawer), `embla-carousel-react` (carousel).

### Development Tools
- **Build Tools**: Vite, esbuild, PostCSS.
- **Type Safety**: TypeScript, Zod (runtime validation), Drizzle-Zod.
- **Development Utilities**: `tsx`, Replit-specific plugins.

### Image & File Storage
- **Replit Object Storage** (Google Cloud Storage) is used for persistent file storage. All uploaded images (gym photos, receipts) are stored in the cloud bucket and survive deployments/restarts.
- Upload endpoints (`/api/upload-images`, `/api/upload-image`) use multer memory storage and save to Object Storage under `images/` prefix.
- Receipt uploads save to Object Storage under `receipts/` prefix.
- Serving endpoints (`/api/images/:filename`, `/api/receipts/:filename`) read from Object Storage with fallback to local `uploads/` directory for backwards compatibility.
- Static assets (hero images, thumbnails) are in `/attached_assets/generated_images/`.