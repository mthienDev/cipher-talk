import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import Redis from 'ioredis';
import { UsersService } from '@/modules/users/users.service';
import { RegisterDto, LoginDto, TokensDto } from '@/modules/auth/dto';

@Injectable()
export class AuthService {
  private redis: Redis;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.redis = new Redis(redisUrl);
  }

  async register(dto: RegisterDto): Promise<TokensDto> {
    // Check existing user
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    });

    // Create user
    const user = await this.usersService.create({
      email: dto.email,
      username: dto.username,
      displayName: dto.displayName,
      passwordHash,
    });

    if (!user) {
      throw new ConflictException('Failed to create user');
    }

    // Generate tokens
    return this.generateTokens(user.id, user.email);
  }

  async login(dto: LoginDto): Promise<TokensDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.id, user.email);
  }

  async refresh(refreshToken: string): Promise<TokensDto> {
    // Verify refresh token
    const payload = await this.verifyRefreshToken(refreshToken);

    // Check blacklist
    const isBlacklisted = await this.redis.get(`blacklist:${refreshToken}`);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token revoked');
    }

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

    const jwtSecret = this.configService.get<string>('JWT_SECRET');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { secret: jwtSecret, expiresIn: '15m' }),
      this.jwtService.signAsync(payload, { secret: jwtSecret, expiresIn: '7d' }),
    ]);

    return { accessToken, refreshToken };
  }

  private async blacklistToken(token: string, expiry: number): Promise<void> {
    if (!expiry) return;

    const ttl = expiry - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.setex(`blacklist:${token}`, ttl, '1');
    }
  }

  private async verifyRefreshToken(token: string): Promise<any> {
    try {
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      return await this.jwtService.verifyAsync(token, { secret: jwtSecret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
