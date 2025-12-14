import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { DATABASE_CONNECTION } from '@/database';

describe('UsersService', () => {
  let usersService: UsersService;
  let mockDatabase: any;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$...',
    createdAt: new Date('2025-12-14T10:00:00Z'),
    updatedAt: new Date('2025-12-14T10:00:00Z'),
  };

  beforeEach(async () => {
    mockDatabase = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([mockUser]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([mockUser]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: DATABASE_CONNECTION,
          useValue: mockDatabase,
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      // Arrange
      mockDatabase.limit.mockResolvedValue([mockUser]);

      // Act
      const result = await usersService.findByEmail(mockUser.email);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockDatabase.select).toHaveBeenCalled();
      expect(mockDatabase.from).toHaveBeenCalled();
      expect(mockDatabase.where).toHaveBeenCalled();
      expect(mockDatabase.limit).toHaveBeenCalledWith(1);
    });

    it('should return null when user not found', async () => {
      // Arrange
      mockDatabase.limit.mockResolvedValue([]);

      // Act
      const result = await usersService.findByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockDatabase.limit.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(usersService.findByEmail(mockUser.email)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      // Arrange
      mockDatabase.limit.mockResolvedValue([mockUser]);

      // Act
      const result = await usersService.findById(mockUser.id);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockDatabase.select).toHaveBeenCalled();
      expect(mockDatabase.from).toHaveBeenCalled();
      expect(mockDatabase.where).toHaveBeenCalled();
      expect(mockDatabase.limit).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockDatabase.limit.mockResolvedValue([]);

      // Act & Assert
      await expect(
        usersService.findById('nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        usersService.findById('nonexistent-id'),
      ).rejects.toThrow('User with ID nonexistent-id not found');
    });

    it('should handle database errors during find by ID', async () => {
      // Arrange
      mockDatabase.limit.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(usersService.findById(mockUser.id)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      // Arrange
      const createUserData = {
        email: 'newuser@example.com',
        username: 'newuser',
        displayName: 'New User',
        passwordHash: 'hashed_password',
      };

      const createdUser = {
        ...mockUser,
        email: createUserData.email,
        username: createUserData.username,
        displayName: createUserData.displayName,
        passwordHash: createUserData.passwordHash,
      };

      mockDatabase.returning.mockResolvedValue([createdUser]);

      // Act
      const result = await usersService.create(createUserData);

      // Assert
      expect(result).toEqual(createdUser);
      expect(mockDatabase.insert).toHaveBeenCalled();
      expect(mockDatabase.values).toHaveBeenCalledWith({
        email: createUserData.email,
        username: createUserData.username,
        displayName: createUserData.displayName,
        passwordHash: createUserData.passwordHash,
      });
      expect(mockDatabase.returning).toHaveBeenCalled();
    });

    it('should handle user creation errors', async () => {
      // Arrange
      const createUserData = {
        email: 'error@example.com',
        username: 'erroruser',
        displayName: 'Error User',
        passwordHash: 'hashed_password',
      };

      mockDatabase.returning.mockRejectedValue(
        new Error('Unique constraint violation'),
      );

      // Act & Assert
      await expect(usersService.create(createUserData)).rejects.toThrow(
        'Unique constraint violation',
      );
    });

    it('should create user with all required fields', async () => {
      // Arrange
      const createUserData = {
        email: 'complete@example.com',
        username: 'completeuser',
        displayName: 'Complete User',
        passwordHash: '$argon2id$v=19$...',
      };

      const createdUser = {
        ...mockUser,
        ...createUserData,
      };

      mockDatabase.returning.mockResolvedValue([createdUser]);

      // Act
      const result = await usersService.create(createUserData);

      // Assert
      expect(result!.email).toBe(createUserData.email);
      expect(result!.username).toBe(createUserData.username);
      expect(result!.displayName).toBe(createUserData.displayName);
      expect(result!.passwordHash).toBe(createUserData.passwordHash);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle multiple sequential operations', async () => {
      // Arrange
      mockDatabase.limit.mockResolvedValueOnce([null]).mockResolvedValueOnce([mockUser]);
      mockDatabase.returning.mockResolvedValue([mockUser]);

      // Act
      const existingUser = await usersService.findByEmail('newemail@example.com');
      expect(existingUser).toBeNull();

      mockDatabase.limit.mockResolvedValue([mockUser]);
      const foundUser = await usersService.findById(mockUser.id);

      // Assert
      expect(foundUser).toEqual(mockUser);
      expect(mockDatabase.select).toHaveBeenCalledTimes(2);
    });

    it('should maintain data consistency across operations', async () => {
      // Arrange
      const userEmail = mockUser.email;
      mockDatabase.limit.mockResolvedValue([mockUser]);

      // Act
      const foundByEmail = await usersService.findByEmail(userEmail);
      mockDatabase.limit.mockResolvedValue([mockUser]);
      const foundById = await usersService.findById(mockUser.id);

      // Assert
      expect(foundByEmail?.id).toBe(foundById.id);
      expect(foundByEmail?.email).toBe(foundById.email);
    });
  });
});
