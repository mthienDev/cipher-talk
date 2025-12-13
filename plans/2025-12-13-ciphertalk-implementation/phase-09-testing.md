# Phase 09: Testing & Optimization

## Context Links
- [Main Plan](plan.md)
- Vitest: https://vitest.dev
- Playwright: https://playwright.dev

## Overview

| Attribute | Value |
|-----------|-------|
| Priority | P1 (High) |
| Status | Pending |
| Est. Duration | 1.5 weeks |
| Dependencies | All feature phases |

Comprehensive testing (unit, integration, E2E), performance optimization, and load testing for 500+ concurrent users.

## Key Insights

- Vitest for unit/integration (50% faster than Jest)
- Playwright for E2E browser tests
- Artillery for load testing
- Test pyramid: 70% unit, 20% integration, 10% E2E
- Target 80%+ code coverage
- Performance budgets for critical paths

## Requirements

### Functional
- [ ] Unit tests for all services
- [ ] Integration tests for APIs
- [ ] E2E tests for critical flows
- [ ] WebSocket integration tests
- [ ] Encryption flow tests
- [ ] Load testing suite

### Non-Functional
- [ ] >80% code coverage
- [ ] All tests pass in CI
- [ ] E2E tests <5min runtime
- [ ] Load test: 500 concurrent users

## Testing Strategy

```
Test Pyramid:
┌─────────────────┐
│     E2E (10%)   │  ← Playwright: Critical user flows
├─────────────────┤
│ Integration (20%)│  ← API, WebSocket, DB tests
├─────────────────┤
│   Unit (70%)    │  ← Services, utilities, components
└─────────────────┘

Coverage Targets:
- Backend services: 85%
- Frontend components: 75%
- Shared utilities: 90%
- E2E critical paths: 100%
```

## Test Categories

### Unit Tests

| Module | Coverage Target | Priority |
|--------|-----------------|----------|
| Auth Service | 90% | P0 |
| Chat Service | 85% | P0 |
| Encryption | 95% | P0 |
| File Service | 85% | P1 |
| Presence | 80% | P2 |
| Search | 80% | P2 |

### Integration Tests

| Flow | Description | Priority |
|------|-------------|----------|
| Auth flow | Register → Login → Refresh → Logout | P0 |
| Messaging | Send → Receive → Read receipt | P0 |
| File upload | Upload → Scan → Download | P1 |
| WebSocket | Connect → Message → Disconnect | P0 |

### E2E Tests

| Scenario | Description | Priority |
|----------|-------------|----------|
| User registration | Complete signup flow | P0 |
| Send message | Login → Send → Verify delivery | P0 |
| File sharing | Upload → Share → Download | P1 |
| Voice call | Initiate → Accept → End | P2 |

## Implementation Steps

### Step 1: Test Setup

```bash
cd apps/api
pnpm add -D vitest @vitest/coverage-v8 supertest @nestjs/testing
pnpm add -D testcontainers @testcontainers/postgresql

cd ../web
pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom
pnpm add -D @testing-library/user-event jsdom
pnpm add -D playwright @playwright/test
```

```typescript
// apps/api/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts', 'src/**/*.d.ts'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    setupFiles: ['./test/setup.ts'],
  },
});
```

```typescript
// apps/web/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.tsx', 'src/**/*.test.tsx'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.tsx', 'src/**/*.ts'],
      exclude: ['src/**/*.spec.*', 'src/**/*.test.*'],
      thresholds: {
        statements: 75,
        branches: 70,
        functions: 75,
        lines: 75,
      },
    },
  },
});
```

### Step 2: Backend Unit Tests

