import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { LoginDto, RegisterDto } from './dto';
import type { JwtPayload } from './strategies/jwt.strategy';
import type {
  RegisterResponseDto,
  LoginResponseDto,
  RefreshResponseDto,
} from './response';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException({
        message: {
          title: 'Registration Failed',
          subTitle: 'An account with this email already exists',
        },
      });
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        name: dto.name ?? null,
        role: UserRole.CUSTOMER,
      },
    });

    const tokens = await this.signToken(user.id, user.email);
    return {
      message: { title: 'Success', subTitle: 'Account created successfully' },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    };
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      this.throwInvalidCredentials();
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      this.throwInvalidCredentials();
    }

    const tokens = await this.signToken(user.id, user.email);
    return {
      message: { title: 'Success', subTitle: 'Login successful' },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
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

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException({
        message: {
          title: 'Authentication Failed',
          subTitle: 'User no longer exists',
        },
      });
    }

    const tokens = await this.signToken(user.id, user.email);
    return {
      message: { title: 'Success', subTitle: 'Tokens refreshed successfully' },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    };
  }

  private async signToken(
    userId: string,
    email: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const payload: JwtPayload = {
      sub: userId,
      email,
    };

    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');

    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET is not defined');
    }
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }

    const access_token = await this.jwt.signAsync(payload, {
      expiresIn: '6h',
      secret: accessSecret,
    });

    const refresh_token = await this.jwt.signAsync(payload, {
      expiresIn: '7d',
      secret: refreshSecret,
    });

    return {
      access_token,
      refresh_token,
    };
  }

  private throwInvalidCredentials(): never {
    throw new UnauthorizedException({
      message: {
        title: 'Authentication Failed',
        subTitle: 'Invalid email or password',
      },
    });
  }
}
