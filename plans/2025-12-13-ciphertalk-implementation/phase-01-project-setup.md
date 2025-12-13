# Phase 01: Project Setup & Infrastructure

## Context Links
- [Main Plan](plan.md)
- NestJS docs: https://docs.nestjs.com
- Drizzle ORM: https://orm.drizzle.team
- React 19: https://react.dev

## Overview

| Attribute | Value |
|-----------|-------|
| Priority | P0 (Critical) |
| Status | Done (Completed: 2025-12-14) |
| Est. Duration | 1 week |
| Dependencies | None |
| Completion Date | 2025-12-14 |
| Review Report | `plans/reports/code-reviewer-251214-phase-01-setup.md` |

Initialize monorepo with backend (NestJS), frontend (React), shared types, and dev infrastructure (Docker Compose).

## Key Insights

- Monorepo with pnpm workspaces for shared types
- NestJS + Fastify for 2x throughput vs Express
- Drizzle ORM: type-safe, lightweight, SQL-first
- Docker Compose for local dev (Postgres, Redis, MinIO)

## Requirements

### Functional
- [ ] Monorepo structure with pnpm workspaces
- [ ] NestJS backend with Fastify adapter
- [ ] React 19 frontend with Vite
- [ ] Shared TypeScript types package
- [ ] Database connection with Drizzle ORM
- [ ] Redis connection for caching/sessions
- [ ] Docker Compose for local services

### Non-Functional
- [ ] TypeScript strict mode enabled
- [ ] ESLint + Prettier configured
- [ ] Hot reload for development
- [ ] Environment variable management

## Architecture

