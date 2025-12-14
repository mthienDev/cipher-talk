# CipherTalk Codebase Summary

**Last Updated:** December 14, 2025
**Phase:** 02 - Authentication & Authorization
**Status:** Completed

---

## Overview

CipherTalk is a secure enterprise chat platform built with a modern monorepo architecture. The codebase uses NestJS (backend), React + TypeScript (frontend), and shared TypeScript types to ensure type safety across the entire application.

### Tech Stack Summary
- **Backend:** NestJS 10 + Fastify adapter, PostgreSQL 16, Drizzle ORM
- **Frontend:** React 19 + Vite, TypeScript, Zustand, TanStack Query, Tailwind CSS
- **Database:** PostgreSQL with Drizzle ORM migrations
- **Cache/Sessions:** Redis 7
- **File Storage:** MinIO (S3-compatible)
- **Real-time:** Socket.IO with WebSocket support
- **Shared:** TypeScript types and utilities in monorepo `packages/shared`

---

## Project Structure

### Root Level
```
cipher-talk/
├── apps/
│   ├── api/              # NestJS backend application
│   └── web/              # React frontend application
├── packages/
│   └── shared/           # Shared TypeScript types and utilities
├── docker/               # Docker Compose configuration
├── docs/                 # Project documentation
├── plans/                # Implementation plans and reports
├── .env.example          # Environment variables template
└── pnpm-workspace.yaml   # Monorepo workspace configuration
```

---

## Backend (apps/api)

### Architecture
- **Framework:** NestJS 10 with Fastify adapter
- **Port:** 3000 (configurable via PORT env var)
- **Entry Point:** `src/main.ts`

### Directory Structure
```
apps/api/src/
├── main.ts              # Application bootstrap
├── app.module.ts        # Root module with ConfigModule, DatabaseModule, AuthModule, UsersModule
├── app.controller.ts    # Health check and test endpoints
├── app.service.ts       # App-level business logic
├── database/
│   ├── schema.ts        # Drizzle ORM table definitions
│   ├── index.ts         # Database client exports
│   └── database.module.ts  # Database NestJS module
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts           # Auth module configuration
│   │   ├── auth.controller.ts       # Auth REST endpoints (register, login, refresh, logout)
│   │   ├── auth.service.ts          # Auth business logic (JWT, Argon2id)
│   │   ├── dto/                     # Request/response DTOs
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts    # JWT authentication guard
│   │   │   └── roles.guard.ts       # RBAC authorization guard
│   │   ├── decorators/
│   │   │   └── roles.decorator.ts   # Role decorator for RBAC
│   │   └── strategies/
│   │       └── jwt.strategy.ts      # Passport JWT strategy
│   └── users/
│       ├── users.module.ts          # Users module configuration
│       └── users.service.ts         # User CRUD operations
└── drizzle/             # Database migrations (auto-generated)
```

### Database Schema (Drizzle ORM)

#### Users Table
```typescript
users {
  id: UUID (PK)
  email: VARCHAR(255) (UNIQUE)
  username: VARCHAR(50) (UNIQUE)
  displayName: VARCHAR(100)
  passwordHash: TEXT
  avatarUrl: TEXT (nullable)
  status: VARCHAR(20) - default: 'offline'
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
  // Indexes: email, username
}
```

#### Conversations Table
```typescript
conversations {
  id: UUID (PK)
  type: VARCHAR(20) - 'direct' | 'group'
  name: VARCHAR(100) (nullable)
  avatarUrl: TEXT (nullable)
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}
```

#### Conversation Members Table (Relationship)
```typescript
conversationMembers {
  id: UUID (PK)
  conversationId: UUID (FK → conversations)
  userId: UUID (FK → users)
  role: VARCHAR(20) - default: 'member'
  joinedAt: TIMESTAMP
  // Indexes: conversationId, userId
}
```

#### Messages Table
```typescript
messages {
  id: UUID (PK)
  conversationId: UUID (FK → conversations)
  senderId: UUID (FK → users, nullable on delete)
  content: TEXT (encrypted)
  type: VARCHAR(20) - default: 'text'
  metadata: TEXT (JSON string, nullable)
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
  // Indexes: conversationId, senderId, createdAt
}
```

#### Refresh Tokens Table
```typescript
refreshTokens {
  id: UUID (PK)
  userId: UUID (FK → users, cascade)
  tokenHash: TEXT
  expiresAt: TIMESTAMP
  deviceInfo: TEXT (nullable)
  ipAddress: VARCHAR(45) (nullable)
  createdAt: TIMESTAMP
  revokedAt: TIMESTAMP (nullable)
  // Indexes: userId, tokenHash
}
```

