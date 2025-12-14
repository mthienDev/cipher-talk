# Phase 02: Authentication & Authorization

## Context Links
- [Main Plan](plan.md)
- [Phase 01: Setup](phase-01-project-setup.md)
- NestJS Auth: https://docs.nestjs.com/security/authentication

## Overview

| Attribute | Value |
|-----------|-------|
| Priority | P0 (Critical) |
| Status | Done |
| Est. Duration | 1.5 weeks |
| Dependencies | Phase 01 |

JWT-based auth with refresh tokens, RBAC, password hashing (Argon2id), and session management via Redis.

## Key Insights

- Argon2id for passwords (OWASP recommended 2025)
- Short-lived access tokens (15min) + long-lived refresh tokens (7d)
- Redis for token blacklist/session tracking
- RBAC: admin, moderator, member roles
- Rate limiting on auth endpoints

## Requirements

### Functional
- [ ] User registration with email verification
- [ ] Login with email/password
- [ ] JWT access + refresh token flow
- [ ] Password reset via email
- [ ] Role-based access control (RBAC)
- [ ] Session management (view/revoke)
- [ ] Account lockout after failed attempts

### Non-Functional
- [ ] Argon2id password hashing
- [ ] Rate limiting: 5 login attempts/min
- [ ] Token refresh without logout
- [ ] Audit log all auth events

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  API Guard  │────▶│   Service   │
│  (Browser)  │     │ (JWT Valid) │     │   Layer     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   ▼                   ▼
       │            ┌─────────────┐     ┌─────────────┐
       │            │    Redis    │     │  PostgreSQL │
       │            │ (Blacklist) │     │   (Users)   │
       └───────────▶└─────────────┘     └─────────────┘
      (Refresh)
```

### Token Flow

```
1. Login → Access Token (15m) + Refresh Token (7d)
2. API Request → Validate Access Token
3. Token Expired → Use Refresh Token → New Access Token
4. Refresh Expired → Re-login required
5. Logout → Blacklist both tokens in Redis
```

## Database Schema Extensions

```typescript
// apps/api/src/database/schema.ts (additions)

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tokenHash: text('token_hash').notNull(), // hashed refresh token
  expiresAt: timestamp('expires_at').notNull(),
  deviceInfo: text('device_info'), // browser/device info
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
});

export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'admin' | 'moderator' | 'member'
  grantedBy: uuid('granted_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Related Code Files

### Files to Create

| Path | Purpose |
|------|---------|
| `apps/api/src/modules/auth/auth.module.ts` | Auth module |
| `apps/api/src/modules/auth/auth.controller.ts` | Auth endpoints |
| `apps/api/src/modules/auth/auth.service.ts` | Auth business logic |
| `apps/api/src/modules/auth/strategies/jwt.strategy.ts` | JWT validation |
| `apps/api/src/modules/auth/guards/jwt-auth.guard.ts` | Route protection |
| `apps/api/src/modules/auth/guards/roles.guard.ts` | RBAC guard |
| `apps/api/src/modules/auth/decorators/roles.decorator.ts` | Role decorator |
| `apps/api/src/modules/auth/dto/*.ts` | Request/Response DTOs |
| `apps/api/src/modules/users/users.module.ts` | Users module |
| `apps/api/src/modules/users/users.service.ts` | User CRUD |
| `apps/web/src/features/auth/*` | Frontend auth components |

## Implementation Steps

### Step 1: Install Dependencies

```bash
cd apps/api
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm add argon2 ioredis class-validator class-transformer
pnpm add -D @types/passport-jwt
```

### Step 2: Auth Module Structure

```typescript
// apps/api/src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

### Step 3: Auth Service Implementation

```typescript
// apps/api/src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto, TokensDto } from './dto';
import { Redis } from 'ioredis';

@Injectable()
export class AuthService {
  private redis: Redis;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async register(dto: RegisterDto): Promise<TokensDto> {
    // Check existing user
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    });

    // Create user
    const user = await this.usersService.create({
      ...dto,
      passwordHash,
    });

    // Generate tokens
    return this.generateTokens(user.id, user.email);
  }

  async login(dto: LoginDto): Promise<TokensDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user.id, user.email);
  }

  async refresh(refreshToken: string): Promise<TokensDto> {
    // Verify refresh token
    const payload = await this.verifyRefreshToken(refreshToken);

    // Check blacklist
    const isBlacklisted = await this.redis.get(`blacklist:${refreshToken}`);
    if (isBlacklisted) throw new UnauthorizedException('Token revoked');

    // Blacklist old refresh token
    await this.blacklistToken(refreshToken, payload.exp);

    // Generate new tokens
    return this.generateTokens(payload.sub, payload.email);
  }

  async logout(accessToken: string, refreshToken: string): Promise<void> {
    // Blacklist both tokens
    const accessPayload = this.jwtService.decode(accessToken) as any;
    const refreshPayload = this.jwtService.decode(refreshToken) as any;

    await Promise.all([
      this.blacklistToken(accessToken, accessPayload?.exp),
      this.blacklistToken(refreshToken, refreshPayload?.exp),
    ]);
  }

  private async generateTokens(userId: string, email: string): Promise<TokensDto> {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async blacklistToken(token: string, expiry: number): Promise<void> {
    const ttl = expiry - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.setex(`blacklist:${token}`, ttl, '1');
    }
  }

  private async verifyRefreshToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
