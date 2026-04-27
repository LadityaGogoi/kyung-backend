import { Injectable } from '@nestjs/common';
import { Prisma, Gender } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getCategories() {
    return this.prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }
}
