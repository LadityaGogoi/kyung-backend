import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import type Redis from 'ioredis';
import { PrismaService } from '@prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { REDIS_CLIENT } from '@redis/redis.module';
import { LoginDto, RegisterDto } from './dto';
import type { JwtPayload } from '@common/types';
import type {
  RegisterResponseDto,
  LoginResponseDto,
  RefreshResponseDto,
} from './response';

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const REFRESH_TOKEN_EXPIRY_SECONDS = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const phoneTaken = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      select: { id: true },
    });
    if (phoneTaken) {
      throw new ConflictException({
        message: {
          title: 'Registration Failed',
          subTitle: 'An account with this phone number already exists',
        },
      });
    }

    if (dto.email) {
      const emailTaken = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
        select: { id: true },
      });
      if (emailTaken) {
        throw new ConflictException({
          message: {
            title: 'Registration Failed',
            subTitle: 'An account with this email already exists',
          },
        });
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email?.toLowerCase() ?? null,
        password: hashedPassword,
        phone: dto.phone,
        name: dto.name,
        role: UserRole.CUSTOMER,
      },
    });

    const tokens = await this.signAndStoreToken(user.id, user.email);
    return {
      message: { title: 'Success', subTitle: 'Account created successfully' },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      role: user.role,
    };
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) {
      this.throwInvalidCredentials();
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      this.throwInvalidCredentials();
    }

    const tokens = await this.signAndStoreToken(user.id, user.email);
    return {
      message: { title: 'Success', subTitle: 'Login successful' },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      role: user.role,
    };
  }

  async refresh(refreshToken: string): Promise<RefreshResponseDto> {
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException({
        message: {
          title: 'Authentication Failed',
          subTitle: 'Invalid or expired refresh token',
        },
      });
    }

    // Check Redis blocklist first (O(1)) before hitting Postgres
    if (payload.jti) {
      const blocked = await this.redis.get(`blocklist:jti:${payload.jti}`);
      if (blocked) {
        throw new UnauthorizedException({
          message: {
            title: 'Authentication Failed',
            subTitle: 'Refresh token has been revoked',
          },
        });
      }
    }

    // Check all-device revocation timestamp
    const revokedAllAt = await this.redis.get(`revoked-all:${payload.sub}`);
    if (revokedAllAt) {
      const issuedAt = (payload as any).iat as number | undefined;
      if (!issuedAt || issuedAt < Number(revokedAllAt)) {
        throw new UnauthorizedException({
          message: {
            title: 'Authentication Failed',
            subTitle: 'All sessions have been revoked',
          },
        });
      }
    }

    // Find a stored token that matches
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: { userId: payload.sub, expiresAt: { gt: new Date() } },
    });

    let matched: (typeof storedTokens)[number] | undefined;
    for (const stored of storedTokens) {
      const isMatch = await bcrypt.compare(refreshToken, stored.tokenHash);
      if (isMatch) {
        matched = stored;
        break;
      }
    }

    if (!matched) {
      throw new UnauthorizedException({
        message: {
          title: 'Authentication Failed',
          subTitle: 'Refresh token has been revoked or is invalid',
        },
      });
    }

    // Rotate: delete the used token, add its JTI to blocklist
    await this.prisma.refreshToken.delete({ where: { id: matched.id } });

    if (payload.jti) {
      const remainingTtl = Math.max(
        0,
        Math.floor(((payload as any).exp as number) - Date.now() / 1000),
      );
      if (remainingTtl > 0) {
        await this.redis.set(
          `blocklist:jti:${payload.jti}`,
          '1',
          'EX',
          remainingTtl,
        );
      }
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException({
        message: {
          title: 'Authentication Failed',
          subTitle: 'User no longer exists',
        },
      });
    }

    const tokens = await this.signAndStoreToken(user.id, user.email);
    return {
      message: { title: 'Success', subTitle: 'Tokens refreshed successfully' },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      role: user.role,
    };
  }

  async logout(userId: string): Promise<void> {
    // Write revoked-all timestamp so any token issued before now is rejected
    await this.redis.set(
      `revoked-all:${userId}`,
      String(Math.floor(Date.now() / 1000)),
      'EX',
      REFRESH_TOKEN_EXPIRY_SECONDS,
    );
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  private async signAndStoreToken(
    userId: string,
    email: string | null,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const jti = randomUUID();
    const emailClaim = email ?? '';
    const payload: JwtPayload = { sub: userId, email: emailClaim, jti };

    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!accessSecret) throw new Error('JWT_ACCESS_SECRET is not defined');
    if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET is not defined');

    const access_token = await this.jwt.signAsync(
      { sub: userId, email: emailClaim },
      { expiresIn: '6h', secret: accessSecret },
    );

    const refresh_token = await this.jwt.signAsync(payload, {
      expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
      secret: refreshSecret,
    });

    // Store hashed refresh token
    const tokenHash = await bcrypt.hash(refresh_token, SALT_ROUNDS);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    // Clean up expired tokens for this user (housekeeping)
    await this.prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });

    return { access_token, refresh_token };
  }

  private throwInvalidCredentials(): never {
    throw new UnauthorizedException({
      message: {
        title: 'Authentication Failed',
        subTitle: 'Invalid phone number or password',
      },
    });
  }
}