```

### Step 4: Auth Controller

```typescript
// apps/api/src/modules/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 per minute
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: any, @Body() dto: RefreshDto) {
    const accessToken = req.headers.authorization?.split(' ')[1];
    await this.authService.logout(accessToken, dto.refreshToken);
  }
}
```

### Step 5: JWT Strategy & Guards

```typescript
// apps/api/src/modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Redis } from 'ioredis';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private redis: Redis;

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
      passReqToCallback: true,
    });
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async validate(req: any, payload: any) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    // Check blacklist
    const isBlacklisted = await this.redis.get(`blacklist:${token}`);
    if (isBlacklisted) throw new UnauthorizedException('Token revoked');

    return { userId: payload.sub, email: payload.email };
  }
}
```

```typescript
// apps/api/src/modules/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

### Step 6: Frontend Auth Store & Components

```typescript
// apps/web/src/features/auth/hooks/use-auth.ts
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '../api/auth-api';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      await authApi.logout(refreshToken!);
    },
    onSettled: () => {
      logout();
      localStorage.removeItem('refreshToken');
    },
  });
}
```

```typescript
// apps/web/src/lib/api-client.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/auth-store';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

// Request interceptor: add auth header
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401, refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post('/auth/refresh', { refreshToken });

        useAuthStore.getState().setAuth(data.user, data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

## Todo List

- [ ] Install auth dependencies
- [ ] Create auth module structure
- [ ] Implement user registration
- [ ] Implement login with Argon2id
- [ ] Setup JWT access/refresh tokens
- [ ] Implement token refresh endpoint
- [ ] Implement logout with blacklisting
- [ ] Create RBAC guards
- [ ] Setup rate limiting
- [ ] Create frontend auth store
- [ ] Build login/register forms
- [ ] Implement axios interceptors
- [ ] Add password reset flow
- [ ] Write auth tests

## Success Criteria

1. User can register with email/password
2. User can login and receive tokens
3. Access token refreshes automatically
4. Logout invalidates all tokens
5. Rate limiting blocks brute force
6. RBAC restricts admin endpoints
7. Auth events logged to audit table

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Token leakage | High | Short expiry, HTTPS only |
| Brute force | High | Rate limiting, lockout |
| Redis unavailable | Medium | Graceful degradation |

## Security Considerations

- Argon2id with OWASP-recommended params
- Tokens stored in httpOnly cookies (future)
- HTTPS required in production
- Rate limiting on all auth endpoints
- Password strength validation
- Email verification before full access

## Next Steps

After completing Phase 02:
1. Proceed to Phase 03 (Real-time Messaging)
2. Integrate auth with WebSocket connections
3. Add conversation authorization
