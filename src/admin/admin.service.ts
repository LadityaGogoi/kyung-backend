import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminRequestStatus,
  AdminRequestType,
  OrderStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { can } from '@auth/roles';
import { ProductsService } from '../products/products.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

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
          role: true, avatarUrl: true, emailVerified: true, phoneVerified: true,
          createdAt: true, updatedAt: true,
          _count: { select: { orders: true, reviews: true } },
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
        role: true, avatarUrl: true, emailVerified: true, phoneVerified: true,
        createdAt: true, updatedAt: true,
        addresses: true,
        orders: {
          include: { items: true, shippingAddress: true },
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          include: { product: { select: { id: true, name: true, slug: true } }, images: true },
          orderBy: { createdAt: 'desc' },
        },
        cart: {
          include: {
            items: {
              include: { product: { select: { id: true, name: true, slug: true, price: true, images: { take: 1 } } } },
            },
          },
        },
        wishlist: {
          include: {
            items: {
              include: { product: { select: { id: true, name: true, slug: true, price: true, images: { take: 1 } } } },
            },
          },
        },
        _count: { select: { orders: true, reviews: true } },
      },
    });

    if (!user) throw new NotFoundException({ message: { title: 'Not Found', subTitle: 'User not found' } });

    return {
      ...user,
      orders: user.orders.map(o => ({
        ...o,
        subtotal: Number(o.subtotal),
        shippingCost: Number(o.shippingCost),
        tax: Number(o.tax),
        discount: Number(o.discount),
        total: Number(o.total),
        items: o.items.map(i => ({ ...i, priceAtPurchase: Number(i.priceAtPurchase) })),
      })),
    };
  }

  // Only MASTER_ADMIN can promote to ADMIN/MASTER_ADMIN or demote from ADMIN/MASTER_ADMIN
  // Regular ADMIN can only change between DEVELOPER/TESTER/CUSTOMER via a request
  async updateUserRole(actorRole: UserRole, targetId: string, newRole: UserRole) {
    const target = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException({ message: { title: 'Not Found', subTitle: 'User not found' } });

    const isElevation = can(newRole, 'PROTECTED_ROLES');
    const isFromProtected = can(target.role, 'PROTECTED_ROLES');

    if ((isElevation || isFromProtected) && !can(actorRole, 'CAN_ASSIGN_ROLE')) {
      throw new ForbiddenException({
        message: { title: 'Forbidden', subTitle: 'Only Master Admin can assign or remove Admin roles' },
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { role: newRole },
      select: {
        id: true, email: true, name: true, phone: true,
        role: true, avatarUrl: true, emailVerified: true, phoneVerified: true,
        createdAt: true, updatedAt: true,
      },
    });

    return { message: { title: 'Success', subTitle: 'Role updated' }, user: updated };
  }

  async updateUser(
    id: string,
    dto: Partial<{ name: string; phone: string; email: string; emailVerified: boolean; phoneVerified: boolean }>,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ message: { title: 'Not Found', subTitle: 'User not found' } });

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true, email: true, name: true, phone: true,
        role: true, avatarUrl: true, emailVerified: true, phoneVerified: true,
        createdAt: true, updatedAt: true,
      },
    });
    return { message: { title: 'Success', subTitle: 'User updated' }, user: updated };
  }

  async deleteUser(actorRole: UserRole, id: string) {
    if (!can(actorRole, 'CAN_APPROVE')) {
      throw new ForbiddenException({
        message: { title: 'Forbidden', subTitle: 'Only Master Admin can delete users' },
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ message: { title: 'Not Found', subTitle: 'User not found' } });

    await this.prisma.user.delete({ where: { id } });
    return { message: { title: 'Success', subTitle: 'User deleted' } };
  }

  // ── Admin Requests ─────────────────────────────────────────────────────────

  async getAdminRequests(page: number, limit: number, status?: AdminRequestStatus) {
    const where = status ? { status } : {};
    const [requests, total] = await Promise.all([
      this.prisma.adminRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requestedBy: { select: { id: true, name: true, email: true, role: true } },
          approvedBy: { select: { id: true, name: true, email: true } },
        },
        // targetProductId and targetOrderId are returned as plain fields
      }),
      this.prisma.adminRequest.count({ where }),
    ]);
    return { requests, total, page, limit };
  }

  async createAdminRequest(
    requesterId: string,
    type: AdminRequestType,
    opts: {
      targetUserId?: string;
      targetRole?: UserRole;
      targetProductId?: string;
      targetOrderId?: string;
      payload?: Record<string, unknown>;
      reason?: string;
    },
  ) {
    const { targetUserId, targetRole, targetProductId, targetOrderId, payload, reason } = opts;

    if (type === AdminRequestType.ROLE_CHANGE && !targetRole) {
      throw new BadRequestException({ message: { title: 'Bad Request', subTitle: 'targetRole required for ROLE_CHANGE' } });
    }
    if ((type === AdminRequestType.ROLE_CHANGE || type === AdminRequestType.DELETE_USER || type === AdminRequestType.EDIT_USER) && !targetUserId) {
      throw new BadRequestException({ message: { title: 'Bad Request', subTitle: 'targetUserId required for user requests' } });
    }
    if (type === AdminRequestType.EDIT_USER && !payload) {
      throw new BadRequestException({ message: { title: 'Bad Request', subTitle: 'payload required for EDIT_USER' } });
    }
    if ((type === AdminRequestType.EDIT_PRODUCT || type === AdminRequestType.DELETE_PRODUCT) && !targetProductId) {
      throw new BadRequestException({ message: { title: 'Bad Request', subTitle: 'targetProductId required for product requests' } });
    }
    if ((type === AdminRequestType.EDIT_PRODUCT || type === AdminRequestType.CREATE_PRODUCT) && !payload) {
      throw new BadRequestException({ message: { title: 'Bad Request', subTitle: 'payload required for EDIT_PRODUCT / CREATE_PRODUCT' } });
    }
    if (type === AdminRequestType.UPDATE_ORDER_STATUS && (!targetOrderId || !payload?.status)) {
      throw new BadRequestException({ message: { title: 'Bad Request', subTitle: 'targetOrderId and payload.status required for UPDATE_ORDER_STATUS' } });
    }
    if (type === AdminRequestType.EDIT_ORDER && (!targetOrderId || !payload)) {
      throw new BadRequestException({ message: { title: 'Bad Request', subTitle: 'targetOrderId and payload required for EDIT_ORDER' } });
    }

    // Prevent duplicate pending requests for same target (CREATE_PRODUCT has no target, skip)
    const existingWhere =
      targetUserId ? { targetUserId, status: AdminRequestStatus.PENDING } :
      targetProductId ? { targetProductId, status: AdminRequestStatus.PENDING } :
      targetOrderId ? { targetOrderId, status: AdminRequestStatus.PENDING } :
      null;

    if (existingWhere) {
      const existing = await this.prisma.adminRequest.findFirst({ where: existingWhere as object });
      if (existing) throw new BadRequestException({ message: { title: 'Conflict', subTitle: 'A pending request already exists for this target' } });
    }

    const request = await this.prisma.adminRequest.create({
      data: { type, targetUserId, targetRole, targetProductId, targetOrderId, payload: payload !== undefined ? (payload as Prisma.InputJsonValue) : Prisma.DbNull, reason, requestedById: requesterId },
      include: { requestedBy: { select: { id: true, name: true, email: true } } },
    });

    return { message: { title: 'Success', subTitle: 'Request submitted' }, request };
  }

  async resolveAdminRequest(
    approverId: string,
    approverRole: UserRole,
    requestId: string,
    status: 'APPROVED' | 'REJECTED',
  ) {
    if (!can(approverRole, 'CAN_APPROVE')) {
      throw new ForbiddenException({
        message: { title: 'Forbidden', subTitle: 'Only Master Admin can approve or reject requests' },
      });
    }

    const req = await this.prisma.adminRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException({ message: { title: 'Not Found', subTitle: 'Request not found' } });
    if (req.status !== AdminRequestStatus.PENDING) {
      throw new BadRequestException({ message: { title: 'Bad Request', subTitle: 'Request already resolved' } });
    }

    const updated = await this.prisma.$transaction(async tx => {
      const resolved = await tx.adminRequest.update({
        where: { id: requestId },
        data: { status, approvedById: approverId, approvedAt: new Date() },
      });

      if (status === AdminRequestStatus.APPROVED) {
        if (req.type === AdminRequestType.ROLE_CHANGE && req.targetRole && req.targetUserId) {
          await tx.user.update({ where: { id: req.targetUserId }, data: { role: req.targetRole } });
        } else if (req.type === AdminRequestType.DELETE_USER && req.targetUserId) {
          await tx.user.delete({ where: { id: req.targetUserId } });
        } else if (req.type === AdminRequestType.EDIT_USER && req.targetUserId && req.payload) {
          await tx.user.update({ where: { id: req.targetUserId }, data: req.payload as object });
        } else if (req.type === AdminRequestType.CREATE_PRODUCT && req.payload) {
          const { images: imgList, ...productFields } = req.payload as Record<string, unknown>;
          const product = await tx.product.create({ data: productFields as any });
          if (Array.isArray(imgList) && imgList.length > 0) {
            await tx.productImage.createMany({
              data: (imgList as { url: string; publicId: string; alt?: string }[]).map((img, i) => ({
                productId: product.id,
                url: img.url,
                publicId: img.publicId,
                alt: img.alt ?? null,
                sortOrder: i,
              })),
            });
          }
        } else if (req.type === AdminRequestType.EDIT_PRODUCT && req.targetProductId && req.payload) {
          await tx.product.update({ where: { id: req.targetProductId }, data: req.payload as object });
        } else if (req.type === AdminRequestType.DELETE_PRODUCT && req.targetProductId) {
          await tx.product.delete({ where: { id: req.targetProductId } });
        } else if (req.type === AdminRequestType.UPDATE_ORDER_STATUS && req.targetOrderId && req.payload) {
          const p = req.payload as { status: OrderStatus };
          await tx.order.update({ where: { id: req.targetOrderId }, data: { status: p.status } });
          await tx.orderEvent.create({
            data: { orderId: req.targetOrderId, userId: approverId, type: 'STATUS_CHANGED', payload: { via: 'employee_request', to: p.status } },
          });
        } else if (req.type === AdminRequestType.EDIT_ORDER && req.targetOrderId && req.payload) {
          const { status: _s, ...orderFields } = req.payload as Record<string, unknown>;
          await tx.order.update({ where: { id: req.targetOrderId }, data: orderFields });
          await tx.orderEvent.create({
            data: { orderId: req.targetOrderId, userId: approverId, type: 'NOTE_ADDED', payload: { via: 'employee_request', action: 'fields_updated', fields: Object.keys(orderFields) } },
          });
        }
      }

      return resolved;
    });

    // Invalidate product cache for any approved product mutation
    if (
      status === AdminRequestStatus.APPROVED &&
      (req.type === AdminRequestType.CREATE_PRODUCT ||
        req.type === AdminRequestType.EDIT_PRODUCT ||
        req.type === AdminRequestType.DELETE_PRODUCT)
    ) {
      await this.productsService.invalidateProductCache();
    }

    return { message: { title: 'Success', subTitle: `Request ${status.toLowerCase()}` }, request: updated };
  }

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

  async updateOrder(
    id: string,
    dto: Partial<{ subtotal: number; shippingCost: number; tax: number; discount: number; total: number; notes: string }>,
    adminId: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException({ message: { title: 'Not Found', subTitle: 'Order not found' } });

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({ where: { id }, data: dto }),
      this.prisma.orderEvent.create({
        data: { orderId: id, userId: adminId, type: 'NOTE_ADDED', payload: { action: 'fields_updated', fields: Object.keys(dto) } },
      }),
    ]);

    return {
      message: { title: 'Success', subTitle: 'Order updated' },
      order: { ...updated, subtotal: Number(updated.subtotal), shippingCost: Number(updated.shippingCost), tax: Number(updated.tax), discount: Number(updated.discount), total: Number(updated.total) },
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

    const [ordersByStatus, pendingRequests] = await Promise.all([
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.adminRequest.count({ where: { status: AdminRequestStatus.PENDING } }),
    ]);

    return {
      totalUsers,
      totalOrders,
      totalProducts,
      totalRevenue: Number(revenueAgg._sum.total ?? 0),
      ordersByStatus: ordersByStatus.map(r => ({ status: r.status, count: r._count._all })),
      pendingRequests,
    };
  }

}
