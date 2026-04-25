import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, OrderStatus } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Users ──────────────────────────────────────────────────────────────────

  async getUsers(page: number, limit: number, search?: string) {
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, name: true, phone: true,
          role: true, avatarUrl: true, emailVerified: true,
          createdAt: true, updatedAt: true,
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, phone: true,
        role: true, avatarUrl: true, emailVerified: true,
        createdAt: true, updatedAt: true,
        addresses: true,
        orders: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { orders: true, reviews: true } },
      },
    });

    if (!user) throw new NotFoundException({ message: { title: 'Not Found', subTitle: 'User not found' } });
    return user;
  }

  async updateUserRole(id: string, role: UserRole) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ message: { title: 'Not Found', subTitle: 'User not found' } });

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true, email: true, name: true, phone: true,
        role: true, avatarUrl: true, emailVerified: true,
        createdAt: true, updatedAt: true,
      },
    });

    return { message: { title: 'Success', subTitle: 'Role updated' }, user: updated };
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ message: { title: 'Not Found', subTitle: 'User not found' } });
    await this.prisma.user.delete({ where: { id } });
    return { message: { title: 'Success', subTitle: 'User deleted' } };
  }

  // ── Products ───────────────────────────────────────────────────────────────

  async getProducts(page: number, limit: number, search?: string) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { sku: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { id: true, name: true } }, images: { take: 1, orderBy: { sortOrder: 'asc' } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { products, total, page, limit };
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { reviews: true, orderItems: true } },
      },
    });
    if (!product) throw new NotFoundException({ message: { title: 'Not Found', subTitle: 'Product not found' } });
    return product;
  }

  async createProduct(dto: {
    name: string; slug: string; description?: string;
    price: number; compareAtPrice?: number; costPerItem?: number;
    sku?: string; barcode?: string;
    trackInventory?: boolean; stockQuantity?: number; lowStockThreshold?: number;
    weight?: number; categoryId?: string; isActive?: boolean; isFeatured?: boolean;
  }) {
    const product = await this.prisma.product.create({ data: dto as any });
    return { message: { title: 'Success', subTitle: 'Product created' }, product };
  }

  async updateProduct(id: string, dto: Partial<{
    name: string; slug: string; description: string;
    price: number; compareAtPrice: number; costPerItem: number;
    sku: string; barcode: string; trackInventory: boolean;
    stockQuantity: number; lowStockThreshold: number; weight: number;
    categoryId: string; isActive: boolean; isFeatured: boolean;
  }>) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ message: { title: 'Not Found', subTitle: 'Product not found' } });

    const product = await this.prisma.product.update({ where: { id }, data: dto as any });
    return { message: { title: 'Success', subTitle: 'Product updated' }, product };
  }

  async deleteProduct(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ message: { title: 'Not Found', subTitle: 'Product not found' } });
    await this.prisma.product.delete({ where: { id } });
    return { message: { title: 'Success', subTitle: 'Product deleted' } };
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  async getOrders(page: number, limit: number, status?: OrderStatus) {
    const where = status ? { status } : {};

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          user: { select: { id: true, email: true, name: true, phone: true } },
          shippingAddress: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map(o => ({
        ...o,
        subtotal: Number(o.subtotal),
        shippingCost: Number(o.shippingCost),
        tax: Number(o.tax),
        discount: Number(o.discount),
        total: Number(o.total),
        items: o.items.map(i => ({ ...i, priceAtPurchase: Number(i.priceAtPurchase) })),
      })),
      total,
      page,
      limit,
    };
  }

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        user: { select: { id: true, email: true, name: true, phone: true } },
        shippingAddress: true,
        billingAddress: true,
        events: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) throw new NotFoundException({ message: { title: 'Not Found', subTitle: 'Order not found' } });
    return {
      ...order,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      tax: Number(order.tax),
      discount: Number(order.discount),
      total: Number(order.total),
      items: order.items.map(i => ({ ...i, priceAtPurchase: Number(i.priceAtPurchase) })),
    };
  }

  async updateOrderStatus(id: string, status: OrderStatus, adminId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException({ message: { title: 'Not Found', subTitle: 'Order not found' } });

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({ where: { id }, data: { status } }),
      this.prisma.orderEvent.create({
        data: {
          orderId: id,
          userId: adminId,
          type: 'STATUS_CHANGED',
          payload: { from: order.status, to: status },
        },
      }),
    ]);

    return {
      message: { title: 'Success', subTitle: 'Order status updated' },
      order: { ...updated, subtotal: Number(updated.subtotal), total: Number(updated.total) },
    };
  }

  // ── Dashboard stats ────────────────────────────────────────────────────────

  async getStats() {
    const [totalUsers, totalOrders, totalProducts, revenueAgg] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.product.count(),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      }),
    ]);

    const ordersByStatus = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    return {
      totalUsers,
      totalOrders,
      totalProducts,
      totalRevenue: Number(revenueAgg._sum.total ?? 0),
      ordersByStatus: ordersByStatus.map(r => ({ status: r.status, count: r._count._all })),
    };
  }
}
