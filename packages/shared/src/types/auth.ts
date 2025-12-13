import { User } from './user';

/**
 * Authentication response
 */
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

/**
 * Token refresh request
 */
export interface RefreshTokenDto {
  refreshToken: string;
}

/**
 * JWT payload
 */
export interface JwtPayload {
  sub: string; // user ID
  email: string;
  username: string;
  iat: number; // issued at
  exp: number; // expiration
}

/**
 * Password reset request
 */
export interface PasswordResetRequestDto {
  email: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetDto {
  token: string;
  newPassword: string;
}

/**
 * Change password DTO
 */
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

/**
 * Two-factor authentication setup
 */
export interface TwoFactorSetupDto {
  secret: string;
  qrCode: string; // Data URL
}

/**
 * Two-factor authentication verification
 */
export interface TwoFactorVerifyDto {
  code: string;
}
