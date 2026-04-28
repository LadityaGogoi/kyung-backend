import { Injectable, Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { PrismaService } from '@prisma/prisma.service';
import { REDIS_CLIENT } from '@redis/redis.module';
import { UpsertCartItemDto } from './dto';

const GUEST_CART_TTL = 60 * 60 * 24 * 7; // 7 days

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // ── Guest cart (Redis hash) ────────────────────────────────────────────────

  private guestKey(sessionId: string) {
    return `cart:guest:${sessionId}`;
  }

  async getGuestCart(sessionId: string): Promise<Record<string, number>> {
    const raw = await this.redis.hgetall(this.guestKey(sessionId));
    return Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, parseInt(v, 10)]),
    );
  }

  async upsertGuestCartItem(sessionId: string, dto: UpsertCartItemDto) {
    const key = this.guestKey(sessionId);
    if (dto.quantity === 0) {
      await this.redis.hdel(key, dto.productId);
    } else {
      await this.redis.hset(key, dto.productId, dto.quantity);
      await this.redis.expire(key, GUEST_CART_TTL);
    }
    return this.getGuestCart(sessionId);
  }

  async clearGuestCart(sessionId: string) {
    await this.redis.del(this.guestKey(sessionId));
  }

  // ── Authenticated cart (Prisma) ────────────────────────────────────────────

  async getUserCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, price: true, images: { take: 1 } },
            },
          },
        },
      },
    });
    return cart ?? { items: [] };
  }

  async upsertUserCartItem(userId: string, dto: UpsertCartItemDto) {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    if (dto.quantity === 0) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id, productId: dto.productId },
      });
    } else {
      await this.prisma.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId: dto.productId } },
        create: { cartId: cart.id, productId: dto.productId, quantity: dto.quantity },
        update: { quantity: dto.quantity },
      });
    }

    return this.getUserCart(userId);
  }

  async clearUserCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  }

  // ── Merge guest cart into user cart on login ───────────────────────────────

  async mergeGuestCart(userId: string, sessionId: string) {
    const guestItems = await this.getGuestCart(sessionId);
    if (Object.keys(guestItems).length === 0) return;

    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    for (const [productId, quantity] of Object.entries(guestItems)) {
      await this.prisma.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId } },
        create: { cartId: cart.id, productId, quantity },
        update: { quantity },
      });
    }

    await this.clearGuestCart(sessionId);
  }
}