#### User Roles Table (RBAC)
```typescript
userRoles {
  id: UUID (PK)
  userId: UUID (FK → users, cascade)
  role: VARCHAR(20) - 'admin' | 'moderator' | 'member'
  grantedBy: UUID (FK → users, nullable)
  createdAt: TIMESTAMP
  // Indexes: userId, role
}
```

#### Password Reset Tokens Table
```typescript
passwordResetTokens {
  id: UUID (PK)
  userId: UUID (FK → users, cascade)
  tokenHash: TEXT
  expiresAt: TIMESTAMP
  usedAt: TIMESTAMP (nullable)
  createdAt: TIMESTAMP
  // Indexes: userId, tokenHash
}
```

### Database Management
```bash
# Generate migrations from schema changes
pnpm --filter api db:generate

# Run pending migrations
pnpm --filter api db:migrate

# Push schema without migration files (development)
pnpm --filter api db:push

# Visual migration studio
pnpm --filter api db:studio
```

### Module System
- **AppModule:** Root module, imports ConfigModule, DatabaseModule, AuthModule, UsersModule, ThrottlerModule
- **ConfigModule:** Global environment configuration
- **DatabaseModule:** Provides database client and repository patterns
- **AuthModule:** JWT authentication, token management, guards, and strategies
- **UsersModule:** User CRUD operations and service layer
- **ThrottlerModule:** Rate limiting for auth endpoints (3/min register, 5/min login)

### Environment Variables (Backend)
```env
# Core
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ciphertalk

# Redis
REDIS_URL=redis://localhost:6379

# Authentication (Phase 02 - IMPLEMENTED)
JWT_SECRET=<32-char-min-random-string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption (to be added in Phase 04)
ENCRYPTION_KEY=<32-char-random-string>

# Storage (MinIO)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=ciphertalk
```

---

## Frontend (apps/web)

### Architecture
- **Framework:** React 19 + TypeScript + Vite
- **Port:** 5173 (dev server)
- **Build Tool:** Vite with React plugin
- **Package Manager:** pnpm

### Directory Structure
```
apps/web/src/
├── main.tsx         # React entry point with BrowserRouter, QueryClientProvider
├── App.tsx          # Root component with Routes (/login, /register, /)
├── index.css        # Global styles with Tailwind imports
├── vite-env.d.ts    # Vite environment types
├── components/
│   ├── header.tsx           # App header with user info and logout
│   └── protected-route.tsx  # Route guard for authenticated routes
├── features/
│   └── auth/
│       ├── components/
│       │   ├── login-form.tsx     # Login form with validation
│       │   └── register-form.tsx  # Registration form with password confirmation
│       ├── hooks/
│       │   └── use-auth.ts        # TanStack Query mutations (useLogin, useRegister, useLogout)
│       └── api/
│           └── auth-api.ts        # Auth API client methods
├── stores/
│   ├── auth-store.ts    # Zustand auth store with persist middleware
│   └── index.ts         # Store exports
└── lib/
    ├── api-client.ts    # Axios instance with JWT interceptors
    └── utils.ts         # Utility functions
```

### State Management
- **Store:** Zustand
- **Server State:** TanStack Query (@tanstack/react-query)
- **Current Store:** `auth-store.ts` for authentication state

```typescript
// auth-store interface (Zustand)
{
  isAuthenticated: boolean
  user: { username: string } | null
  setUser: (user: object) => void
  logout: () => void
}
```

### Styling
- **Tailwind CSS:** Configured with dark mode (`darkMode: 'class'`)
- **PostCSS:** Autoprefixer configured
- **UI Library:** shadcn/ui (to be integrated)

### Development Commands
```bash
# Start dev server (port 5173)
pnpm --filter web dev

# Build for production
pnpm --filter web build

# Preview production build
pnpm --filter web preview

# Type check
pnpm --filter web tsc --noEmit
```

### Current Implementation
- Full authentication system with login/register forms
- Protected routes with automatic redirect to /login
- JWT token refresh with axios interceptors
- Header component with user info and logout functionality
- React Router v7 for client-side routing
- Tailwind dark mode color scheme (slate-900 base)

---

## Shared Types (packages/shared)

### Purpose
Centralized TypeScript types and utilities shared across frontend and backend.

### Current Content
- Type definitions (to be expanded)
- Utility functions (to be added)

### Usage
```typescript
// Import in both apps
import { SomeType } from '@ciphertalk/shared'
```

---

## Docker Services

### Services Defined in docker/docker-compose.yml
```yaml
PostgreSQL:
  - Port: 5432
  - User: ciphertalk
  - Password: (from .env)
  - Database: ciphertalk

Redis:
  - Port: 6379
  - No auth required (development)

MinIO:
  - API Port: 9000
  - Console Port: 9001
  - Credentials: minioadmin / minioadmin
  - Initial bucket: ciphertalk
```

