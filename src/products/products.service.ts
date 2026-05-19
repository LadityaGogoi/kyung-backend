import {
  BadRequestException,
  ConflictException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Gender, Prisma } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '@redis/redis.module';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  AdjustInventoryDto,
  CreateProductDto,
  ListProductsQueryDto,
  ListProductsStaffQueryDto,
  SetProductImagesDto,
  UpdateProductDto,
} from './dto';

const PRODUCTS_TTL = 300;

function num(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  return v;
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async getProducts(query: ListProductsQueryDto) {
    const opts = {
      page: query.page ?? 1,
      limit: query.limit ?? 24,
      search: query.search,
      categoryId: query.categoryId,
      subcategoryId: query.subcategoryId,
      gender: query.gender,
      featured: query.featured === true,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      inStock: query.inStock === true,
      sortBy: query.sortBy ?? 'newest',
    };

    const cacheKey = `products:cache:${createHash('md5').update(JSON.stringify(opts)).digest('hex')}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as Awaited<ReturnType<typeof this.queryProducts>>;

    const result = await this.queryProducts(opts);
    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', PRODUCTS_TTL);
    return result;
  }

  async invalidateProductCache() {
    const keys = await this.redis.keys('products:cache:*');
    if (keys.length > 0) await this.redis.del(...keys);
  }

  async listFlatForStaff(query: ListProductsStaffQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search;

    const where: Prisma.ProductWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products: rows.map(p => this.serializeStaffListRow(p)),
      total,
      page,
      limit,
    };
  }

  async getProductBySlugPublic(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, isActive: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!product) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Product not found' },
      });
    }
    return this.serializePublicDetail(product);
  }

  async getPopularProductsPublic(limit: number) {
    const rows = await this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ orderItems: { _count: 'desc' } }, { createdAt: 'desc' }],
      take: limit,
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
    });

    return {
      products: rows.map(p => this.serializeListItem(p)),
      total: rows.length,
      page: 1,
      limit,
    };
  }

  async getProductStaffById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { reviews: true, orderItems: true } },
      },
    });
    if (!product) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Product not found' },
      });
    }
    return this.serializeStaffDetail(product);
  }

  async createProduct(dto: CreateProductDto) {
    await this.assertCategoryRefs(dto.categoryId, dto.subcategoryId);

    const slug = await this.ensureUniqueSlug(this.slugify(dto.slug ?? dto.name));

    const data: Prisma.ProductCreateInput = {
      name: dto.name,
      slug,
      description: dto.description ?? null,
      price: dto.price,
      compareAtPrice: dto.compareAtPrice ?? null,
      costPerItem: dto.costPerItem ?? null,
      sku: dto.sku ?? null,
      barcode: dto.barcode ?? null,
      trackInventory: dto.trackInventory ?? true,
      stockQuantity: dto.stockQuantity ?? 0,
      lowStockThreshold: dto.lowStockThreshold ?? 0,
      weight: dto.weight ?? null,
      gender: dto.gender ?? null,
      colour: dto.colour ?? null,
      isActive: dto.isActive ?? true,
      isFeatured: dto.isFeatured ?? false,
    };

    if (dto.categoryId) data.category = { connect: { id: dto.categoryId } };
    if (dto.subcategoryId) data.subcategory = { connect: { id: dto.subcategoryId } };

    try {
      const product = await this.prisma.product.create({
        data,
        include: { category: true, subcategory: true, images: true },
      });
      await this.invalidateProductCache();
      return {
        message: { title: 'Success', subTitle: 'Product created' },
        product: this.serializeEntity(product),
      };
    } catch (e) {
      this.rethrowUnique(e);
      throw e;
    }
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Product not found' },
      });
    }

    await this.assertCategoryRefs(dto.categoryId, dto.subcategoryId);

    let slug: string | undefined;
    if (dto.slug !== undefined) {
      slug = await this.ensureUniqueSlug(this.slugify(dto.slug), id);
    } else if (dto.name !== undefined && dto.slug === undefined) {
      // keep slug unless explicitly changed
    }

    const data: Prisma.ProductUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (slug !== undefined) data.slug = slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.compareAtPrice !== undefined) data.compareAtPrice = dto.compareAtPrice;
    if (dto.costPerItem !== undefined) data.costPerItem = dto.costPerItem;
    if (dto.sku !== undefined) data.sku = dto.sku;
    if (dto.barcode !== undefined) data.barcode = dto.barcode;
    if (dto.trackInventory !== undefined) data.trackInventory = dto.trackInventory;
    if (dto.stockQuantity !== undefined) data.stockQuantity = dto.stockQuantity;
    if (dto.lowStockThreshold !== undefined) data.lowStockThreshold = dto.lowStockThreshold;
    if (dto.weight !== undefined) data.weight = dto.weight;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.colour !== undefined) data.colour = dto.colour;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;

    if (dto.categoryId !== undefined) {
      data.category = dto.categoryId ? { connect: { id: dto.categoryId } } : { disconnect: true };
    }
    if (dto.subcategoryId !== undefined) {
      data.subcategory = dto.subcategoryId
        ? { connect: { id: dto.subcategoryId } }
        : { disconnect: true };
    }

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data,
        include: { category: true, subcategory: true, images: true },
      });
      await this.invalidateProductCache();
      return {
        message: { title: 'Success', subTitle: 'Product updated' },
        product: this.serializeEntity(product),
      };
    } catch (e) {
      this.rethrowUnique(e);
      throw e;
    }
  }

  async setProductImages(id: string, dto: SetProductImagesDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Product not found' },
      });
    }

    const previous = await this.prisma.productImage.findMany({
      where: { productId: id },
      select: { publicId: true },
    });

    await this.prisma.$transaction([
      this.prisma.productImage.deleteMany({ where: { productId: id } }),
      ...dto.images.map((img, i) =>
        this.prisma.productImage.create({
          data: {
            productId: id,
            url: img.url,
            publicId: img.publicId,
            alt: img.alt ?? null,
            sortOrder: i,
          },
        }),
      ),
    ]);

    const kept = new Set(dto.images.map(i => i.publicId));
    for (const row of previous) {
      if (!kept.has(row.publicId)) {
        try {
          await this.cloudinary.delete(row.publicId);
        } catch {
          /* best-effort cleanup */
        }
      }
    }

    await this.invalidateProductCache();
    return { message: { title: 'Success', subTitle: 'Images updated' } };
  }

  async adjustInventory(id: string, dto: AdjustInventoryDto) {
    const hasSet = dto.stockQuantity !== undefined;
    const hasDelta = dto.delta !== undefined;
    if (hasSet && hasDelta) {
      throw new BadRequestException({
        message: {
          title: 'Bad Request',
          subTitle: 'Use either stockQuantity (absolute) or delta (relative), not both',
        },
      });
    }

    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Product not found' },
      });
    }

    const data: Prisma.ProductUpdateInput = {};
    if (dto.lowStockThreshold !== undefined) data.lowStockThreshold = dto.lowStockThreshold;
    if (dto.trackInventory !== undefined) data.trackInventory = dto.trackInventory;

    if (hasSet) {
      if (dto.stockQuantity! < 0) {
        throw new BadRequestException({
          message: { title: 'Bad Request', subTitle: 'Stock cannot be negative' },
        });
      }
      data.stockQuantity = dto.stockQuantity;
    } else if (hasDelta) {
      const next = product.stockQuantity + dto.delta!;
      if (next < 0) {
        throw new BadRequestException({
          message: { title: 'Bad Request', subTitle: 'Stock cannot be negative' },
        });
      }
      data.stockQuantity = next;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException({
        message: {
          title: 'Bad Request',
          subTitle: 'Provide stockQuantity, delta, lowStockThreshold, and/or trackInventory',
        },
      });
    }

    const updated = await this.prisma.product.update({ where: { id }, data });
    await this.invalidateProductCache();

    return {
      message: { title: 'Success', subTitle: 'Inventory updated' },
      stockQuantity: updated.stockQuantity,
      trackInventory: updated.trackInventory,
      lowStockThreshold: updated.lowStockThreshold,
    };
  }

  async deleteProduct(id: string) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { images: { select: { publicId: true } } },
    });
    if (!existing) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Product not found' },
      });
    }

    await this.prisma.product.delete({ where: { id } });
    await this.invalidateProductCache();

    for (const img of existing.images) {
      try {
        await this.cloudinary.delete(img.publicId);
      } catch {
        /* best-effort */
      }
    }

    return { message: { title: 'Success', subTitle: 'Product deleted' } };
  }

  /** Decrement stock when fulfilling an order line (throws if insufficient). */
  async decrementStock(productId: string, quantity: number) {
    if (quantity <= 0) return;
    const result = await this.prisma.product.updateMany({
      where: {
        id: productId,
        trackInventory: true,
        stockQuantity: { gte: quantity },
      },
      data: { stockQuantity: { decrement: quantity } },
    });
    if (result.count === 0) {
      const p = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { trackInventory: true, stockQuantity: true, name: true },
      });
      if (!p) {
        throw new NotFoundException({
          message: { title: 'Not Found', subTitle: 'Product not found' },
        });
      }
      if (!p.trackInventory) return;
      throw new BadRequestException({
        message: {
          title: 'Bad Request',
          subTitle: `Insufficient stock for "${p.name}"`,
        },
      });
    }
    await this.invalidateProductCache();
  }

  /** Restore stock after order cancellation (best-effort). */
  async incrementStock(productId: string, quantity: number) {
    if (quantity <= 0) return;
    await this.prisma.product.updateMany({
      where: { id: productId, trackInventory: true },
      data: { stockQuantity: { increment: quantity } },
    });
    await this.invalidateProductCache();
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
    sortBy: 'newest' | 'price_asc' | 'price_desc';
  }) {
    const { page, limit, search, categoryId, subcategoryId, gender, featured, minPrice, maxPrice, inStock, sortBy } =
      opts;

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
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sortBy === 'price_asc'
        ? { price: 'asc' }
        : sortBy === 'price_desc'
          ? { price: 'desc' }
          : { createdAt: 'desc' };

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

    return {
      products: products.map(p => this.serializeListItem(p)),
      total,
      page,
      limit,
    };
  }

  private serializeListItem(
    p: {
      id: string;
      name: string;
      slug: string;
      price: number;
      compareAtPrice: number | null;
      stockQuantity: number;
      isFeatured: boolean;
      gender: Gender | null;
      colour: string | null;
      category: { id: string; name: string; slug: string } | null;
      subcategory: { id: string; name: string; slug: string } | null;
      images: { id: string; url: string; publicId: string; alt: string | null; sortOrder: number }[];
    },
  ) {
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: num(p.price)!,
      compareAtPrice: num(p.compareAtPrice),
      stockQuantity: p.stockQuantity,
      isFeatured: p.isFeatured,
      gender: p.gender,
      colour: p.colour,
      category: p.category,
      subcategory: p.subcategory,
      images: p.images.map(i => ({
        id: i.id,
        url: i.url,
        publicId: i.publicId,
        alt: i.alt,
        sortOrder: i.sortOrder,
      })),
    };
  }

  private serializePublicDetail(
    p: Prisma.ProductGetPayload<{
      include: {
        category: { select: { id: true; name: true; slug: true } };
        subcategory: { select: { id: true; name: true; slug: true } };
        images: true;
      };
    }>,
  ) {
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: num(p.price)!,
      compareAtPrice: num(p.compareAtPrice),
      sku: p.sku,
      stockQuantity: p.stockQuantity,
      trackInventory: p.trackInventory,
      lowStockThreshold: p.lowStockThreshold,
      gender: p.gender,
      colour: p.colour,
      isFeatured: p.isFeatured,
      category: p.category,
      subcategory: p.subcategory,
      images: p.images.map(i => ({
        id: i.id,
        url: i.url,
        publicId: i.publicId,
        alt: i.alt,
        sortOrder: i.sortOrder,
      })),
    };
  }

  private serializeStaffDetail(
    p: Prisma.ProductGetPayload<{
      include: {
        category: { select: { id: true; name: true; slug: true } };
        subcategory: { select: { id: true; name: true; slug: true } };
        images: true;
        _count: { select: { reviews: true; orderItems: true } };
      };
    }>,
  ) {
    const base = this.serializePublicDetail(p);
    return {
      ...base,
      isActive: p.isActive,
      costPerItem: num(p.costPerItem),
      barcode: p.barcode,
      weight: num(p.weight),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      reviewsCount: p._count.reviews,
      orderItemsCount: p._count.orderItems,
    };
  }

  private serializeStaffListRow(
    p: Prisma.ProductGetPayload<{
      include: {
        category: { select: { id: true; name: true; slug: true } };
        subcategory: { select: { id: true; name: true; slug: true } };
        images: true;
      };
    }>,
  ) {
    return {
      ...this.serializeEntity(p),
      category: p.category,
      subcategory: p.subcategory,
      images: p.images.map(i => ({
        id: i.id,
        url: i.url,
        publicId: i.publicId,
        alt: i.alt,
        sortOrder: i.sortOrder,
      })),
    };
  }

  private serializeEntity(p: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    compareAtPrice: number | null;
    costPerItem: number | null;
    sku: string | null;
    barcode: string | null;
    trackInventory: boolean;
    stockQuantity: number;
    lowStockThreshold: number;
    weight: number | null;
    categoryId: string | null;
    subcategoryId: string | null;
    gender: Gender | null;
    colour: string | null;
    isActive: boolean;
    isFeatured: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: num(p.price)!,
      compareAtPrice: num(p.compareAtPrice),
      costPerItem: num(p.costPerItem),
      sku: p.sku,
      barcode: p.barcode,
      trackInventory: p.trackInventory,
      stockQuantity: p.stockQuantity,
      lowStockThreshold: p.lowStockThreshold,
      weight: num(p.weight),
      categoryId: p.categoryId,
      subcategoryId: p.subcategoryId,
      gender: p.gender,
      colour: p.colour,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private async assertCategoryRefs(categoryId?: string, subcategoryId?: string) {
    if (categoryId) {
      const c = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!c) {
        throw new NotFoundException({
          message: { title: 'Not Found', subTitle: 'Category not found' },
        });
      }
    }
    if (subcategoryId) {
      const s = await this.prisma.category.findUnique({ where: { id: subcategoryId } });
      if (!s) {
        throw new NotFoundException({
          message: { title: 'Not Found', subTitle: 'Subcategory not found' },
        });
      }
    }
  }

  private slugify(raw: string): string {
    return (
      raw
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'product'
    );
  }

  private async ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let n = 0;
    for (;;) {
      const found = await this.prisma.product.findUnique({ where: { slug } });
      if (!found || found.id === excludeId) return slug;
      n += 1;
      slug = `${base}-${n}`;
    }
  }

  private rethrowUnique(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ConflictException({
        message: { title: 'Conflict', subTitle: 'Slug or SKU already exists' },
      });
    }
  }
}
