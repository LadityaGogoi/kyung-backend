import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '@prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { LoginDto, RegisterDto } from './dto';
import type { JwtPayload } from '@common/types';
import type {
  RegisterResponseDto,
  LoginResponseDto,
  RefreshResponseDto,
} from './response';

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_EXPIRY_DAYS = 90;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
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

    const tokens = await this.signAndStoreToken(user.id, user.phone);
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
      throw new UnauthorizedException({
        message: {
          title: 'Account Not Found',
          subTitle: 'No account with that phone number. Please register.',
        },
      });
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      this.throwInvalidCredentials();
    }

    const tokens = await this.signAndStoreToken(user.id, user.phone);
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

    // Find a stored token that matches (logout clears all rows for the user)
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

    // Rotate: remove the used token from the store (replay protection without Redis)
    await this.prisma.refreshToken.delete({ where: { id: matched.id } });

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException({
        message: {
          title: 'Authentication Failed',
          subTitle: 'User no longer exists',
        },
      });
    }

    const tokens = await this.signAndStoreToken(user.id, user.phone);
    return {
      message: { title: 'Success', subTitle: 'Tokens refreshed successfully' },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      role: user.role,
    };
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  private async signAndStoreToken(
    userId: string,
    phone: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const jti = randomUUID();
    const refreshPayload: JwtPayload = { sub: userId, phone, jti };

    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!accessSecret) throw new Error('JWT_ACCESS_SECRET is not defined');
    if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET is not defined');

    const access_token = await this.jwt.signAsync(
      { sub: userId, phone },
      { expiresIn: '6h', secret: accessSecret },
    );

    const refresh_token = await this.jwt.signAsync(refreshPayload, {
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
