import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderEventType, OrderStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { RoleGroups } from '@auth/roles';
import {
  CreateOrderDto,
  ListOrdersAdminQueryDto,
  ListOrdersQueryDto,
  UpdateOrderStatusDto,
} from './dto';

// Terminal statuses: stock is not decremented here / has already been reversed
const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
];

const orderItemInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      images: {
        select: { id: true, url: true, alt: true },
        orderBy: { sortOrder: 'asc' as const },
        take: 1,
      },
    },
  },
} satisfies Prisma.OrderItemInclude;

const orderInclude = {
  items: { include: orderItemInclude, orderBy: { createdAt: 'asc' as const } },
  shippingAddress: true,
  billingAddress: true,
  events: {
    orderBy: { createdAt: 'asc' as const },
    include: { user: { select: { id: true, name: true, email: true } } },
  },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create order ────────────────────────────────────────────────────────────

  async createOrder(userId: string, dto: CreateOrderDto) {
    // Validate shipping address belongs to user
    const shippingAddress = await this.prisma.address.findFirst({
      where: { id: dto.shippingAddressId, userId },
    });
    if (!shippingAddress) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Shipping address not found' },
      });
    }

    if (dto.billingAddressId) {
      const billingAddress = await this.prisma.address.findFirst({
        where: { id: dto.billingAddressId, userId },
      });
      if (!billingAddress) {
        throw new NotFoundException({
          message: { title: 'Not Found', subTitle: 'Billing address not found' },
        });
      }
    }

    // Load cart with product details
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                isActive: true,
                trackInventory: true,
                stockQuantity: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException({
        message: { title: 'Bad Request', subTitle: 'Cart is empty' },
      });
    }

    // Validate every item upfront before touching the DB
    for (const item of cart.items) {
      if (!item.product.isActive) {
        throw new BadRequestException({
          message: {
            title: 'Bad Request',
            subTitle: `"${item.product.name}" is no longer available`,
          },
        });
      }
      if (item.product.trackInventory && item.product.stockQuantity < item.quantity) {
        throw new BadRequestException({
          message: {
            title: 'Bad Request',
            subTitle: `Insufficient stock for "${item.product.name}" (available: ${item.product.stockQuantity})`,
          },
        });
      }
    }

    // Calculate totals using Decimal arithmetic
    const subtotal = cart.items.reduce(
      (sum, item) => sum.add(item.product.price.mul(item.quantity)),
      new Prisma.Decimal(0),
    );
    const shippingCost = new Prisma.Decimal(0); // placeholder — wire up shipping provider here
    const tax = new Prisma.Decimal(0);           // placeholder — wire up GST/tax engine here
    const discount = new Prisma.Decimal(0);      // placeholder — wire up coupon system here
    const total = subtotal.add(shippingCost).add(tax).sub(discount);

    // Run order creation + stock decrement + cart clear atomically
    let order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
    let attempts = 0;

    while (true) {
      try {
        order = await this.prisma.$transaction(
          async (tx) => {
            const orderNumber = await this.generateOrderNumber(tx);

            const newOrder = await tx.order.create({
              data: {
                orderNumber,
                userId,
                status: OrderStatus.PENDING,
                subtotal,
                shippingCost,
                tax,
                discount,
                total,
                currency: 'INR',
                shippingAddressId: dto.shippingAddressId,
                billingAddressId: dto.billingAddressId ?? null,
                notes: dto.notes ?? null,
                items: {
                  create: cart.items.map((item) => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                    priceAtPurchase: item.product.price,
                    productName: item.product.name,
                    productSku: item.product.sku ?? null,
                  })),
                },
              },
              include: orderInclude,
            });

            // Decrement stock for each tracked product inside the transaction
            for (const item of cart.items) {
              if (!item.product.trackInventory) continue;
              const result = await tx.product.updateMany({
                where: {
                  id: item.product.id,
                  trackInventory: true,
                  stockQuantity: { gte: item.quantity },
                },
                data: { stockQuantity: { decrement: item.quantity } },
              });
              if (result.count === 0) {
                // Re-read current stock to give an accurate error message
                const fresh = await tx.product.findUnique({
                  where: { id: item.product.id },
                  select: { name: true, stockQuantity: true },
                });
                throw new BadRequestException({
                  message: {
                    title: 'Bad Request',
                    subTitle: `Insufficient stock for "${fresh?.name ?? item.product.name}"`,
                  },
                });
              }
            }

            // Record ORDER_PLACED event
            await tx.orderEvent.create({
              data: {
                orderId: newOrder.id,
                userId,
                type: OrderEventType.ORDER_PLACED,
                payload: { orderNumber, total: total.toNumber() },
              },
            });

            // Clear cart inside the transaction so it rolls back if order creation fails
            await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

            return newOrder;
          },
          { timeout: 15_000 },
        );
        break; // success
      } catch (e) {
        // Retry only on orderNumber unique constraint collision (concurrent orders)
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002' &&
          ++attempts < 5
        ) {
          continue;
        }
        throw e;
      }
    }

    return {
      message: { title: 'Success', subTitle: 'Order placed successfully' },
      order: this.serializeOrder(order!),
    };
  }

  // ── Customer order list ──────────────────────────────────────────────────────

  async listMyOrders(userId: string, query: ListOrdersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.OrderWhereInput = { userId };
    if (query.status) where.status = query.status;

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { items: true } },
          items: {
            select: {
              id: true,
              productName: true,
              productSku: true,
              quantity: true,
              priceAtPurchase: true,
              product: {
                select: {
                  slug: true,
                  images: {
                    select: { url: true, alt: true },
                    orderBy: { sortOrder: 'asc' as const },
                    take: 1,
                  },
                },
              },
            },
            orderBy: { createdAt: 'asc' as const },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: rows.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: Number(o.total),
        currency: o.currency,
        itemCount: o._count.items,
        items: o.items.map((i) => ({ ...i, priceAtPurchase: Number(i.priceAtPurchase) })),
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
      total,
      page,
      limit,
    };
  }

  // ── Admin order list ─────────────────────────────────────────────────────────

  async listOrdersAdmin(query: ListOrdersAdminQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.OrderWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.userId) where.userId = query.userId;
    if (query.search) {
      where.orderNumber = { contains: query.search, mode: 'insensitive' };
    }

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: rows.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: Number(o.total),
        currency: o.currency,
        itemCount: o._count.items,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
      total,
      page,
      limit,
    };
  }

  // ── Get order detail ─────────────────────────────────────────────────────────

  async getOrderById(id: string, requestingUserId: string | null) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });

    if (!order) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Order not found' },
      });
    }

    // Customers can only see their own orders
    if (requestingUserId !== null && order.userId !== requestingUserId) {
      throw new ForbiddenException({
        message: { title: 'Forbidden', subTitle: 'You do not have access to this order' },
      });
    }

    return this.serializeOrder(order);
  }

  // ── Update status (admin) ────────────────────────────────────────────────────

  async updateStatus(id: string, dto: UpdateOrderStatusDto, actorId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Order not found' },
      });
    }

    if (order.status === dto.status) {
      throw new BadRequestException({
        message: { title: 'Bad Request', subTitle: 'Order is already in this status' },
      });
    }

    const wasTerminal = TERMINAL_STATUSES.includes(order.status);
    if (wasTerminal) {
      throw new BadRequestException({
        message: {
          title: 'Bad Request',
          subTitle: `Cannot change status of a ${order.status.toLowerCase()} order`,
        },
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id },
        data: { status: dto.status },
        include: orderInclude,
      });

      await tx.orderEvent.create({
        data: {
          orderId: id,
          userId: actorId,
          type: OrderEventType.STATUS_CHANGED,
          payload: {
            oldStatus: order.status,
            newStatus: dto.status,
            ...(dto.note ? { note: dto.note } : {}),
          },
        },
      });

      // Restore stock when admin moves order to a terminal cancellation state
      if (dto.status === OrderStatus.CANCELLED || dto.status === OrderStatus.REFUNDED) {
        for (const item of await tx.orderItem.findMany({ where: { orderId: id } })) {
          await tx.product.updateMany({
            where: { id: item.productId, trackInventory: true },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
      }

      return result;
    });

    return {
      message: { title: 'Success', subTitle: 'Order status updated' },
      order: this.serializeOrder(updated),
    };
  }

  // ── Cancel order (customer) ──────────────────────────────────────────────────

  async cancelOrder(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Order not found' },
      });
    }

    if (order.userId !== userId) {
      throw new ForbiddenException({
        message: { title: 'Forbidden', subTitle: 'You do not have access to this order' },
      });
    }

    const cancellableStatuses: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException({
        message: {
          title: 'Bad Request',
          subTitle: 'Only pending or confirmed orders can be cancelled',
        },
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
      });

      await tx.orderEvent.create({
        data: {
          orderId: id,
          userId,
          type: OrderEventType.CANCELLED,
          payload: { cancelledBy: 'customer' },
        },
      });

      // Restore stock
      for (const item of order.items) {
        await tx.product.updateMany({
          where: { id: item.productId, trackInventory: true },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    });

    return { message: { title: 'Success', subTitle: 'Order cancelled successfully' } };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async generateOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
    const BASE = 10001;
    const last = await tx.order.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true },
    });
    if (!last) return `KY-${BASE}`;
    const match = last.orderNumber.match(/^KY-(\d+)$/);
    if (!match) return `KY-${BASE}`;
    return `KY-${parseInt(match[1], 10) + 1}`;
  }

  /** True if user has STAFF-level access (can view any order). */
  isStaff(role: UserRole): boolean {
    return (RoleGroups.STAFF as readonly UserRole[]).includes(role);
  }

  private serializeOrder(
    order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>,
  ) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      tax: Number(order.tax),
      discount: Number(order.discount),
      total: Number(order.total),
      currency: order.currency,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        product: item.product,
        quantity: item.quantity,
        priceAtPurchase: Number(item.priceAtPurchase),
        productName: item.productName,
        productSku: item.productSku,
      })),
      events: order.events.map((e) => ({
        id: e.id,
        type: e.type,
        payload: e.payload,
        createdAt: e.createdAt,
        actor: e.user ? { id: e.user.id, name: e.user.name, email: e.user.email } : null,
      })),
    };
  }
}
