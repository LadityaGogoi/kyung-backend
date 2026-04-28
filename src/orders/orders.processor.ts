import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ORDER_EVENTS_QUEUE, OrderEventJob } from './orders.queue';

@Processor(ORDER_EVENTS_QUEUE)
export class OrderEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderEventsProcessor.name);

  async process(job: Job<OrderEventJob>) {
    const { orderId, newStatus, userId } = job.data;
    this.logger.log(`Processing order event: order=${orderId} status=${newStatus} user=${userId}`);
    // TODO: wire up Nodemailer / Resend here to send status-change email
  }
}
