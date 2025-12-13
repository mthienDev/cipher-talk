/**
 * User entity representing a CipherTalk user
 */
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type UserStatus = 'online' | 'offline' | 'away' | 'busy';

/**
 * User registration data
 */
export interface UserRegistrationDto {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

/**
 * User login data
 */
export interface UserLoginDto {
  email: string;
  password: string;
}

/**
 * User profile update data
 */
export interface UserUpdateDto {
  displayName?: string;
  avatarUrl?: string;
  status?: UserStatus;
}
