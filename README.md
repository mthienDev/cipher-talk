# CipherTalk

**Secure enterprise chat application with end-to-end encryption**

Telegram-like features built for companies with 500+ users. Web-based platform with real-time messaging, file sharing, voice/video calls, and enterprise-grade security.

---

## 🚀 Quick Start

###  Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0 (install: `npm install -g pnpm`)
- **Docker** & **Docker Compose**

### 📦 Installation

```bash
# 1. Install root dependencies
pnpm install

# 2. Create backend app (NestJS)
cd apps
pnpm create nest api --strict
cd api
pnpm add @nestjs/platform-fastify fastify
pnpm add drizzle-orm postgres
pnpm add @nestjs/config @nestjs/websockets @nestjs/platform-socket.io
pnpm add socket.io redis ioredis
pnpm add -D drizzle-kit @types/node

# 3. Create frontend app (React + Vite)
cd ../
pnpm create vite web --template react-ts
cd web
pnpm add zustand @tanstack/react-query socket.io-client
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip
pnpm add lucide-react class-variance-authority clsx tailwind-merge
pnpm add -D tailwindcss postcss autoprefixer
pnpm dlx tailwindcss init -p

# 4. Return to root
cd ../..

# 5. Start Docker services
pnpm docker:up

# 6. Copy environment variables
cp .env.example .env

# 7. Run database migrations (after creating Drizzle config)
pnpm db:migrate

# 8. Start development servers
pnpm dev
```

---

## 📁 Project Structure

```
ciphertalk/
├── apps/
│   ├── api/                    # NestJS backend (Port 3000)
│   │   ├── src/
│   │   │   ├── modules/        # Feature modules
│   │   │   ├── common/         # Shared utilities
│   │   │   ├── config/         # Configuration
│   │   │   ├── database/       # Drizzle ORM setup
│   │   │   └── main.ts
│   │   └── drizzle/            # Migrations
│   └── web/                    # React frontend (Port 5173)
│       ├── src/
│       │   ├── components/     # UI components
│       │   ├── features/       # Feature modules
│       │   ├── hooks/          # Custom hooks
│       │   ├── stores/         # Zustand stores
│       │   └── lib/            # Utilities
├── packages/
│   └── shared/                 # Shared TypeScript types
├── docker/
│   └── docker-compose.yml      # Local services
├── docs/                       # Documentation & wireframes
└── plans/                      # Implementation plans
```

---

## 🛠️ Tech Stack

### Frontend
- **React 19** + TypeScript
- **Vite** - Fast build tool
- **Zustand** - State management
- **Tailwind CSS** + shadcn/ui - Styling
- **Socket.IO** - Real-time communication
- **TanStack Query** - Server state management

### Backend
- **NestJS 10** + Fastify adapter
- **PostgreSQL 16** - Database
- **Drizzle ORM** - Type-safe database access
- **Redis 7** - Caching & sessions
- **Socket.IO** - WebSocket server
- **MinIO** - S3-compatible object storage

### Security
- **Signal Protocol** - E2E encryption
- **JWT** + Refresh tokens - Authentication
- **Argon2id** - Password hashing
- **AES-256-GCM** - File encryption

---

## 🐳 Docker Services

```bash
# Start all services
pnpm docker:up

# Stop all services
pnpm docker:down

# View logs
pnpm docker:logs

# Access services
PostgreSQL: localhost:5432
Redis:      localhost:6379
MinIO:      localhost:9000 (API), localhost:9001 (Console)
```

**MinIO Console:** http://localhost:9001
**Credentials:** minioadmin / minioadmin

---

## 📝 Development

```bash
# Run all in parallel
pnpm dev

# Run individually
pnpm --filter api dev        # Backend only
pnpm --filter web dev        # Frontend only
pnpm --filter @ciphertalk/shared build  # Build shared types

# Linting & formatting
pnpm lint
pnpm format

# Testing
pnpm test

# Database
pnpm db:generate   # Generate migrations
pnpm db:migrate    # Run migrations
```

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` and update:

```bash
# Required changes for production:
JWT_SECRET=<generate-strong-random-string-min-32-chars>
ENCRYPTION_KEY=<generate-strong-random-string-32-chars>
DATABASE_URL=<your-production-database-url>
REDIS_URL=<your-production-redis-url>
S3_ENDPOINT=<your-s3-endpoint>
S3_ACCESS_KEY=<your-access-key>
S3_SECRET_KEY=<your-secret-key>
```

**Generate secrets:**
```bash
# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 📖 Documentation

- **Project Overview & PDR:** `docs/project-overview-pdr.md` (coming soon)
- **Codebase Summary:** `docs/codebase-summary.md`
- **System Architecture:** `docs/system-architecture.md`
- **Code Standards:** `docs/code-standards.md`
- **Design Guidelines:** `docs/design-guidelines.md`
- **Wireframes:** `docs/wireframes/`
- **Implementation Plan:** `plans/2025-12-13-ciphertalk-implementation/`
- **Research Reports:** `plans/reports/`

---

## 🎯 Implementation Phases

| Phase | Description | Status |
|-------|-------------|--------|
| **01** | Project Setup & Infrastructure | 🟢 Complete |
| **02** | Authentication & Authorization | 🟡 In Progress |
| **03** | Real-time Messaging Foundation | ⚪ Pending |
| **04** | E2E Encryption | ⚪ Pending |
| **05** | File Sharing | ⚪ Pending |
| **06** | Voice/Video Calls | ⚪ Pending |
| **07** | Advanced Features | ⚪ Pending |
| **08** | Audit & Compliance | ⚪ Pending |
| **09** | Testing & Optimization | ⚪ Pending |
| **10** | Deployment & Monitoring | ⚪ Pending |

---

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```

---

## 🚢 Deployment

See `plans/2025-12-13-ciphertalk-implementation/phase-10-deployment.md` for deployment instructions.

---

## 📄 License

Proprietary - All rights reserved

---

## 🤝 Contributing

Internal project. See implementation plan for development workflow.

---

## 📞 Support

For questions or issues, contact the development team.

---

**Status:** Phase 01 - COMPLETE | Phase 02 - In Progress
**Last Updated:** December 14, 2025

---

## Phase 01 - What's Included

### Backend (NestJS)
- NestJS 10 application with Fastify adapter
- Database connection with Drizzle ORM
- PostgreSQL schema with core tables (users, conversations, messages, etc.)
- Environment configuration management
- Project structure ready for modular development

### Frontend (React)
- React 19 + TypeScript + Vite setup
- Tailwind CSS configured with dark mode
- Zustand auth store (placeholder)
- TanStack Query setup for server state
- Component structure ready for implementation

### Infrastructure
- Docker Compose with PostgreSQL, Redis, MinIO
- Monorepo setup with pnpm workspaces
- Shared TypeScript types package
- Development scripts and commands
- Git setup and basic CI/CD placeholder

### Documentation
- Codebase summary with structure overview
- System architecture documentation
- Code standards and guidelines
- Design system and components
- Database schema documentation

### Next Phase (02 - Authentication)
- User registration/login API endpoints
- JWT token management (access + refresh)
- Password hashing with Argon2id
- Authentication guards and decorators
- Frontend login/signup forms
- Token storage and refresh logic
- Rate limiting on auth endpoints
