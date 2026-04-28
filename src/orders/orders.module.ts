import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrderEventsProducer, ORDER_EVENTS_QUEUE } from './orders.queue';
import { OrderEventsProcessor } from './orders.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: ORDER_EVENTS_QUEUE }),
  ],
  providers: [OrderEventsProducer, OrderEventsProcessor],
  exports: [OrderEventsProducer],
})
export class OrdersModule {}
