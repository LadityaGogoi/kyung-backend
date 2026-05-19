import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { UpsertCartItemDto } from './dto';

const cartItemInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: {
        select: { id: true, url: true, alt: true },
        orderBy: { sortOrder: 'asc' as const },
        take: 1,
      },
    },
  },
} satisfies Prisma.CartItemInclude;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Guest cart (MongoDB) ───────────────────────────────────────────────────

  async getGuestCart(sessionId: string): Promise<Record<string, number>> {
    if (!sessionId) return {};
    const cart = await this.prisma.guestCart.findUnique({ where: { sessionId } });
    if (!cart) return {};
    const items = cart.items as Record<string, number>;
    return items ?? {};
  }

  private async saveGuestCart(sessionId: string, items: Record<string, number>) {
    await this.prisma.guestCart.upsert({
      where: { sessionId },
      create: { sessionId, items },
      update: { items },
    });
  }

  async upsertGuestCartItem(sessionId: string, dto: UpsertCartItemDto) {
    const items = await this.getGuestCart(sessionId);
    if (dto.quantity === 0) {
      delete items[dto.productId];
    } else {
      items[dto.productId] = dto.quantity;
    }
    await this.saveGuestCart(sessionId, items);
    return items;
  }

  async clearGuestCart(sessionId: string) {
    if (!sessionId) return;
    await this.prisma.guestCart.deleteMany({ where: { sessionId } });
  }

  // ── Authenticated cart (Prisma) ────────────────────────────────────────────

  async getUserCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: cartItemInclude, orderBy: { createdAt: 'asc' } } },
    });

    if (!cart) return { id: null, items: [] };
    return this.serializeCart(cart);
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

  // ── Serialization ──────────────────────────────────────────────────────────

  private serializeCart(
    cart: Prisma.CartGetPayload<{ include: { items: { include: typeof cartItemInclude } } }>,
  ) {
    return {
      id: cart.id,
      items: cart.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          price: Number(item.product.price),
          images: item.product.images,
        },
      })),
    };
  }
}
