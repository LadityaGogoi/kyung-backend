import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderEventType, OrderStatus } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { REDIS_CLIENT } from '@redis/redis.module';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import type Redis from 'ioredis';
import { InitiatePaymentDto, PaymentMethod, SimulateEventType, SimulateWebhookDto } from './dto';

// Redis TTL for the razorpay order id → db order id mapping (24 h)
const RZP_ORDER_TTL = 60 * 60 * 24;
const rzpKey = (rzpOrderId: string) => `rzp:order:${rzpOrderId}`;

@Injectable()
export class PaymentsService {
  private readonly razorpay: Razorpay;
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.keyId = config.getOrThrow<string>('RAZORPAY_KEY_ID');
    this.keySecret = config.getOrThrow<string>('RAZORPAY_KEY_SECRET');
    this.webhookSecret = config.getOrThrow<string>('RAZORPAY_WEBHOOK_SECRET');
    this.razorpay = new Razorpay({ key_id: this.keyId, key_secret: this.keySecret });
  }

  // ── Initiate payment ───────────────────────────────────────────────────────

  async initiatePayment(userId: string, dto: InitiatePaymentDto) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });

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

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException({
        message: {
          title: 'Bad Request',
          subTitle: `Cannot initiate payment for an order with status ${order.status}`,
        },
      });
    }

    if (dto.paymentMethod === PaymentMethod.COD) {
      return this.confirmCod(order.id, order.userId, order.orderNumber);
    }

    // Amount in paise (INR smallest unit)
    const amountPaise = Math.round(Number(order.total) * 100);

    const rzpOrder = await this.razorpay.orders.create({
      amount: amountPaise,
      currency: order.currency,
      receipt: order.orderNumber,
      notes: { dbOrderId: order.id },
    });

    // Store mapping so the webhook can resolve back to the DB order
    await this.redis.set(rzpKey(rzpOrder.id), order.id, 'EX', RZP_ORDER_TTL);

    return {
      method: 'RAZORPAY' as const,
      razorpayOrderId: rzpOrder.id,
      amount: amountPaise,
      currency: order.currency,
      key: this.keyId,
      orderNumber: order.orderNumber,
    };
  }

  private async confirmCod(orderId: string, userId: string, orderNumber: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CONFIRMED },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          userId,
          type: OrderEventType.PAYMENT_CONFIRMED,
          payload: { method: 'COD' },
        },
      });
    });

    return { method: 'COD' as const, orderNumber };
  }

  // ── Dev simulator ─────────────────────────────────────────────────────────

  async simulateWebhook(dto: SimulateWebhookDto) {
    const payId = `pay_sim_${Date.now()}`;

    const payload =
      dto.event === SimulateEventType.ORDER_PAID
        ? {
            order: { entity: { id: dto.razorpayOrderId, status: 'paid' } },
            payment: { entity: { id: payId, order_id: dto.razorpayOrderId } },
          }
        : {
            payment: {
              entity: {
                id: payId,
                order_id: dto.razorpayOrderId,
                error_code: 'BAD_REQUEST_ERROR',
                error_description: 'Simulated payment failure',
              },
            },
          };

    const body = Buffer.from(JSON.stringify({ event: dto.event, payload }));
    const signature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');

    return this.handleWebhook(body, signature);
  }

  // ── Webhook ────────────────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string) {
    this.verifySignature(rawBody, signature);

    const event = JSON.parse(rawBody.toString()) as { event: string; payload: Record<string, any> };

    switch (event.event) {
      case 'order.paid':
        await this.onOrderPaid(event.payload);
        break;
      case 'payment.failed':
        await this.onPaymentFailed(event.payload);
        break;
      // Other events (order.attempted, refund.*, etc.) are acknowledged but ignored for now
    }

    return { received: true };
  }

  // ── Webhook event handlers ─────────────────────────────────────────────────

  private async onOrderPaid(payload: Record<string, any>) {
    const rzpOrderId: string = payload.order.entity.id;
    const rzpPaymentId: string = payload.payment.entity.id;

    const dbOrderId = await this.redis.get(rzpKey(rzpOrderId));
    if (!dbOrderId) return; // unknown or already processed

    const order = await this.prisma.order.findUnique({ where: { id: dbOrderId } });
    if (!order || order.status !== OrderStatus.PENDING) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: dbOrderId },
        data: { status: OrderStatus.CONFIRMED },
      });

      await tx.orderEvent.create({
        data: {
          orderId: dbOrderId,
          userId: order.userId,
          type: OrderEventType.PAYMENT_CONFIRMED,
          payload: { razorpayOrderId: rzpOrderId, razorpayPaymentId: rzpPaymentId },
        },
      });
    });

    await this.redis.del(rzpKey(rzpOrderId));
  }

  private async onPaymentFailed(payload: Record<string, any>) {
    const entity = payload.payment.entity;
    const rzpOrderId: string = entity.order_id;

    const dbOrderId = await this.redis.get(rzpKey(rzpOrderId));
    if (!dbOrderId) return;

    const order = await this.prisma.order.findUnique({
      where: { id: dbOrderId },
      include: { items: true },
    });
    if (!order || order.status !== OrderStatus.PENDING) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: dbOrderId },
        data: { status: OrderStatus.CANCELLED },
      });

      await tx.orderEvent.create({
        data: {
          orderId: dbOrderId,
          userId: order.userId,
          type: OrderEventType.PAYMENT_FAILED,
          payload: {
            razorpayOrderId: rzpOrderId,
            errorCode: entity.error_code ?? null,
            errorDescription: entity.error_description ?? null,
          },
        },
      });

      // Restore stock on payment failure
      for (const item of order.items) {
        await tx.product.updateMany({
          where: { id: item.productId, trackInventory: true },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    });

    await this.redis.del(rzpKey(rzpOrderId));
  }

  // ── Signature verification ─────────────────────────────────────────────────

  private verifySignature(rawBody: Buffer, signature: string) {
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const expectedBuf = Buffer.from(expected, 'hex');
    const signatureBuf = Buffer.from(signature, 'hex');

    const isValid =
      expectedBuf.length === signatureBuf.length &&
      crypto.timingSafeEqual(expectedBuf, signatureBuf);

    if (!isValid) {
      throw new BadRequestException({
        message: { title: 'Bad Request', subTitle: 'Invalid webhook signature' },
      });
    }
  }
}
