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
PostgreSQL, hosted via Neon serverless, serves as the primary database. Drizzle ORM is used for type-safe queries and migrations. The schema includes `users` (with `telegramId`, `creditBalance`, `isAdmin`, `profileImageUrl`), `gyms`, `onlineClasses`, `bookings`, `categories`, `adminSettings` (for secure password storage), and `partnershipMessages` (for partner requests). A repository pattern (`IStorage` interface) abstracts database operations for better maintainability and testability.

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

### Image Assets
- Static assets (hero images, gym photos, thumbnails) are stored in `/attached_assets/generated_images/`.