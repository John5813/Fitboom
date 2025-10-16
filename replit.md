# FitBoom Fitness Marketplace

## Overview

FitBoom is a fitness marketplace application that enables users to access multiple gyms and fitness studios through a credit-based subscription system. The platform allows users to browse gyms, book classes, watch online fitness content, and manage their bookings through a mobile-first interface. The application is built with React on the frontend and Express on the backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management and API caching

**UI Component Strategy**
- shadcn/ui component library (Radix UI primitives with Tailwind styling)
- Custom component library in `client/src/components/` for app-specific features
- Design system based on ClassPass/Mindbody aesthetic (defined in `design_guidelines.md`)
- Responsive, mobile-first design approach with bottom navigation pattern

**State Management**
- React Query for server state (gyms, bookings, classes, user data)
- React Context for authentication state (`AuthContext`)
- Local component state with React hooks for UI interactions

**Styling Approach**
- Tailwind CSS with custom configuration
- CSS variables for theming (light/dark mode support)
- Custom utility classes for elevation/hover effects
- HSL color system for consistent theming

### Backend Architecture

**Server Framework**
- Express.js with TypeScript
- Session-based authentication using Passport.js (Local Strategy)
- RESTful API design pattern

**API Structure**
- Authentication routes: `/api/register`, `/api/login`, `/api/logout`, `/api/user`
- Resource routes: `/api/gyms`, `/api/classes`, `/api/bookings`
- CRUD operations for gyms, classes, and bookings
- Protected routes require authentication middleware

**Authentication & Sessions**
- Passport.js with Local Strategy for username/password authentication
- Express sessions with configurable storage (development vs production)
- Session cookies with 7-day expiration
- User serialization/deserialization for session management

### Database Architecture

**ORM & Migrations**
- Drizzle ORM for type-safe database queries
- PostgreSQL as the primary database (via Neon serverless)
- Schema definitions in `shared/schema.ts`
- Migration files in `migrations/` directory

**Database Schema**
- `users`: User accounts with username, bcrypt-hashed password, credit balance, and isAdmin role flag
- `gyms`: Gym listings with location, pricing, facilities, and metadata
- `onlineClasses`: Video fitness classes with instructor and duration info
- `bookings`: User gym reservations with date, time, and QR code tracking

**Storage Layer**
- Repository pattern implemented in `server/storage.ts`
- `IStorage` interface defines all database operations
- `DatabaseStorage` class implements the interface using Drizzle ORM
- Abstraction allows for easier testing and potential storage backend changes

### Project Structure

**Monorepo Organization**
- `/client`: Frontend React application
  - `/src/components`: Reusable UI components
  - `/src/pages`: Route-level page components
  - `/src/contexts`: React context providers
  - `/src/hooks`: Custom React hooks
  - `/src/lib`: Utility functions and query client configuration
- `/server`: Backend Express application
  - `routes.ts`: API route definitions
  - `auth.ts`: Authentication configuration
  - `storage.ts`: Database abstraction layer
  - `db.ts`: Database connection setup
- `/shared`: Code shared between frontend and backend
  - `schema.ts`: Database schema and Zod validation schemas
- `/migrations`: Database migration files

**Build & Deployment**
- Development: Vite dev server proxies to Express backend
- Production: Vite builds static assets, Express serves them
- TypeScript compilation with path aliases (@/, @shared/, @assets/)

### Key Design Patterns

**Component Patterns**
- Presentational/Container component separation
- Compound components for complex UI (dialogs, cards)
- Controlled components with React Hook Form integration
- Custom hooks for reusable logic (useAuth, useToast, useIsMobile)

**Data Fetching Strategy**
- React Query for automatic caching and refetching
- Optimistic updates for better UX
- Query key structure: `['/api/resource']`
- Custom query function with credential inclusion for authenticated requests

**Error Handling**
- Global error boundary in Express middleware
- React Query error states in components
- Toast notifications for user-facing errors
- HTTP status codes for API responses

**Security Considerations**
- Bcrypt password hashing with salt rounds for secure authentication
- Session secret required in production (SESSION_SECRET environment variable)
- Secure cookies in production (HTTPS only)
- Input validation using Zod schemas on critical endpoints
- Role-based authorization with isAdmin middleware protecting admin routes
- Stripe webhook signature verification (optional STRIPE_WEBHOOK_SECRET)

## External Dependencies

### Third-Party Services

**Database**
- Neon PostgreSQL (serverless PostgreSQL provider)
- Connection via `@neondatabase/serverless` with WebSocket support
- Environment variable: `DATABASE_URL`

**Payment Processing**
- Stripe integration for credit purchases with Checkout Sessions
- Server-side pricing validation to prevent client manipulation
- Webhook handling for payment confirmation
- Environment variables: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (optional)
- Test mode supported for development

### UI Component Libraries

**Radix UI Primitives**
- Accessible, unstyled component primitives
- Dialog, Dropdown, Popover, Tooltip, and other overlay components
- Form elements with proper ARIA attributes

**Additional UI Dependencies**
- `cmdk`: Command palette/search functionality
- `react-day-picker`: Date selection for bookings
- `lucide-react`: Icon library
- `vaul`: Drawer component for mobile interactions
- `embla-carousel-react`: Carousel/slider functionality

### Development Tools

**Build Tools**
- Vite with React plugin
- esbuild for server-side bundling
- PostCSS with Tailwind and Autoprefixer

**Type Safety**
- TypeScript for all application code
- Zod for runtime validation and schema generation
- Drizzle-Zod for automatic Zod schema generation from database schema

**Development Utilities**
- `tsx` for running TypeScript files in development
- Replit-specific plugins for development experience
- WebSocket support (ws) for Neon database connections

### Image Assets

**Static Assets**
- Generated images stored in `/attached_assets/generated_images/`
- Hero images, gym photos, class thumbnails
- Imported directly in components using Vite asset imports

## Recent Changes

### October 16, 2025 - Database Migration System Setup

**Migration System Implementation**
- Set up automatic database migrations for production deployment
- Created `server/migrate.ts` for running migrations programmatically
- Added migration generation and execution to build/start scripts
- Migration workflow:
  - Development: Use `npm run db:push` for schema changes
  - Production: Migrations auto-run on startup via `npm start`
  - GitHub to Droplet: Database structure auto-creates on deployment

**Updated Scripts**
- `npm run build`: Now generates migrations during build
- `npm start`: Runs migrations before starting server (production)
- `npm run db:generate`: Manually generate migration files
- `npm run db:migrate`: Manually run migrations (development)

**Deployment Flow**
1. Push code to GitHub
2. Deploy to Droplet
3. Build runs: `vite build && drizzle-kit generate && esbuild...`
4. Start runs: migrations execute → server starts
5. Database structure auto-created

### Pending Integrations

**Twilio SMS Authentication (Postponed)**
- User requested phone number authentication with SMS verification
- Twilio integration dismissed for later implementation
- Required secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
- Feature: Replace login/signup forms with phone-only auth flow
- Status: Waiting for Twilio account setup