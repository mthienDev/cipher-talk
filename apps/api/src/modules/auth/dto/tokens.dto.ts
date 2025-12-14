import { User } from '@ciphertalk/shared';

export class TokensDto {
  accessToken!: string;
  refreshToken!: string;
  user!: User;
}
