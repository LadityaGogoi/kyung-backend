import type { User } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  jti?: string;
}

export type UserWithoutPassword = Omit<User, 'password'>;