```typescript
// apps/api/src/modules/auth/auth.service.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: vi.fn(),
            create: vi.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: vi.fn().mockResolvedValue('mock_token'),
            verifyAsync: vi.fn(),
          },
        },
        {
          provide: 'REDIS',
          useValue: {
            get: vi.fn(),
            setex: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      vi.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      vi.spyOn(argon2, 'verify').mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      vi.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@example.com', password: 'password' })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      vi.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      vi.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should create user and return tokens', async () => {
      vi.spyOn(usersService, 'findByEmail').mockResolvedValue(null);
      vi.spyOn(usersService, 'create').mockResolvedValue(mockUser);
      vi.spyOn(argon2, 'hash').mockResolvedValue('hashed_password');

      const result = await service.register({
        email: 'new@example.com',
        password: 'password123',
        username: 'newuser',
        displayName: 'New User',
      });

      expect(result).toHaveProperty('accessToken');
      expect(usersService.create).toHaveBeenCalled();
    });

    it('should throw ConflictException for existing email', async () => {
      vi.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
          username: 'existing',
          displayName: 'Existing User',
        })
      ).rejects.toThrow('Email already registered');
    });
  });
});
```

```typescript
// apps/api/src/modules/chat/chat.service.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { DATABASE_CONNECTION } from '../../database/drizzle.provider';

describe('ChatService', () => {
  let service: ChatService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 'msg-1' }]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: DATABASE_CONNECTION, useValue: mockDb },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  describe('createMessage', () => {
    it('should create and return message', async () => {
      const result = await service.createMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Hello',
      });

      expect(result).toHaveProperty('id');
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('isConversationMember', () => {
    it('should return true for member', async () => {
      mockDb.limit.mockResolvedValue([{ id: 'member-1' }]);

      const result = await service.isConversationMember('conv-1', 'user-1');

      expect(result).toBe(true);
    });

    it('should return false for non-member', async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await service.isConversationMember('conv-1', 'user-2');

      expect(result).toBe(false);
    });
  });
});
```

### Step 3: Frontend Component Tests

```typescript
// apps/web/src/features/auth/components/login-form.spec.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('LoginForm', () => {
  it('should render email and password fields', () => {
    render(<LoginForm />, { wrapper });

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    render(<LoginForm />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('should call onSubmit with form data', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />, { wrapper });

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });
});
```

```typescript
// apps/web/src/features/chat/components/message-list.spec.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageList } from './message-list';

describe('MessageList', () => {
  const mockMessages = [
    {
      id: 'msg-1',
      content: 'Hello',
      senderId: 'user-1',
      createdAt: new Date(),
    },
    {
      id: 'msg-2',
      content: 'Hi there!',
      senderId: 'user-2',
      createdAt: new Date(),
    },
  ];

  it('should render all messages', () => {
    render(<MessageList messages={mockMessages} currentUserId="user-1" />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('should show empty state when no messages', () => {
    render(<MessageList messages={[]} currentUserId="user-1" />);

    expect(screen.getByText(/no messages/i)).toBeInTheDocument();
  });
});
```

### Step 4: Integration Tests

```typescript
// apps/api/test/integration/auth.integration.spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

describe('Auth Integration', () => {
  let app: INestApplication;
  let pgContainer: StartedPostgreSqlContainer;

  beforeAll(async () => {
    // Start test database
    pgContainer = await new PostgreSqlContainer().start();

    process.env.DATABASE_URL = pgContainer.getConnectionUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
    await pgContainer.stop();
  });

  describe('POST /auth/register', () => {
    it('should register new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          username: 'testuser',
          displayName: 'Test User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          username: 'user1',
          displayName: 'User 1',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          username: 'user2',
          displayName: 'User 2',
        })
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      // Register first
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'login@example.com',
          password: 'Password123!',
          username: 'loginuser',
          displayName: 'Login User',
        });

      // Login
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
    });
  });
});
```

### Step 5: E2E Tests with Playwright

```typescript
// apps/web/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should register new user', async ({ page }) => {
    await page.goto('/register');

    await page.fill('[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('[name="password"]', 'Password123!');
    await page.fill('[name="username"]', `user-${Date.now()}`);
    await page.fill('[name="displayName"]', 'Test User');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/chat');
  });

  test('should login existing user', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/chat');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toContainText('Invalid credentials');
  });
});
```

