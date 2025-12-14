import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '@/modules/users/users.service';
import * as argon2 from 'argon2';
import Redis from 'ioredis';

jest.mock('argon2');
jest.mock('ioredis');

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let redisMock: jest.Mocked<Redis>;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$...',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRegisterDto = {
    email: 'newuser@example.com',
    username: 'newuser',
    displayName: 'New User',
    password: 'password123',
  };

  const mockLoginDto = {
    email: 'test@example.com',
    password: 'password123',
  };

  beforeEach(async () => {
    redisMock = {
      get: jest.fn(),
      setex: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
            decode: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'REDIS_URL') return 'redis://localhost:6379';
              if (key === 'JWT_SECRET') return 'test-secret-key-for-jwt';
              return null;
            }),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

    // Replace redis instance with mock
    (authService as any).redis = redisMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed_password');
      (usersService.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        email: mockRegisterDto.email,
        username: mockRegisterDto.username,
        displayName: mockRegisterDto.displayName,
      });
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('access_token')
        .mockResolvedValueOnce('refresh_token');

      // Act
      const result = await authService.register(mockRegisterDto);

      // Assert
      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith(mockRegisterDto.email);
      expect(argon2.hash).toHaveBeenCalledWith(
        mockRegisterDto.password,
        expect.objectContaining({
          type: argon2.argon2id,
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4,
        }),
      );
      expect(usersService.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.register(mockRegisterDto)).rejects.toThrow(
        ConflictException,
      );
      expect(usersService.findByEmail).toHaveBeenCalledWith(mockRegisterDto.email);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if user creation fails', async () => {
      // Arrange
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed_password');
      (usersService.create as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(authService.register(mockRegisterDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should login user successfully with correct password', async () => {
      // Arrange
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('access_token')
        .mockResolvedValueOnce('refresh_token');

      // Act
      const result = await authService.login(mockLoginDto);

      // Assert
      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith(mockLoginDto.email);
      expect(argon2.verify).toHaveBeenCalledWith(mockUser.passwordHash, mockLoginDto.password);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      // Arrange
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('should generate new tokens with valid refresh token', async () => {
      // Arrange
      const refreshToken = 'valid_refresh_token';
      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      };

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payload);
      (redisMock.get as jest.Mock).mockResolvedValue(null); // Not blacklisted
      (redisMock.setex as jest.Mock).mockResolvedValue('OK');
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('new_access_token')
        .mockResolvedValueOnce('new_refresh_token');

      // Act
      const result = await authService.refresh(refreshToken);

      // Assert
      expect(result).toEqual({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      });
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        refreshToken,
        expect.objectContaining({ secret: 'test-secret-key-for-jwt' }),
      );
      expect(redisMock.get).toHaveBeenCalledWith(`blacklist:${refreshToken}`);
      expect(redisMock.setex).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if token is blacklisted', async () => {
      // Arrange
      const refreshToken = 'blacklisted_token';
      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      };

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payload);
      (redisMock.get as jest.Mock).mockResolvedValue('1'); // Is blacklisted

      // Act & Assert
      await expect(authService.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      // Arrange
      const refreshToken = 'invalid_token';
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(authService.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should blacklist both access and refresh tokens', async () => {
      // Arrange
      const accessToken = 'access_token';
      const refreshToken = 'refresh_token';
      const accessPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        exp: Math.floor(Date.now() / 1000) + 15 * 60,
      };
      const refreshPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      };

      (jwtService.decode as jest.Mock)
        .mockReturnValueOnce(accessPayload)
        .mockReturnValueOnce(refreshPayload);
      (redisMock.setex as jest.Mock).mockResolvedValue('OK');

      // Act
      await authService.logout(accessToken, refreshToken);

      // Assert
      expect(jwtService.decode).toHaveBeenCalledTimes(2);
      expect(redisMock.setex).toHaveBeenCalledTimes(2);
      expect(redisMock.setex).toHaveBeenNthCalledWith(
        1,
        `blacklist:${accessToken}`,
        expect.any(Number),
        '1',
      );
      expect(redisMock.setex).toHaveBeenNthCalledWith(
        2,
        `blacklist:${refreshToken}`,
        expect.any(Number),
        '1',
      );
    });

    it('should handle logout with invalid token payloads gracefully', async () => {
      // Arrange
      const accessToken = 'invalid_access';
      const refreshToken = 'invalid_refresh';

      (jwtService.decode as jest.Mock).mockReturnValue(null);
      (redisMock.setex as jest.Mock).mockResolvedValue('OK');

      // Act
      await authService.logout(accessToken, refreshToken);

      // Assert
      expect(jwtService.decode).toHaveBeenCalledTimes(2);
      expect(redisMock.setex).not.toHaveBeenCalled();
    });
  });

  describe('generateTokens (private)', () => {
    it('should generate access and refresh tokens with correct expiration', async () => {
      // Arrange
      const userId = mockUser.id;
      const email = mockUser.email;

      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('access_token')
        .mockResolvedValueOnce('refresh_token');

      // Act
      const result = await (authService as any).generateTokens(userId, email);

      // Assert
      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(1, { sub: userId, email }, {
        secret: 'test-secret-key-for-jwt',
        expiresIn: '15m',
      });
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(2, { sub: userId, email }, {
        secret: 'test-secret-key-for-jwt',
        expiresIn: '7d',
      });
    });
  });

  describe('blacklistToken (private)', () => {
    it('should blacklist token with TTL', async () => {
      // Arrange
      const token = 'test_token';
      const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      (redisMock.setex as jest.Mock).mockResolvedValue('OK');

      // Act
      await (authService as any).blacklistToken(token, exp);

      // Assert
      expect(redisMock.setex).toHaveBeenCalledWith(
        `blacklist:${token}`,
        expect.any(Number),
        '1',
      );
    });

    it('should not blacklist token if expiry is not provided', async () => {
      // Arrange
      const token = 'test_token';

      // Act
      await (authService as any).blacklistToken(token, null);

      // Assert
      expect(redisMock.setex).not.toHaveBeenCalled();
    });

    it('should not blacklist token if TTL is negative', async () => {
      // Arrange
      const token = 'test_token';
      const exp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago (expired)

      // Act
      await (authService as any).blacklistToken(token, exp);

      // Assert
      expect(redisMock.setex).not.toHaveBeenCalled();
    });
  });

  describe('verifyRefreshToken (private)', () => {
    it('should verify and return valid refresh token payload', async () => {
      // Arrange
      const refreshToken = 'valid_refresh_token';
      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      };

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payload);

      // Act
      const result = await (authService as any).verifyRefreshToken(refreshToken);

      // Assert
      expect(result).toEqual(payload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        refreshToken,
        expect.objectContaining({ secret: 'test-secret-key-for-jwt' }),
      );
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      const refreshToken = 'invalid_token';
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(
        (authService as any).verifyRefreshToken(refreshToken),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
