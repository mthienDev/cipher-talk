# CipherTalk Code Standards & Guidelines

**Version:** 1.0.0
**Phase:** 01 - Project Setup & Infrastructure
**Last Updated:** December 14, 2025

---

## Table of Contents

1. [General Standards](#general-standards)
2. [TypeScript Standards](#typescript-standards)
3. [Backend (NestJS) Standards](#backend-nestjs-standards)
4. [Frontend (React) Standards](#frontend-react-standards)
5. [Database Standards](#database-standards)
6. [File & Folder Organization](#file--folder-organization)
7. [Naming Conventions](#naming-conventions)
8. [Error Handling](#error-handling)
9. [Testing Standards](#testing-standards)
10. [Git & Commit Standards](#git--commit-standards)
11. [Documentation Standards](#documentation-standards)

---

## General Standards

### Code Philosophy
- **Clarity over cleverness:** Write code that is easy to understand
- **DRY (Don't Repeat Yourself):** Extract reusable patterns
- **SOLID Principles:** Apply single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion
- **Security First:** Consider security implications in every change
- **Performance Conscious:** Avoid unnecessary computations and queries

### Code Quality Tools
```bash
# Linting
pnpm lint

# Formatting
pnpm format

# Type checking
pnpm --filter api tsc --noEmit
pnpm --filter web tsc --noEmit

# Testing
pnpm test
```

### File Encoding & Line Endings
- **Encoding:** UTF-8 (no BOM)
- **Line Endings:** LF (Unix) - configure git: `git config core.autocrlf false`
- **Trailing Whitespace:** Remove all trailing whitespace
- **Final Newline:** Every file must end with a newline

---

## TypeScript Standards

### Compiler Configuration
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

### Type Safety Rules

#### 1. Never Use `any`
```typescript
// ❌ BAD
function processData(data: any) {
  return data.value;
}

// ✅ GOOD
function processData(data: { value: string }) {
  return data.value;
}
```

#### 2. Use Type Aliases for Complex Types
```typescript
// ✅ GOOD
type UserWithRole = User & { role: 'admin' | 'user' };
type MessageWithSender = Message & { sender: User };

// Use in functions
function handleMessage(msg: MessageWithSender) {
  // ...
}
```

#### 3. Use Interfaces for Object Shapes
```typescript
// ✅ GOOD (Backend)
interface IUserRepository {
  findById(id: string): Promise<User>;
  create(data: CreateUserDTO): Promise<User>;
}

// ✅ GOOD (Frontend)
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
}
```

#### 4. Explicit Return Types
```typescript
// ❌ BAD
export function getUserData(id: string) {
  return db.users.findById(id);
}

// ✅ GOOD
export async function getUserData(id: string): Promise<User | null> {
  return await db.users.findById(id);
}
```

#### 5. Use Const Assertions for Constants
```typescript
// ❌ BAD
export const API_ENDPOINTS = {
  users: '/api/users',
  messages: '/api/messages'
};

// ✅ GOOD
export const API_ENDPOINTS = {
  users: '/api/users',
  messages: '/api/messages'
} as const;

type ApiEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS];
```

---

## Backend (NestJS) Standards

### Module Organization
```typescript
// ✅ GOOD structure
feature.module.ts    // Feature module, imports dependencies
feature.service.ts   // Business logic
feature.controller.ts // HTTP endpoints
feature.dto.ts       // Data Transfer Objects
feature.entity.ts    // Database entities (if using ORM)
feature.repository.ts // Database access layer
feature.spec.ts      // Unit tests
```

### Module Structure Example
```typescript
// auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService], // For other modules to use
})
export class AuthModule {}
```

### Service Implementation Pattern
```typescript
// ✅ GOOD
@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.db.users.findByEmail(email);
    if (!user) return null;

    const isPasswordValid = await this.comparePasswords(
      password,
      user.passwordHash,
    );

    return isPasswordValid ? user : null;
  }

  private async comparePasswords(plain: string, hash: string): Promise<boolean> {
    // Implementation
  }
}
```

### Controller Implementation Pattern
```typescript
// ✅ GOOD
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDTO): Promise<{ accessToken: string }> {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.authService.generateToken(user);
    return { accessToken: token };
  }
}
```

### DTO Pattern
```typescript
// ✅ GOOD
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDTO {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class CreateUserDTO {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

### Dependency Injection Pattern
```typescript
// ✅ GOOD - Constructor injection
@Injectable()
export class UserService {
  constructor(
    private readonly db: DatabaseService,
    private readonly logger: Logger,
    private readonly config: ConfigService,
  ) {}
}

// ❌ BAD - Manual instantiation
export class UserService {
  private db = new DatabaseService();
}
```

### Error Handling in Services
```typescript
// ✅ GOOD
@Injectable()
export class UserService {
  async getUserById(id: string): Promise<User> {
    const user = await this.db.users.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async updateUser(id: string, data: UpdateUserDTO): Promise<User> {
    try {
      const user = await this.db.users.update(id, data);
      return user;
    } catch (error) {
      if (error.code === 'UNIQUE_VIOLATION') {
        throw new ConflictException('User with this email already exists');
      }
      throw error;
    }
  }
}
```

### NestJS Exception Mapping
```typescript
// Use NestJS built-in exceptions
import {
  BadRequestException,      // 400
  UnauthorizedException,    // 401
  ForbiddenException,       // 403
  NotFoundException,        // 404
  ConflictException,        // 409
  InternalServerErrorException, // 500
} from '@nestjs/common';
```

---

## Frontend (React) Standards

### Component Organization
```typescript
// ✅ GOOD file structure
components/
  Button/
    Button.tsx        // Component implementation
    Button.types.ts   // TypeScript interfaces
    Button.styles.ts  // Styled components or CSS modules
    Button.test.tsx   // Component tests
    index.ts          // Barrel export

features/
  Auth/
    Auth.tsx
    useAuth.ts        // Custom hook
    auth.types.ts
    auth.utils.ts     // Helper functions
```

### Functional Component Pattern
```typescript
// ✅ GOOD
import { FC, ReactNode } from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  children?: ReactNode;
}

export const Button: FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  children,
}) => {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {children || label}
    </button>
  );
};
```

### Custom Hooks Pattern
```typescript
// ✅ GOOD
import { useCallback, useState } from 'react';

export const useCounter = (initialValue: number = 0) => {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount((prev) => prev + 1);
  }, []);

  const decrement = useCallback(() => {
    setCount((prev) => prev - 1);
  }, []);

  return { count, increment, decrement };
};

// Usage
function Counter() {
  const { count, increment, decrement } = useCounter(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}
```

### Zustand Store Pattern
```typescript
// ✅ GOOD
import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,

  login: async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const { accessToken, user } = await response.json();
    set({
      isAuthenticated: true,
      user,
      token: accessToken,
    });
  },

  logout: () => {
    set({
      isAuthenticated: false,
      user: null,
      token: null,
    });
  },
}));
```

### TanStack Query Pattern
```typescript
// ✅ GOOD
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchMessages, sendMessage } from './api';

export function MessageList({ conversationId }: { conversationId: string }) {
  const { data: messages, isLoading, error } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchMessages(conversationId),
    staleTime: 1000 * 60, // 1 minute
  });

  const { mutate: send, isPending } = useMutation({
    mutationFn: (content: string) => sendMessage(conversationId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {messages?.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

### Conditional Rendering Pattern
```typescript
// ✅ GOOD
interface LoadingProps {
  isLoading: boolean;
  error: Error | null;
  children: ReactNode;
}

export const ConditionalRender: FC<LoadingProps> = ({
  isLoading,
  error,
  children,
}) => {
  if (isLoading) return <div className="loader">Loading...</div>;
  if (error) return <div className="error">{error.message}</div>;
  return <>{children}</>;
};

// Usage
<ConditionalRender isLoading={loading} error={error}>
  <MessageList />
</ConditionalRender>
```

---

## Database Standards

### Drizzle ORM Table Definition
```typescript
// ✅ GOOD
import { pgTable, uuid, varchar, timestamp, text, index } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    username: varchar('username', { length: 50 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    status: varchar('status', { length: 20 }).default('offline').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('users_email_idx').on(table.email),
    index('users_username_idx').on(table.username),
  ],
);
```

### Query Patterns
```typescript
// ✅ GOOD - Prepared statement (safe from SQL injection)
const user = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);

// ✅ GOOD - With joins
const conversations = await db
  .select()
  .from(conversations)
  .leftJoin(
    conversationMembers,
    eq(conversations.id, conversationMembers.conversationId),
  )
  .where(eq(conversationMembers.userId, userId));

// ✅ GOOD - With transactions
const result = await db.transaction(async (tx) => {
  const user = await tx.insert(users).values(newUser).returning();
  await tx.insert(refreshTokens).values({ userId: user[0].id, token });
  return user[0];
});
```

### Migration Naming
```
// Format: YYYYMMDDHHMMSS_descriptive_name
drizzle/
├── 20250101000000_initial_schema.sql
├── 20250105000000_add_message_encryption.sql
└── 20250110000000_add_indexes_for_performance.sql
```

---

## File & Folder Organization

### Backend File Structure
```
apps/api/src/
├── main.ts                        # Entry point
├── app.module.ts                  # Root module
├── app.controller.ts              # Root controller
├── app.service.ts                 # Root service
├── config/                        # Configuration
│   ├── database.config.ts
│   └── jwt.config.ts
├── database/                      # Database layer
│   ├── schema.ts                  # Table definitions
│   ├── database.module.ts
│   ├── database.service.ts
│   └── migrations/
├── common/                        # Shared across modules
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── utils/
├── modules/                       # Feature modules
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.dto.ts
│   │   └── auth.spec.ts
│   ├── users/
│   ├── conversations/
│   └── messages/
└── test/                          # E2E tests
    └── app.e2e.spec.ts
```

### Frontend File Structure
```
apps/web/src/
├── main.tsx                       # Entry point
├── App.tsx                        # Root component
├── index.css                      # Global styles
├── vite-env.d.ts                  # Type definitions
├── components/                    # Reusable components
│   ├── Button/
│   ├── Input/
│   └── Card/
├── features/                      # Feature modules
│   ├── Auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── useAuth.ts
│   ├── Chat/
│   │   ├── MessageList.tsx
│   │   └── MessageInput.tsx
│   └── Profile/
├── hooks/                         # Custom hooks
│   ├── useLocalStorage.ts
│   └── useDebounce.ts
├── stores/                        # Zustand stores
│   ├── auth-store.ts
│   ├── message-store.ts
│   └── index.ts
├── lib/                           # Utilities
│   ├── api.ts                     # API client
│   ├── utils.ts                   # Helper functions
│   └── constants.ts
├── types/                         # Type definitions
│   ├── user.ts
│   ├── message.ts
│   └── api.ts
└── __tests__/                     # Tests
    └── App.test.tsx
```

---

## Naming Conventions

### TypeScript/JavaScript
| Item | Convention | Example |
|------|-----------|---------|
| **Class** | PascalCase | `UserService`, `AuthController` |
| **Interface** | PascalCase, prefix `I` | `IUser`, `IRepository` |
| **Type** | PascalCase | `UserRole`, `MessageType` |
| **Function** | camelCase | `getUserById()`, `validateEmail()` |
| **Variable** | camelCase | `userId`, `isAuthenticated` |
| **Constant** | UPPER_SNAKE_CASE | `MAX_MESSAGE_LENGTH`, `DEFAULT_TIMEOUT` |
| **Boolean** | Prefix `is`, `has`, `can` | `isAuthenticated`, `hasRole()` |
| **File** | kebab-case (.ts, .tsx) | `user-service.ts`, `auth-store.ts` |
| **Folder** | kebab-case | `common`, `features`, `auth-module` |

### Database
| Item | Convention | Example |
|------|-----------|---------|
| **Table** | singular, snake_case | `users`, `conversation_members` |
| **Column** | snake_case | `user_id`, `created_at`, `password_hash` |
| **Index** | `{table}_{column}_idx` | `users_email_idx`, `messages_conversation_idx` |
| **FK Constraint** | `{table}_{fk_table}_fk` | `messages_users_fk` |

### React Components
```typescript
// ✅ GOOD - Descriptive component name
export const ChatMessageList: FC<ChatMessageListProps> = (props) => {
  // Component logic
};

// ✅ GOOD - Descriptive hook name
export const useMessageSubscription = (conversationId: string) => {
  // Hook logic
};

// ✅ GOOD - Descriptive store name
export const useChatStore = create<ChatState>((set) => ({
  // Store logic
}));
```

---

## Error Handling

### Backend Error Handling
```typescript
// ✅ GOOD - Specific exceptions
try {
  const user = await this.db.users.findById(id);
  if (!user) {
    throw new NotFoundException(`User ${id} not found`);
  }
  return user;
} catch (error) {
  if (error instanceof NotFoundException) {
    throw error; // Re-throw known exceptions
  }
  this.logger.error('Unexpected error:', error);
  throw new InternalServerErrorException();
}

// Exception filter for global handling
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    let status = 500;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse() as string;
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Frontend Error Handling
```typescript
// ✅ GOOD - With Zustand and error state
const useUserStore = create<UserState>((set) => ({
  user: null,
  error: null,
  loading: false,

  fetchUser: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.statusText}`);
      }
      const user = await response.json();
      set({ user, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      });
    }
  },
}));

// Error boundary component
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong</div>;
    }
    return this.props.children;
  }
}
```

---

## Testing Standards

### Backend Testing (Jest + NestJS Testing Module)
```typescript
// ✅ GOOD - Service unit test
describe('UserService', () => {
  let service: UserService;
  let mockDb: MockDatabase;

  beforeEach(() => {
    mockDb = createMock<DatabaseService>();
    service = new UserService(mockDb);
  });

  it('should return user by ID', async () => {
    const userId = 'test-id';
    const expectedUser = { id: userId, name: 'Test User' };

    mockDb.users.findById.mockResolvedValue(expectedUser);

    const result = await service.getUserById(userId);

    expect(result).toEqual(expectedUser);
    expect(mockDb.users.findById).toHaveBeenCalledWith(userId);
  });

  it('should throw NotFoundException if user not found', async () => {
    mockDb.users.findById.mockResolvedValue(null);

    await expect(service.getUserById('invalid-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ✅ GOOD - E2E test
describe('Auth Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/login (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('accessToken');
      });
  });
});
```

### Frontend Testing (Vitest + React Testing Library)
```typescript
// ✅ GOOD - Component test
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders button with label', () => {
    render(<Button label="Click me" onClick={jest.fn()} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button label="Click me" onClick={handleClick} />);

    fireEvent.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button label="Click me" onClick={jest.fn()} disabled />);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});

// ✅ GOOD - Hook test
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter Hook', () => {
  it('should increment count', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

---

## Git & Commit Standards

### Branch Naming
```
Feature branches:     feature/description
Bugfix branches:      bugfix/description
Hotfix branches:      hotfix/description
Release branches:     release/version
Documentation:       docs/description

Examples:
feature/user-authentication
bugfix/message-encryption
hotfix/security-update
release/1.0.0
docs/api-documentation
```

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>

Types: feat, fix, docs, style, refactor, test, chore
Scope: api, web, db, config, ci
Subject: imperative mood, lowercase, no period
Body: explain what and why, not how (72 chars)
Footer: reference issues (Closes #123)

Example:
feat(api): implement user authentication

Add JWT-based authentication with refresh tokens.
Implement password hashing with Argon2id.

Closes #45
```

### Commit Checklist
- [ ] Follows conventional commits format
- [ ] Code passes linter (`pnpm lint`)
- [ ] Code is properly formatted (`pnpm format`)
- [ ] TypeScript strict mode passes
- [ ] Tests added/updated for changes
- [ ] No console.log() statements
- [ ] No hardcoded secrets/credentials
- [ ] Documentation updated (if needed)

---

## Documentation Standards

### Code Comments
```typescript
// ✅ GOOD - Explain WHY, not WHAT
// Retry logic with exponential backoff to handle temporary network issues
async function fetchWithRetry(
  url: string,
  maxRetries: number = 3,
): Promise<Response> {
  // Implementation
}

// ❌ BAD - Obvious comment
// Set count to 0
const count = 0;
```

### Function Documentation
```typescript
/**
 * Validates and authenticates a user based on email and password.
 *
 * @param email - User's email address
 * @param password - User's plain text password (hashed before comparison)
 * @returns User object if authentication successful, null otherwise
 * @throws BadRequestException if email or password format is invalid
 * @throws TooManyRequestsException if rate limit exceeded
 *
 * @example
 * const user = await authService.validateUser('test@example.com', 'password');
 * if (user) {
 *   const token = await authService.generateToken(user);
 * }
 */
async validateUser(email: string, password: string): Promise<User | null> {
  // Implementation
}
```

### README Requirements
Each module should have a README with:
- Purpose and responsibilities
- Key interfaces/types
- Usage examples
- Common patterns
- Related modules

---

## Performance Guidelines

### Backend
- Use database indexing on frequently queried columns
- Implement pagination for large datasets
- Cache static configuration (ConfigService)
- Use Redis for session storage
- Batch database queries when possible
- Use select() to fetch only needed columns

### Frontend
- Code split feature modules with React.lazy()
- Memoize expensive calculations (useMemo)
- Memoize component props (memo)
- Use useCallback for stable function references
- Implement virtual scrolling for long lists
- Compress images and optimize assets

---

## Security Guidelines

### Backend
- Never log sensitive data (passwords, tokens)
- Use environment variables for secrets
- Validate and sanitize all inputs
- Use parameterized queries (Drizzle ORM)
- Implement rate limiting on auth endpoints
- CORS should be restrictive
- Use HTTPS in production

### Frontend
- Never store sensitive data in localStorage
- Use HttpOnly cookies for tokens
- Validate inputs before submission
- Escape user-generated content
- Implement CSRF tokens for mutations
- Keep dependencies updated

---

## References

- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [NestJS Best Practices](https://docs.nestjs.com/techniques/documentation)
- [React Style Guide](https://react.dev/learn)
- [PostgreSQL Style Guide](https://www.postgresql.org/docs/)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
