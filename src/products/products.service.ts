import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma, Gender } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '@redis/redis.module';

const PRODUCTS_TTL = 300;   // 5 minutes

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getProducts(opts: {
    page: number;
    limit: number;
    search?: string;
    categoryId?: string;
    subcategoryId?: string;
    gender?: Gender;
    featured?: boolean;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sortBy?: 'newest' | 'price_asc' | 'price_desc';
  }) {
    const cacheKey = `products:cache:${createHash('md5').update(JSON.stringify(opts)).digest('hex')}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as ReturnType<typeof this.queryProducts>;

    const result = await this.queryProducts(opts);
    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', PRODUCTS_TTL);
    return result;
  }

  async invalidateProductCache() {
    const keys = await this.redis.keys('products:cache:*');
    if (keys.length > 0) await this.redis.del(...keys);
  }

  private async queryProducts(opts: {
    page: number;
    limit: number;
    search?: string;
    categoryId?: string;
    subcategoryId?: string;
    gender?: Gender;
    featured?: boolean;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sortBy?: 'newest' | 'price_asc' | 'price_desc';
  }) {
    const { page, limit, search, categoryId, subcategoryId, gender, featured, minPrice, maxPrice, inStock, sortBy = 'newest' } = opts;

    const where: Prisma.ProductWhereInput = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { colour: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (subcategoryId) where.subcategoryId = subcategoryId;
    if (gender) where.gender = gender;
    if (featured) where.isFeatured = true;
    if (inStock) where.stockQuantity = { gt: 0 };
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = { gte: minPrice, lte: maxPrice };
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sortBy === 'price_asc' ? { price: 'asc' } :
      sortBy === 'price_desc' ? { price: 'desc' } :
      { createdAt: 'desc' };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          compareAtPrice: true,
          stockQuantity: true,
          isFeatured: true,
          gender: true,
          colour: true,
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 2 },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { products, total, page, limit };
  }
}
