import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@prisma/prisma.service';
import type { UserWithoutPassword } from '@common/types';
import type {
  GetUserResponseDto,
  AddressResponseDto,
  AddressListResponseDto,
  OrderListResponseDto,
} from './response';
import type {
  UpdateProfileDto,
  CreateAddressDto,
  UpdateAddressDto,
  ChangePasswordDto,
  ChangeEmailDto,
  RequestOtpDto,
  VerifyOtpDto,
} from './dto';
import { MessageResponse } from '@utils';

interface OtpEntry {
  code: string;
  field: 'email' | 'phone';
  value: string;
  expiresAt: number;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly otpStore = new Map<string, OtpEntry>();

  constructor(private readonly prisma: PrismaService) {}

  // ── OTP ────────────────────────────────────────────────────────────────────

  async requestOtp(userId: string, dto: RequestOtpDto): Promise<{ otp?: string }> {
    if (dto.field === 'email') {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.value } });
      if (existing && existing.id !== userId)
        throw new ConflictException({ message: { title: 'Conflict', subTitle: 'Email already in use' } });
    } else {
      const existing = await this.prisma.user.findUnique({ where: { phone: dto.value } });
      if (existing && existing.id !== userId)
        throw new ConflictException({ message: { title: 'Conflict', subTitle: 'Phone number already in use' } });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.otpStore.set(`${userId}:${dto.field}`, {
      code,
      field: dto.field,
      value: dto.value,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    this.logger.log(`OTP for user ${userId} (${dto.field} → ${dto.value}): ${code}`);

    return { otp: code };
  }

  async verifyOtp(userId: string, dto: VerifyOtpDto): Promise<GetUserResponseDto> {
    const entry = this.otpStore.get(`${userId}:${dto.field}`);

    if (!entry || entry.value !== dto.value || entry.code !== dto.otp)
      throw new BadRequestException({ message: { title: 'Bad Request', subTitle: 'Invalid OTP' } });

    if (Date.now() > entry.expiresAt)
      throw new BadRequestException({ message: { title: 'Bad Request', subTitle: 'OTP has expired' } });

    this.otpStore.delete(`${userId}:${dto.field}`);

    const data: Record<string, unknown> = {
      ...(dto.field === 'email' && { email: dto.value, emailVerified: true }),
      ...(dto.field === 'phone' && { phone: dto.value }),
      ...(dto.name !== undefined && { name: dto.name || null }),
      ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl || null }),
    };

    const updated = await this.prisma.user.update({ where: { id: userId }, data });
    const { password: _p, ...userWithoutPassword } = updated;

    return {
      message: { title: 'Success', subTitle: `${dto.field === 'email' ? 'Email' : 'Phone'} updated successfully` },
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

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name || null }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl || null }),
      },
    });

    const { password: _password, ...userWithoutPassword } = user;
    return {
      message: { title: 'Success', subTitle: 'Profile updated successfully' },
      user: userWithoutPassword as UserWithoutPassword,
    };
  }

  // ── Addresses ──────────────────────────────────────────────────────────────

  async getAddresses(userId: string): Promise<AddressListResponseDto> {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return {
      message: { title: 'Success', subTitle: 'Addresses retrieved' },
      addresses,
    };
  }

  async createAddress(
    userId: string,
    dto: CreateAddressDto,
  ): Promise<AddressResponseDto> {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.create({
      data: { userId, ...dto, country: dto.country ?? 'India' },
    });

    return {
      message: { title: 'Success', subTitle: 'Address added successfully' },
      address,
    };
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Address not found' },
      });
    }

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });

    return {
      message: { title: 'Success', subTitle: 'Address updated successfully' },
      address,
    };
  }

  async deleteAddress(userId: string, addressId: string): Promise<MessageResponse> {
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Address not found' },
      });
    }

    await this.prisma.address.delete({ where: { id: addressId } });

    return {
      message: { title: 'Success', subTitle: 'Address deleted successfully' },
    };
  }

  async setDefaultAddress(
    userId: string,
    addressId: string,
  ): Promise<AddressResponseDto> {
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Address not found' },
      });
    }

    await this.prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    const address = await this.prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    return {
      message: { title: 'Success', subTitle: 'Default address updated' },
      address,
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
