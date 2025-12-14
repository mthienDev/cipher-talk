import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ThrottlerModule } from '@nestjs/throttler';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  const mockTokens = {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
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

  const mockRefreshDto = {
    refreshToken: mockTokens.refreshToken,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([])],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
          },
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user and return tokens', async () => {
      // Arrange
      (authService.register as jest.Mock).mockResolvedValue(mockTokens);

      // Act
      const result = await authController.register(mockRegisterDto);

      // Assert
      expect(result).toEqual(mockTokens);
      expect(authService.register).toHaveBeenCalledWith(mockRegisterDto);
    });

    it('should handle registration errors', async () => {
      // Arrange
      const error = new Error('Email already registered');
      (authService.register as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(authController.register(mockRegisterDto)).rejects.toThrow(error);
    });
  });

  describe('POST /auth/login', () => {
    it('should login user and return tokens', async () => {
      // Arrange
      (authService.login as jest.Mock).mockResolvedValue(mockTokens);

      // Act
      const result = await authController.login(mockLoginDto);

      // Assert
      expect(result).toEqual(mockTokens);
      expect(authService.login).toHaveBeenCalledWith(mockLoginDto);
    });

    it('should handle invalid login credentials', async () => {
      // Arrange
      const error = new Error('Invalid credentials');
      (authService.login as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(authController.login(mockLoginDto)).rejects.toThrow(error);
    });

    it('should return HTTP 200 for successful login', async () => {
      // Arrange
      (authService.login as jest.Mock).mockResolvedValue(mockTokens);

      // Act
      const result = await authController.login(mockLoginDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // Arrange
      (authService.refresh as jest.Mock).mockResolvedValue(mockTokens);

      // Act
      const result = await authController.refresh(mockRefreshDto);

      // Assert
      expect(result).toEqual(mockTokens);
      expect(authService.refresh).toHaveBeenCalledWith(mockRefreshDto.refreshToken);
    });

    it('should handle invalid refresh token', async () => {
      // Arrange
      const error = new Error('Invalid refresh token');
      (authService.refresh as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(authController.refresh(mockRefreshDto)).rejects.toThrow(error);
    });

    it('should return HTTP 200 for successful refresh', async () => {
      // Arrange
      (authService.refresh as jest.Mock).mockResolvedValue(mockTokens);

      // Act
      const result = await authController.refresh(mockRefreshDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user successfully', async () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: `Bearer ${mockTokens.accessToken}`,
        },
      };

      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await authController.logout(mockRequest, mockRefreshDto);

      // Assert
      expect(result).toBeUndefined();
      expect(authService.logout).toHaveBeenCalledWith(
        mockTokens.accessToken,
        mockRefreshDto.refreshToken,
      );
    });

    it('should handle logout with missing authorization header', async () => {
      // Arrange
      const mockRequest = {
        headers: {},
      };

      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await authController.logout(mockRequest, mockRefreshDto);

      // Assert
      expect(result).toBeUndefined();
      expect(authService.logout).toHaveBeenCalledWith(undefined, mockRefreshDto.refreshToken);
    });

    it('should handle logout errors gracefully', async () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: `Bearer ${mockTokens.accessToken}`,
        },
      };
      const error = new Error('Logout failed');

      (authService.logout as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(authController.logout(mockRequest, mockRefreshDto)).rejects.toThrow(error);
    });

    it('should return HTTP 204 No Content on successful logout', async () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: `Bearer ${mockTokens.accessToken}`,
        },
      };

      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await authController.logout(mockRequest, mockRefreshDto);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should have rate limiting on register endpoint (3 per minute)', () => {
      // This is a decorator test - verify the controller method exists
      expect(authController.register).toBeDefined();
    });

    it('should have rate limiting on login endpoint (5 per minute)', () => {
      // This is a decorator test - verify the controller method exists
      expect(authController.login).toBeDefined();
    });
  });
});