### Startup Commands
```bash
# Start all services
pnpm docker:up

# Stop all services
pnpm docker:down

# View logs
pnpm docker:logs
```

---

## Development Workflow

### Installation
```bash
# 1. Install root dependencies
pnpm install

# 2. Setup environment
cp .env.example .env
# Update DATABASE_URL, REDIS_URL as needed

# 3. Start Docker services
pnpm docker:up

# 4. Run database migrations
pnpm --filter api db:migrate

# 5. Start all development servers
pnpm dev
```

### Running Applications
```bash
# All in parallel
pnpm dev

# Individual applications
pnpm --filter api dev      # Backend only
pnpm --filter web dev      # Frontend only

# Build shared types
pnpm --filter @ciphertalk/shared build
```

### Linting & Formatting
```bash
pnpm lint     # Run ESLint across monorepo
pnpm format   # Format code with Prettier
```

### Testing
```bash
pnpm test           # Unit tests
pnpm test:watch     # Watch mode
pnpm test:cov       # Coverage report
pnpm test:e2e       # E2E tests (Cypress/Playwright)
```

---

## Configuration Files

### Root Level
- **pnpm-workspace.yaml:** Monorepo workspace definition
- **.env.example:** Environment template
- **package.json:** Root workspace scripts

### Backend (apps/api)
- **tsconfig.json:** TypeScript configuration
- **nest-cli.json:** NestJS CLI configuration
- **jest.config.js:** Jest testing configuration
- **drizzle.config.ts:** Drizzle ORM configuration
- **package.json:** Backend dependencies and scripts

### Frontend (apps/web)
- **vite.config.ts:** Vite bundler configuration
- **tailwind.config.js:** Tailwind CSS configuration
- **postcss.config.js:** PostCSS plugins
- **tsconfig.json:** TypeScript configuration
- **package.json:** Frontend dependencies and scripts

---

## Phase 02 Completion Status

### Phase 01 - Project Setup (COMPLETED)
- Monorepo setup with pnpm workspaces
- NestJS backend scaffolding with Fastify adapter
- React frontend with Vite and TypeScript
- Database schema with Drizzle ORM (5 core tables)
- Docker Compose configuration (PostgreSQL, Redis, MinIO)
- Shared TypeScript types package
- Design Guidelines and branding

### Phase 02 - Authentication & Authorization (COMPLETED)
- ✅ User registration/login endpoints with validation
- ✅ JWT token generation (15m access, 7d refresh)
- ✅ Password hashing with Argon2id (OWASP 2025 recommended parameters)
- ✅ Refresh token management with blacklisting
- ✅ JWT auth guards and RBAC guards
- ✅ Frontend login/register forms with error handling
- ✅ Token storage with axios interceptors for auto-refresh
- ✅ Rate limiting (3/min register, 5/min login)
- ✅ Protected routes with navigation guards
- ✅ Header component with logout functionality
- ✅ Comprehensive test coverage (44/44 tests passing, 85%+ coverage)

### Next Phase (Phase 03 - Real-time Messaging)
- WebSocket connection management with Socket.IO
- Message CRUD operations
- Conversation management (direct messages & group chats)
- Typing indicators and read receipts
- Real-time message broadcasting
- Message history pagination

---

## Important Notes

### Database
- All tables use UUID primary keys for security
- Foreign keys use cascading deletes (except sender in messages)
- Indexes on frequently queried columns for performance
- Timestamps (createdAt, updatedAt) on all tables

### Environment
- PostgreSQL connection uses `postgres://` URL format
- Redis accessible at localhost:6379 in development
- MinIO console available at http://localhost:9001
- CORS enabled for frontend URL in ConfigModule

### Code Standards (Phase 01-02)
- NestJS modules for feature organization
- Fastify for high-performance HTTP
- Drizzle ORM for type-safe database access
- Zustand for lightweight client-side state
- TanStack Query for server state management
- Tailwind CSS for utility-first styling
- @ alias for all import paths (backend & frontend)
- JWT authentication with Argon2id password hashing
- RBAC with guards and decorators
- Rate limiting on critical endpoints

---

## Getting Help

1. **Backend issues:** Check `apps/api/src/` structure and NestJS documentation
2. **Frontend issues:** Check `apps/web/src/` structure and React/Vite documentation
3. **Database issues:** Run `pnpm --filter api db:studio` for visual inspection
4. **Docker issues:** Check `docker-compose.yml` configuration and service logs

---

## References

- [NestJS Documentation](https://docs.nestjs.com/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [React 19 Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [PostgreSQL 16 Documentation](https://www.postgresql.org/docs/16/)
