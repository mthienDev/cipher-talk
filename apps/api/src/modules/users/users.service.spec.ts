import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PRISMA_SERVICE } from '@/database';

describe('UsersService', () => {
  let usersService: UsersService;
  let mockPrisma: any;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$...',
    avatarUrl: null,
    status: 'offline',
    createdAt: new Date('2025-12-14T10:00:00Z'),
    updatedAt: new Date('2025-12-14T10:00:00Z'),
  };

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PRISMA_SERVICE,
          useValue: mockPrisma,
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
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await usersService.findByEmail(mockUser.email);

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await usersService.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(usersService.findByEmail(mockUser.email)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await usersService.findById(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        usersService.findById('nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        usersService.findById('nonexistent-id'),
      ).rejects.toThrow('User with ID nonexistent-id not found');
    });

    it('should handle database errors during find by ID', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(usersService.findById(mockUser.id)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
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

      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await usersService.create(createUserData);

      expect(result).toEqual(createdUser);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: createUserData.email,
          username: createUserData.username,
          displayName: createUserData.displayName,
          passwordHash: createUserData.passwordHash,
        },
      });
    });

    it('should handle user creation errors', async () => {
      const createUserData = {
        email: 'error@example.com',
        username: 'erroruser',
        displayName: 'Error User',
        passwordHash: 'hashed_password',
      };

      mockPrisma.user.create.mockRejectedValue(
        new Error('Unique constraint violation'),
      );

      await expect(usersService.create(createUserData)).rejects.toThrow(
        'Unique constraint violation',
      );
    });

    it('should create user with all required fields', async () => {
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

      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await usersService.create(createUserData);

      expect(result.email).toBe(createUserData.email);
      expect(result.username).toBe(createUserData.username);
      expect(result.displayName).toBe(createUserData.displayName);
      expect(result.passwordHash).toBe(createUserData.passwordHash);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle multiple sequential operations', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);

      const existingUser = await usersService.findByEmail('newemail@example.com');
      expect(existingUser).toBeNull();

      const foundUser = await usersService.findById(mockUser.id);
      expect(foundUser).toEqual(mockUser);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should maintain data consistency across operations', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const foundByEmail = await usersService.findByEmail(mockUser.email);
      const foundById = await usersService.findById(mockUser.id);

      expect(foundByEmail?.id).toBe(foundById.id);
      expect(foundByEmail?.email).toBe(foundById.email);
    });
  });
});