```
ciphertalk/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/        # Feature modules
│   │   │   ├── common/         # Shared utilities
│   │   │   ├── config/         # Configuration
│   │   │   ├── database/       # Drizzle setup
│   │   │   └── main.ts
│   │   ├── drizzle/            # Migrations
│   │   └── package.json
│   └── web/                    # React frontend
│       ├── src/
│       │   ├── components/     # UI components
│       │   ├── features/       # Feature modules
│       │   ├── hooks/          # Custom hooks
│       │   ├── stores/         # Zustand stores
│       │   ├── lib/            # Utilities
│       │   └── main.tsx
│       └── package.json
├── packages/
│   └── shared/                 # Shared types
│       ├── src/
│       │   ├── types/          # TypeScript interfaces
│       │   └── index.ts
│       └── package.json
├── docker/
│   └── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

## Related Code Files

### Files to Create

| Path | Purpose |
|------|---------|
| `pnpm-workspace.yaml` | Workspace configuration |
| `package.json` | Root package with scripts |
| `tsconfig.base.json` | Shared TS config |
| `.env.example` | Environment template |
| `docker/docker-compose.yml` | Local services |
| `apps/api/*` | NestJS application |
| `apps/web/*` | React application |
| `packages/shared/*` | Shared types |

## Implementation Steps

### Step 1: Initialize Monorepo (Day 1)

```bash
# 1.1 Initialize pnpm workspace
pnpm init
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// package.json (root)
{
  "name": "ciphertalk",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "db:generate": "pnpm --filter api db:generate",
    "db:migrate": "pnpm --filter api db:migrate"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

### Step 2: Shared Package (Day 1)

```typescript
// packages/shared/src/types/user.ts
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: 'online' | 'offline' | 'away';
  createdAt: Date;
  updatedAt: Date;
}

// packages/shared/src/types/message.ts
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string; // encrypted
  type: 'text' | 'file' | 'image' | 'voice' | 'video';
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// packages/shared/src/types/conversation.ts
export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string; // for groups
  createdAt: Date;
  updatedAt: Date;
}
```

### Step 3: NestJS Backend Setup (Day 2-3)

```bash
# 3.1 Create NestJS app
cd apps && pnpm create nest api --strict
cd api && pnpm add @nestjs/platform-fastify fastify
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit @types/node
```

```typescript
// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true })
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();
```

```typescript
// apps/api/src/database/schema.ts
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  username: varchar('username', { length: 50 }).unique().notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  status: varchar('status', { length: 20 }).default('offline').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 20 }).notNull(), // 'direct' | 'group'
  name: varchar('name', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const conversationMembers = pgTable('conversation_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  role: varchar('role', { length: 20 }).default('member').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  content: text('content').notNull(), // encrypted content
  type: varchar('type', { length: 20 }).default('text').notNull(),
  metadata: text('metadata'), // JSON string for file info, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

```typescript
// apps/api/src/database/drizzle.provider.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

export const drizzleProvider = {
  provide: DATABASE_CONNECTION,
  useFactory: async () => {
    const connectionString = process.env.DATABASE_URL!;
    const client = postgres(connectionString);
    return drizzle(client, { schema });
  },
};
```

### Step 4: React Frontend Setup (Day 3-4)

```bash
# 4.1 Create Vite React app
cd apps
pnpm create vite web --template react-ts
cd web
pnpm add zustand @tanstack/react-query socket.io-client
pnpm add -D tailwindcss postcss autoprefixer
pnpm add @radix-ui/react-* # shadcn primitives
```

```typescript
// apps/web/src/stores/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true }),
      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
);
```

### Step 5: Docker Compose Setup (Day 4)

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ciphertalk
      POSTGRES_PASSWORD: ciphertalk_dev
      POSTGRES_DB: ciphertalk
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ciphertalk']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - '9000:9000'
      - '9001:9001'
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:9000/minio/health/live']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### Step 6: Environment Configuration (Day 5)

```bash
# .env.example
# Database
DATABASE_URL=postgresql://ciphertalk:ciphertalk_dev@localhost:5432/ciphertalk

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# MinIO/S3
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=ciphertalk

# App
PORT=3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Step 7: ESLint & TypeScript Config (Day 5)

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

## Todo List

- [x] Initialize pnpm workspace
- [x] Create shared types package
- [x] Setup NestJS with Fastify
- [x] Configure Drizzle ORM
- [x] Create initial database schema
- [x] Setup React with Vite
- [x] Configure Tailwind CSS
- [x] Setup Zustand stores
- [x] Create Docker Compose config
- [x] Setup environment variables
- [x] Configure ESLint & Prettier
- [x] **Fix H1:** Remove hardcoded DB credentials fallback (database.module.ts, drizzle.config.ts)
- [x] **Fix H2:** Add env var validation in main.ts (FRONTEND_URL, PORT)
- [x] **Fix M2:** Add database connection error handling
- [x] Verify all services connect

## Success Criteria

1. `pnpm dev` starts both frontend and backend
2. Backend connects to PostgreSQL and Redis
3. Frontend loads without errors
4. Shared types importable in both apps
5. Docker Compose services healthy
6. Database migrations run successfully

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Drizzle ORM unfamiliarity | Medium | Reference docs, start simple |
| Monorepo complexity | Low | Clear package boundaries |
| Docker resource usage | Low | Use Alpine images |

## Security Considerations

- `.env` in `.gitignore`
- Strong default passwords in example only
- CORS configured for frontend origin
- Health endpoints non-sensitive

## Code Review Findings (2025-12-14)

### Critical Issues: 0
### High Priority: 2
- **H1:** Hardcoded DB credentials in fallback values (database.module.ts:17, drizzle.config.ts:9)
- **H2:** Missing env var validation in main.ts bootstrap (CORS origin, PORT)

### Medium Priority: 3
- **M1:** Missing composite indexes for message pagination queries
- **M2:** No error handling in database connection factory
- **M3:** Access tokens in localStorage (XSS risk - address in Phase 02)

### Low Priority: 2
- **L1:** Add React Query DevTools for development
- **L2:** Add app-level error boundary

**Full Report:** `plans/reports/code-reviewer-251214-phase-01-setup.md`

**Completion:** 11/12 tasks (92%)
**Blockers:** H1, H2 must be fixed before Phase 02

---

## Next Steps

**Immediate (Before Phase 02):**
1. Fix H1: Remove hardcoded DB credentials
2. Fix H2: Add env var validation
3. Fix M2: Add DB error handling
4. Verify all services connect
5. Generate and run initial Drizzle migration

**After Phase 01 Complete:**
1. Proceed to Phase 02 (Authentication)
2. Implement user registration/login
3. Setup JWT token infrastructure
4. Address M3 (httpOnly cookies for tokens)
