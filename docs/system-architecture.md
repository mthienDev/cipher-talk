# CipherTalk System Architecture

**Version:** 2.0.0
**Phase:** 02 - Authentication & Authorization
**Last Updated:** December 14, 2025

---

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Application Tiers](#application-tiers)
4. [Data Flow](#data-flow)
5. [Technology Stack](#technology-stack)
6. [Deployment Model](#deployment-model)
7. [Scalability Considerations](#scalability-considerations)
8. [Security Architecture](#security-architecture)
9. [Future Enhancements](#future-enhancements)

---

## High-Level Overview

CipherTalk uses a **3-tier architecture** optimized for enterprise-scale secure messaging:

```
┌─────────────────────┐
│   Client Layer      │  React SPA (Web Browser)
│   (apps/web)        │  Vite + TypeScript + Zustand
└──────────┬──────────┘
           │ HTTP/WebSocket
           │ (Port 5173 dev, 443 prod)
┌──────────▼──────────┐
│   API Layer         │  NestJS + Fastify
│   (apps/api)        │  REST API + WebSocket Server
│   Port 3000         │  Authentication, Message Routing
└──────────┬──────────┘
           │ SQL
           │ Cache
           │ File Storage
┌──────────▼──────────┐
│   Data Layer        │  PostgreSQL 16 (Primary)
│   (Docker Services) │  Redis 7 (Cache/Sessions)
│                     │  MinIO (File Storage)
└─────────────────────┘
```

---

## Architecture Diagram

### Component Interaction Model

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser/Client                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React Application (apps/web)                        │  │
│  │  ├── Auth Store (Zustand)                            │  │
│  │  ├── Message Store (TanStack Query)                  │  │
│  │  ├── UI Components                                   │  │
│  │  └── Socket.IO Client                                │  │
│  └─────────────────┬──────────────────────────────────┬─┘  │
│                    │ HTTP REST                        │      │
│                    │ WebSocket                        │      │
└────────────────────┼────────────────────────────────┼──────┘
                     │                                │
         ┌───────────▼────────────────────────────────▼──────┐
         │      NestJS API Server (apps/api)                 │
         │  ┌──────────────────────────────────────────┐    │
         │  │  Fastify HTTP Adapter                    │    │
         │  │  ├── CORS Middleware                     │    │
         │  │  ├── REST Routes (Phase 02+)             │    │
         │  │  └── Error Handling                      │    │
         │  └──────────────────────────────────────────┘    │
         │  ┌──────────────────────────────────────────┐    │
         │  │  WebSocket Layer (Socket.IO)             │    │
         │  │  ├── Real-time Message Broadcasting      │    │
         │  │  ├── User Presence Management            │    │
         │  │  └── Connection Management               │    │
         │  └──────────────────────────────────────────┘    │
         │  ┌──────────────────────────────────────────┐    │
         │  │  Application Modules (Phase 02+)         │    │
         │  │  ├── Auth Module                         │    │
         │  │  ├── Messages Module                      │    │
         │  │  ├── Conversations Module                 │    │
         │  │  └── Users Module                         │    │
         │  └──────────────────────────────────────────┘    │
         │  ┌──────────────────────────────────────────┐    │
         │  │  Database Module (Prisma ORM)           │    │
         │  │  ├── Connection Pool                     │    │
         │  │  ├── Query Builder                       │    │
         │  │  └── Migration Runner                    │    │
         │  └──────────────────────────────────────────┘    │
         └─┬────────────────────────────────────────────┬───┘
           │ PostgreSQL Protocol                       │
           │ Redis Protocol                            │
           │ S3 API (MinIO)                            │
    ┌──────▼────────────────────────────────────────────▼─┐
    │         Data & Cache Services (Docker)              │
    │  ┌─────────────────────────────────────────────┐   │
    │  │  PostgreSQL 16                              │   │
    │  │  ├── users                                  │   │
    │  │  ├── conversations                          │   │
    │  │  ├── conversationMembers                    │   │
    │  │  ├── messages                               │   │
    │  │  └── refreshTokens                          │   │
    │  └─────────────────────────────────────────────┘   │
    │  ┌─────────────────────────────────────────────┐   │
    │  │  Redis 7 (Session Store + Cache)            │   │
    │  │  ├── Active Connections                     │   │
    │  │  ├── Session Data                           │   │
    │  │  └── Message Queue (future)                 │   │
    │  └─────────────────────────────────────────────┘   │
    │  ┌─────────────────────────────────────────────┐   │
    │  │  MinIO (S3-Compatible File Storage)         │   │
    │  │  ├── Message Attachments                    │   │
    │  │  ├── User Avatars                           │   │
    │  │  └── Backup Storage                         │   │
    │  └─────────────────────────────────────────────┘   │
    └───────────────────────────────────────────────────┘
```

---

## Application Tiers

### 1. Presentation Tier (Client-Side)
**Technology:** React 19 + TypeScript + Vite

**Responsibilities:**
- User interface rendering
- User input handling
- Local state management (Zustand)
- Server state management (TanStack Query)
- WebSocket connection management

**Key Components (Phase 01):**
- App component with auth status display
- Auth store (placeholder for Phase 02)

**To Be Added:**
- Message list components
- Conversation list
- Chat interface
- Settings UI

---

### 2. Application Tier (Server-Side)
**Technology:** NestJS 10 + Fastify + TypeScript

**Responsibilities:**
- Business logic implementation
- Request/response processing
- Authentication & authorization
- WebSocket message routing
- Database operations orchestration

**Architecture Pattern:** Modular NestJS with dependency injection

**Current Modules (Phase 01-02):**
- `AppModule` - Root module, configuration, imports all feature modules
- `DatabaseModule` - Database client provision with Prisma ORM
- `ConfigModule` - Environment configuration
- `AuthModule` - ✅ JWT authentication, token management, guards, strategies
- `UsersModule` - ✅ User CRUD operations
- `ThrottlerModule` - ✅ Rate limiting for auth endpoints

**Planned Modules (Phase 03+):**
- `ConversationsModule` - Conversation management
- `MessagesModule` - Message CRUD and broadcasting
- `WebSocketModule` - Real-time event handling with Socket.IO

---

### 3. Data Tier
**Technologies:** PostgreSQL 16 + Prisma ORM + Redis 7 + MinIO

**PostgreSQL (Primary Data Store)**
```
Database: ciphertalk
├── users (User accounts, authentication)
├── conversations (DMs and groups)
├── conversationMembers (Group membership)
├── messages (Encrypted message content)
├── refreshTokens (JWT refresh token tracking with device info)
├── userRoles (RBAC: admin, moderator, member)
└── passwordResetTokens (Password recovery tokens)
```

**Redis (Session & Cache Layer)**
- JWT token blacklist (logout, refresh invalidation)
- Active user sessions
- Temporary data
- Message queue (future)
- Real-time presence data

**MinIO (File Storage)**
- User avatars
- Message attachments
- Backup storage

---

## Data Flow

### Authentication Flow (Phase 02 - IMPLEMENTED)
```
User Input (Browser)
    ↓
React Component → LoginForm/RegisterForm
    ↓
TanStack Query Mutation (useLogin/useRegister)
    ↓
HTTP POST /auth/login or /auth/register
    ↓
NestJS AuthModule
    ├─ Validate DTO with class-validator
    ├─ Hash comparison with Argon2id (64MB, 3 iterations, parallelism 4)
    ├─ Generate JWT tokens (15m access, 7d refresh)
    └─ Store refresh token hash in PostgreSQL
    ↓
Response: { accessToken, refreshToken, user }
    ↓
Zustand Store saves user + accessToken
localStorage saves refreshToken
    ↓
Axios interceptor adds Authorization: Bearer {accessToken}
    ↓
On 401 error → Auto token refresh via /auth/refresh
    ↓
Old refresh token blacklisted in Redis
    ↓
New tokens issued and stored
```

### Message Flow (Phase 03)
```
User Types Message
    ↓
React Components (MessageInput)
    ↓
WebSocket Emit: 'message:send'
    ↓
NestJS WebSocket Handler
    ├─ Validate user session
    ├─ Encrypt message content (Phase 04)
    ├─ Store in PostgreSQL
    └─ Broadcast to conversation members
    ↓
Redis pubsub (real-time distribution)
    ↓
Socket.IO Emit to recipient clients
    ↓
React updates message list
    ↓
TanStack Query invalidates
```

### Encryption Flow (Phase 04)
```
Message Content
    ↓
Signal Protocol (Sender Key Management)
    ├─ Generate ephemeral keys
    ├─ Derive shared secrets
    └─ AES-256-GCM encryption
    ↓
Store encrypted ciphertext in PostgreSQL
    ↓
WebSocket transmission
    ↓
Recipient decrypts with shared secret
```

---

## Technology Stack

### Frontend Stack
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | React 19 | UI rendering |
| **Language** | TypeScript | Type safety |
| **Build Tool** | Vite | Fast bundling |
| **State (Client)** | Zustand | Auth state |
| **State (Server)** | TanStack Query | Message cache |
| **Styling** | Tailwind CSS | Utility classes |
| **UI Components** | shadcn/ui | Pre-built components |
| **Icons** | Lucide React | Icon library |
| **Real-time** | Socket.IO Client | WebSocket communication |

### Backend Stack
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | NestJS 10 | Application structure |
| **HTTP Server** | Fastify 5 | High-performance HTTP |
| **Language** | TypeScript | Type safety |
| **ORM** | Prisma ORM | Type-safe queries |
| **Database** | PostgreSQL 16 | Primary data store |
| **Cache** | Redis 7 | Session & cache layer |
| **File Storage** | MinIO | S3-compatible storage |
| **Real-time** | Socket.IO | WebSocket server |
| **Config** | @nestjs/config | Environment management |

### Shared Stack
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Type Definitions** | TypeScript | Shared interfaces |
| **Package Manager** | pnpm | Dependency management |
| **Monorepo** | pnpm workspaces | Code organization |

---

## Deployment Model

### Current (Phase 01 - Development)
```
Local Machine
├── pnpm (monorepo package manager)
├── Node.js 20+ (runtime)
├── Docker Desktop (services)
│   ├── PostgreSQL Container
│   ├── Redis Container
│   └── MinIO Container
└── Dev Servers
    ├── Frontend: http://localhost:5173
    └── Backend: http://localhost:3000
```

### Future (Phase 10 - Production)
```
Planned Architecture:
├── Frontend: Vercel/Cloudflare Pages (static)
├── Backend: Cloud Run/ECS (containerized NestJS)
├── Database: Cloud SQL (managed PostgreSQL)
├── Cache: Cloud Memorystore (managed Redis)
├── Storage: Google Cloud Storage / AWS S3 (files)
└── CDN: Cloudflare / CloudFront (static content)
```

---

## Scalability Considerations

### Horizontal Scaling (Phase 10+)
```
Load Balancer (Nginx/HAProxy)
    ↓
┌─────────────────────────────────┐
│ NestJS API Instances (0-N)      │
│ ├─ Instance 1 (Port 3000)       │
│ ├─ Instance 2 (Port 3001)       │
│ └─ Instance N (Port 300N)       │
└────────┬────────────────────────┘
         ↓
PostgreSQL Primary (Write)
Redis Cluster (Cache)
MinIO Cluster (Storage)
```

### Vertical Scaling (Current)
- **Single Backend:** NestJS on Fastify
- **Shared Database:** PostgreSQL connection pooling
- **In-Memory Cache:** Redis single instance (development)

### Message Broadcast Optimization
- Redis Pub/Sub for horizontal scaling
- Socket.IO adapter for multi-instance deployments
- Message queue (Bull/BullMQ) for guaranteed delivery

---

## Security Architecture

### Authentication & Authorization
**Phase 02 - IMPLEMENTED:**
- ✅ JWT tokens (15m access + 7d refresh)
- ✅ Argon2id password hashing (type: argon2id, memoryCost: 64MB, timeCost: 3, parallelism: 4)
- ✅ Refresh token storage in PostgreSQL with device info and IP tracking
- ✅ Token blacklisting in Redis for logout and refresh invalidation
- ✅ RBAC with guards (admin, moderator, member roles)
- ✅ Rate limiting (3/min register, 5/min login)
- ✅ CORS protection (restricted to frontend origin)
- ✅ JWT guards with Passport strategy
- ⏳ Secure token storage (HttpOnly cookies) - future enhancement

### Encryption
**Phase 04 Implementation:**
- Signal Protocol for E2E encryption
- AES-256-GCM for message content
- Ephemeral key generation per conversation

### Network Security
- HTTPS/TLS in production
- WebSocket over WSS (secure)
- CORS restricted to frontend origin
- Rate limiting on auth endpoints

### Database Security
- Prepared statements (Prisma ORM)
- SQL injection protection
- Foreign key constraints
- UUID primary keys (no sequential IDs)

### Data Protection
- Encrypted message storage
- Password never transmitted in plain text
- Refresh tokens in database (not JWTs)
- API keys for service-to-service communication

---

## Future Enhancements

### Phase 02 (Authentication) - ✅ COMPLETED
- ✅ User registration/login with validation
- ✅ JWT token management (access + refresh)
- ✅ RBAC with guards and decorators
- ✅ Rate limiting on auth endpoints
- ⏳ Password reset flow (planned)
- ⏳ Account settings (planned)

### Phase 03 (Real-time Messaging)
- Message CRUD operations
- Conversation management
- Typing indicators
- Read receipts

### Phase 04 (E2E Encryption)
- Signal Protocol implementation
- Key exchange mechanism
- Message encryption/decryption
- Safety number verification

### Phase 05 (File Sharing)
- File upload/download
- Virus scanning
- Preview generation
- Storage optimization

### Phase 06 (Voice/Video Calls)
- WebRTC signaling
- Media stream negotiation
- Call recording
- Screen sharing

### Phase 07-10 (Advanced & Operations)
- Message search
- Advanced analytics
- Audit logging
- Disaster recovery
- Performance monitoring
- Deployment automation

---

## System Requirements

### Development Environment
- **OS:** Windows, macOS, Linux
- **Node.js:** 20.0.0 or higher
- **pnpm:** 9.0.0 or higher
- **Docker:** Latest version with Docker Compose
- **RAM:** 4GB minimum (8GB recommended)
- **Storage:** 5GB for node_modules + services

### Production Environment
- **Node.js:** 20.x LTS
- **PostgreSQL:** 16+ (managed or self-hosted)
- **Redis:** 7+ (managed or self-hosted)
- **MinIO/S3:** S3-compatible storage
- **TLS Certificate:** Valid SSL/TLS certificate
- **CDN:** Optional (Cloudflare, CloudFront)

---

## Configuration Management

### Environment-Specific Configs
```
.env (development)
├── Database: localhost:5432
├── Redis: localhost:6379
├── Frontend URL: http://localhost:5173
└── S3: minIO on localhost:9000

.env.production
├── Database: Cloud SQL connection string
├── Redis: Cloud Memorystore endpoint
├── Frontend URL: https://ciphertalk.company.com
└── S3: AWS S3 or MinIO cluster
```

### ConfigModule Behavior
- Global scope (accessible in all modules)
- Validation via schema (optional, Phase 02+)
- Overridable via environment variables
- Fallback defaults for development

---

## Monitoring & Observability (Phase 10)

### Planned Implementation
- Application metrics (Prometheus)
- Distributed tracing (Jaeger)
- Error tracking (Sentry)
- Log aggregation (ELK/Loki)
- Performance monitoring (New Relic/Datadog)

### Health Checks
```
GET /health
Response: { status: 'ok', database: 'connected', redis: 'connected' }
```

---

## Performance Targets

### Client-Side
- Page load time: < 2s
- Time to interactive: < 3s
- First contentful paint: < 1.5s
- Message delivery latency: < 100ms

### Server-Side
- API response time: < 100ms (p95)
- WebSocket latency: < 50ms (p95)
- Database query time: < 50ms (p95)
- Memory usage: < 512MB per instance

### Database
- Connection pool: 10-20 concurrent connections
- Query cache: Redis (configurable TTL)
- Index coverage: 95% of WHERE clauses
- Transaction isolation: READ_COMMITTED

---

## References

- [NestJS Architecture](https://docs.nestjs.com/modules)
- [PostgreSQL Architecture](https://www.postgresql.org/docs/16/tutorial.html)
- [Redis Data Types](https://redis.io/docs/data-types/)
- [Signal Protocol](https://signal.org/docs/specifications/doubleratchet/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
