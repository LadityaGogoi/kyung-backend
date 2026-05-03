import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { AddToWishlistDto } from './dto';

const productSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  compareAtPrice: true,
  stockQuantity: true,
  gender: true,
  colour: true,
  category: { select: { id: true, name: true, slug: true } },
  subcategory: { select: { id: true, name: true, slug: true } },
  images: {
    select: { id: true, url: true, publicId: true, alt: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' as const },
    take: 1,
  },
} satisfies Prisma.ProductSelect;

const wishlistItemInclude = {
  product: { select: productSelect },
} satisfies Prisma.WishlistItemInclude;

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async getWishlist(userId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
      include: { items: { include: wishlistItemInclude, orderBy: { createdAt: 'desc' } } },
    });

    if (!wishlist) {
      return { id: null, userId, createdAt: null, updatedAt: null, items: [], total: 0 };
    }

    return { ...wishlist, total: wishlist.items.length };
  }

  async addItem(userId: string, dto: AddToWishlistDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, isActive: true },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Product not found' },
      });
    }

    const wishlist = await this.prisma.wishlist.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    try {
      const item = await this.prisma.wishlistItem.create({
        data: { wishlistId: wishlist.id, productId: dto.productId },
        include: wishlistItemInclude,
      });

      return {
        message: { title: 'Success', subTitle: 'Product added to wishlist' },
        item,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({
          message: { title: 'Conflict', subTitle: 'Product already in wishlist' },
        });
      }
      throw e;
    }
  }

  async removeItem(userId: string, productId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({ where: { userId } });

    if (!wishlist) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Item not in wishlist' },
      });
    }

    const deleted = await this.prisma.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id, productId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Item not in wishlist' },
      });
    }

    return { message: { title: 'Success', subTitle: 'Product removed from wishlist' } };
  }

  async clear(userId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({ where: { userId } });

    if (wishlist) {
      await this.prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id } });
    }

    return { message: { title: 'Success', subTitle: 'Wishlist cleared' } };
  }
}
