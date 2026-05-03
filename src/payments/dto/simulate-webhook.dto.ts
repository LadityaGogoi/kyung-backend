import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export enum SimulateEventType {
  ORDER_PAID = 'order.paid',
  PAYMENT_FAILED = 'payment.failed',
}

export class SimulateWebhookDto {
  @ApiProperty({ description: 'Razorpay order ID returned from POST /v1/payments/initiate' })
  @IsString()
  razorpayOrderId: string;

  @ApiProperty({ enum: SimulateEventType, description: 'Event to simulate' })
  @IsEnum(SimulateEventType)
  event: SimulateEventType;
}
