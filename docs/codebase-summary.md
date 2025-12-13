# CipherTalk Codebase Summary

**Last Updated:** December 14, 2025
**Phase:** 01 - Project Setup & Infrastructure
**Status:** In Progress

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
├── app.module.ts        # Root module with ConfigModule and DatabaseModule
├── app.controller.ts    # Health check and test endpoints
├── app.service.ts       # App-level business logic
├── database/
│   ├── schema.ts        # Drizzle ORM table definitions
│   ├── index.ts         # Database client exports
│   └── database.module.ts  # Database NestJS module
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
  userId: UUID (FK → users)
  token: TEXT (UNIQUE)
  expiresAt: TIMESTAMP
  createdAt: TIMESTAMP
  // Indexes: userId, token
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
- **AppModule:** Root module, imports ConfigModule and DatabaseModule
- **ConfigModule:** Global environment configuration
- **DatabaseModule:** Provides database client and repository patterns

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

# Authentication (to be added in Phase 02)
JWT_SECRET=<32-char-min-random-string>
JWT_REFRESH_EXPIRY=7d

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
├── main.tsx         # React entry point
├── App.tsx          # Root component (displays auth status)
├── index.css        # Global styles with Tailwind imports
├── vite-env.d.ts    # Vite environment types
├── components/      # Reusable UI components (to be added)
├── features/        # Feature modules (to be added)
├── hooks/           # Custom React hooks (to be added)
├── stores/
│   ├── auth-store.ts    # Zustand auth store
│   └── index.ts         # Store exports
└── lib/
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
- App.tsx displays conditional UI based on authentication state
- Tailwind dark mode color scheme (slate-900 base)
- Ready for component library integration

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

## Phase 01 Completion Status

### Completed
- Monorepo setup with pnpm workspaces
- NestJS backend scaffolding with Fastify adapter
- React frontend with Vite and TypeScript
- Database schema with Drizzle ORM (5 core tables)
- Docker Compose configuration (PostgreSQL, Redis, MinIO)
- Shared TypeScript types package
- Design Guidelines and branding
- Basic app structure (App.tsx with auth state placeholder)

### Next Phase (Phase 02 - Authentication)
- User registration/login endpoints
- JWT token generation and validation
- Password hashing with Argon2id
- Refresh token management
- Auth guards and decorators
- Frontend login/signup forms
- Token storage and refresh logic

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

### Code Standards (Phase 01)
- NestJS modules for feature organization
- Fastify for high-performance HTTP
- Drizzle ORM for type-safe database access
- Zustand for lightweight client-side state
- Tailwind CSS for utility-first styling

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
