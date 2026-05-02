import type { User } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  phone: string;
  jti?: string;
}

export type UserWithoutPassword = Omit<User, 'password'>;