```typescript
// apps/web/e2e/messaging.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Messaging', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/chat');
  });

  test('should send and receive message', async ({ page, context }) => {
    // Open second browser context for recipient
    const page2 = await context.newPage();
    await page2.goto('/login');
    await page2.fill('[name="email"]', 'recipient@example.com');
    await page2.fill('[name="password"]', 'Password123!');
    await page2.click('button[type="submit"]');

    // Select conversation
    await page.click('[data-testid="conversation-item"]');

    // Send message
    const messageText = `Test message ${Date.now()}`;
    await page.fill('[data-testid="message-input"]', messageText);
    await page.click('[data-testid="send-button"]');

    // Verify message appears
    await expect(page.locator(`text=${messageText}`)).toBeVisible();

    // Verify recipient receives message
    await page2.click('[data-testid="conversation-item"]');
    await expect(page2.locator(`text=${messageText}`)).toBeVisible();
  });
});
```

### Step 6: Load Testing with Artillery

```yaml
# test/load/config.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
  payload:
    path: "users.csv"
    fields:
      - "email"
      - "password"
  plugins:
    expect: {}

scenarios:
  - name: "User login and chat"
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "{{ email }}"
            password: "{{ password }}"
          capture:
            - json: "$.accessToken"
              as: "token"
      - think: 1

      - get:
          url: "/conversations"
          headers:
            Authorization: "Bearer {{ token }}"
          capture:
            - json: "$[0].id"
              as: "conversationId"

      - get:
          url: "/conversations/{{ conversationId }}/messages"
          headers:
            Authorization: "Bearer {{ token }}"

      - think: 2

      # WebSocket messaging is tested separately
```

```typescript
// test/load/websocket-load.ts
import { io, Socket } from 'socket.io-client';

const CONCURRENT_USERS = 500;
const TEST_DURATION = 60000; // 60 seconds
const MESSAGE_INTERVAL = 5000; // 5 seconds

async function runLoadTest() {
  const sockets: Socket[] = [];
  const metrics = {
    connected: 0,
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0,
  };

  // Create connections
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    const socket = io('http://localhost:3000', {
      auth: { token: `test_token_${i}` },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      metrics.connected++;
    });

    socket.on('message:new', () => {
      metrics.messagesReceived++;
    });

    socket.on('error', () => {
      metrics.errors++;
    });

    sockets.push(socket);
  }

  // Wait for connections
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log(`Connected: ${metrics.connected}/${CONCURRENT_USERS}`);

  // Send messages
  const startTime = Date.now();
  while (Date.now() - startTime < TEST_DURATION) {
    for (const socket of sockets) {
      socket.emit('message:send', {
        conversationId: 'test-conv',
        content: 'Load test message',
      });
      metrics.messagesSent++;
    }
    await new Promise((resolve) => setTimeout(resolve, MESSAGE_INTERVAL));
  }

  // Cleanup
  for (const socket of sockets) {
    socket.disconnect();
  }

  console.log('Load Test Results:', metrics);
}

runLoadTest();
```

## Todo List

- [ ] Setup Vitest for backend
- [ ] Setup Vitest for frontend
- [ ] Setup Playwright for E2E
- [ ] Write auth service unit tests
- [ ] Write chat service unit tests
- [ ] Write encryption unit tests
- [ ] Write frontend component tests
- [ ] Write API integration tests
- [ ] Write WebSocket integration tests
- [ ] Write E2E auth flow tests
- [ ] Write E2E messaging tests
- [ ] Setup Artillery load testing
- [ ] Run load tests for 500 users
- [ ] Optimize based on results
- [ ] Setup CI test pipeline

## Success Criteria

1. >80% backend code coverage
2. >75% frontend code coverage
3. All critical paths E2E tested
4. Load test passes 500 users
5. Message latency <100ms at load
6. No memory leaks under load
7. CI pipeline completes <10min

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Flaky E2E tests | Medium | Retry logic, stable selectors |
| Slow test suite | Medium | Parallelization, test DB reuse |
| Load test failures | High | Incremental optimization |

## Performance Optimization Checklist

- [ ] Database query optimization (EXPLAIN ANALYZE)
- [ ] Add database indexes
- [ ] Redis caching for hot data
- [ ] WebSocket connection pooling
- [ ] Frontend bundle optimization
- [ ] Image lazy loading
- [ ] API response compression

## Next Steps

After completing Phase 09:
1. Proceed to Phase 10 (Deployment)
2. Setup production infrastructure
3. Configure monitoring
