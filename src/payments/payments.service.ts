import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order, OrderEventType, OrderStatus } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { InitiatePaymentDto, SimulateEventType, SimulateWebhookDto } from './dto';

@Injectable()
export class PaymentsService {
  private readonly razorpay: Razorpay;
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.keyId = config.getOrThrow<string>('RAZORPAY_KEY_ID');
    this.keySecret = config.getOrThrow<string>('RAZORPAY_KEY_SECRET');
    this.webhookSecret = config.getOrThrow<string>('RAZORPAY_WEBHOOK_SECRET');
    this.razorpay = new Razorpay({ key_id: this.keyId, key_secret: this.keySecret });
  }

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

    const amountPaise = Math.round(Number(order.total) * 100);

    const rzpOrder = await this.razorpay.orders.create({
      amount: amountPaise,
      currency: order.currency,
      receipt: order.orderNumber,
      notes: { dbOrderId: order.id },
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: rzpOrder.id },
    });

    return {
      razorpayOrderId: rzpOrder.id,
      amount: amountPaise,
      currency: order.currency,
      key: this.keyId,
      orderNumber: order.orderNumber,
    };
  }

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
    }

    return { received: true };
  }

  private async findOrderByRazorpayId(
    rzpOrderId: string,
    notes?: Record<string, string>,
  ): Promise<Order | null> {
    const dbOrderId = notes?.dbOrderId;
    if (dbOrderId) {
      return this.prisma.order.findUnique({ where: { id: dbOrderId } });
    }
    return this.prisma.order.findUnique({ where: { razorpayOrderId: rzpOrderId } });
  }

  private async onOrderPaid(payload: Record<string, any>) {
    const rzpOrderId: string = payload.order.entity.id;
    const rzpPaymentId: string = payload.payment.entity.id;
    const notes = payload.order.entity.notes as Record<string, string> | undefined;

    const order = await this.findOrderByRazorpayId(rzpOrderId, notes);
    if (!order || order.status !== OrderStatus.PENDING) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CONFIRMED },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          type: OrderEventType.PAYMENT_CONFIRMED,
          payload: { razorpayOrderId: rzpOrderId, razorpayPaymentId: rzpPaymentId },
        },
      });
    });
  }

  private async onPaymentFailed(payload: Record<string, any>) {
    const entity = payload.payment.entity;
    const rzpOrderId: string = entity.order_id;

    const order = await this.prisma.order.findUnique({
      where: { razorpayOrderId: rzpOrderId },
      include: { items: true },
    });
    if (!order || order.status !== OrderStatus.PENDING) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          type: OrderEventType.PAYMENT_FAILED,
          payload: {
            razorpayOrderId: rzpOrderId,
            errorCode: entity.error_code ?? null,
            errorDescription: entity.error_description ?? null,
          },
        },
      });

      for (const item of order.items) {
        await tx.product.updateMany({
          where: { id: item.productId, trackInventory: true },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    });
  }

  private verifySignature(rawBody: Buffer, signature: string) {
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

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
