import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { OrderStatus } from '@prisma/client';

export const ORDER_EVENTS_QUEUE = 'order-events';

export interface OrderEventJob {
  orderId: string;
  newStatus: OrderStatus;
  userId: string;
}

@Injectable()
export class OrderEventsProducer {
  constructor(
    @InjectQueue(ORDER_EVENTS_QUEUE) private readonly queue: Queue<OrderEventJob>,
  ) {}

  async enqueue(job: OrderEventJob) {
    await this.queue.add('status-changed', job, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
  }
}
