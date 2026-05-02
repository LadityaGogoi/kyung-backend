import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type Redis from 'ioredis';
import { PrismaService } from '@prisma/prisma.service';
import { REDIS_CLIENT } from '@redis/redis.module';
import type { UserWithoutPassword } from '@common/types';
import type { GetUserResponseDto, OrderListResponseDto } from './response';
import type {
  UpdateProfileDto,
  ChangePasswordDto,
  ChangeEmailDto,
  RequestOtpDto,
  VerifyOtpDto,
} from './dto';
import { MessageResponse } from '@utils';

const OTP_TTL = 300; // seconds
/** Until SMS is wired; must match what we store in `PhoneOtp` for phone flow. */
const STATIC_PHONE_OTP = '9999';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // ── OTP ────────────────────────────────────────────────────────────────────

  async requestOtp(userId: string, dto: RequestOtpDto): Promise<{ otp?: string }> {
    if (dto.field === 'email') {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.value } });
      if (existing && existing.id !== userId)
        throw new ConflictException({ message: { title: 'Conflict', subTitle: 'Email already in use' } });

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const key = `otp:${userId}:${dto.field}`;
      await this.redis.set(key, JSON.stringify({ code, value: dto.value }), 'EX', OTP_TTL);

      this.logger.log(`OTP for user ${userId} (${dto.field} → ${dto.value}): ${code}`);

      return { otp: code };
    }

    // Phone: persist in DB for audit / future SMS; static code for now
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.value } });
    if (existing && existing.id !== userId)
      throw new ConflictException({ message: { title: 'Conflict', subTitle: 'Phone number already in use' } });

    const expiresAt = new Date(Date.now() + OTP_TTL * 1000);
    await this.prisma.phoneOtp.deleteMany({ where: { userId } });
    await this.prisma.phoneOtp.create({
      data: {
        userId,
        phone: dto.value,
        code: STATIC_PHONE_OTP,
        name: dto.name?.trim() || null,
        expiresAt,
      },
    });

    this.logger.log(`Phone OTP for user ${userId} (phone ${dto.value}): ${STATIC_PHONE_OTP} (static; replace with SMS)`);

    return { otp: STATIC_PHONE_OTP };
  }

  async verifyOtp(userId: string, dto: VerifyOtpDto): Promise<GetUserResponseDto> {
    if (dto.field === 'email') {
      const key = `otp:${userId}:${dto.field}`;
      const raw = await this.redis.get(key);

      if (!raw)
        throw new BadRequestException({ message: { title: 'Bad Request', subTitle: 'OTP has expired' } });

      const entry: { code: string; value: string } = JSON.parse(raw);

      if (entry.value !== dto.value || entry.code !== dto.otp)
        throw new BadRequestException({ message: { title: 'Bad Request', subTitle: 'Invalid OTP' } });

      await this.redis.del(key);

      const data: Record<string, unknown> = {
        email: dto.value,
        emailVerified: true,
        ...(dto.name !== undefined && { name: dto.name || null }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl || null }),
      };

      const updated = await this.prisma.user.update({ where: { id: userId }, data });
      const { password: _p, ...userWithoutPassword } = updated;

      return {
        message: { title: 'Success', subTitle: 'Email updated successfully' },
        user: userWithoutPassword as UserWithoutPassword,
      };
    }

    const record = await this.prisma.phoneOtp.findFirst({
      where: {
        userId,
        phone: dto.value,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record)
      throw new BadRequestException({ message: { title: 'Bad Request', subTitle: 'OTP has expired' } });

    if (record.code !== dto.otp)
      throw new BadRequestException({ message: { title: 'Bad Request', subTitle: 'Invalid OTP' } });

    await this.prisma.phoneOtp.delete({ where: { id: record.id } });

    const nameFromFlow =
      dto.name !== undefined ? dto.name || null : record.name != null ? record.name : undefined;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        phone: dto.value,
        phoneVerified: true,
        ...(nameFromFlow !== undefined && { name: nameFromFlow }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl || null }),
      },
    });

    const { password: _p, ...userWithoutPassword } = updated;

    return {
      message: { title: 'Success', subTitle: 'Phone verified successfully' },
      user: userWithoutPassword as UserWithoutPassword,
    };
  }

  async getProfile(userId: string): Promise<GetUserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'User not found' },
      });
    }

    const { password: _password, ...userWithoutPassword } = user;
    return {
      message: { title: 'Success', subTitle: 'User details retrieved successfully' },
      user: userWithoutPassword as UserWithoutPassword,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<GetUserResponseDto> {
    if (dto.phone) {
      const existing = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException({
          message: { title: 'Conflict', subTitle: 'Phone number already in use' },
        });
      }
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'User not found' },
      });
    }

    const phoneChanged =
      dto.phone !== undefined && dto.phone !== user.phone;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name || null }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(phoneChanged && { phoneVerified: false }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl || null }),
      },
    });

    const { password: _password, ...userWithoutPassword } = updated;
    return {
      message: { title: 'Success', subTitle: 'Profile updated successfully' },
      user: userWithoutPassword as UserWithoutPassword,
    };
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  async getOrders(userId: string): Promise<OrderListResponseDto> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: { title: 'Success', subTitle: 'Orders retrieved' },
      orders: orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        subtotal: Number(o.subtotal),
        shippingCost: Number(o.shippingCost),
        tax: Number(o.tax),
        discount: Number(o.discount),
        total: Number(o.total),
        currency: o.currency,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        items: o.items.map(i => ({
          id: i.id,
          productId: i.productId,
          productName: i.productName,
          productSku: i.productSku,
          quantity: i.quantity,
          priceAtPurchase: Number(i.priceAtPurchase),
        })),
      })),
    };
  }

  // ── Security ────────────────────────────────────────────────────────────────

  async changeEmail(userId: string, dto: ChangeEmailDto): Promise<GetUserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ message: { title: 'Not Found', subTitle: 'User not found' } });

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new UnauthorizedException({ message: { title: 'Unauthorised', subTitle: 'Incorrect password' } });

    const existing = await this.prisma.user.findUnique({ where: { email: dto.newEmail } });
    if (existing && existing.id !== userId)
      throw new ConflictException({ message: { title: 'Conflict', subTitle: 'Email already in use' } });

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { email: dto.newEmail, emailVerified: false },
    });

    const { password: _p, ...userWithoutPassword } = updated;
    return {
      message: { title: 'Success', subTitle: 'Email updated. Please verify your new address.' },
      user: userWithoutPassword as UserWithoutPassword,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<MessageResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ message: { title: 'Not Found', subTitle: 'User not found' } });

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new UnauthorizedException({ message: { title: 'Unauthorised', subTitle: 'Current password is incorrect' } });

    if (dto.currentPassword === dto.newPassword)
      throw new BadRequestException({ message: { title: 'Bad Request', subTitle: 'New password must differ from current password' } });

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    return { message: { title: 'Success', subTitle: 'Password changed. Please sign in again.' } };
  }

  async revokeAllSessions(userId: string): Promise<MessageResponse> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { message: { title: 'Success', subTitle: 'Signed out from all devices' } };
  }
}
