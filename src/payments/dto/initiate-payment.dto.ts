import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum PaymentMethod {
  RAZORPAY = 'RAZORPAY',
  COD = 'COD',
}

export class InitiatePaymentDto {
  @ApiProperty({ description: 'DB order ID returned from POST /v1/orders' })
  @IsString()
  orderId: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.RAZORPAY })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;
}
