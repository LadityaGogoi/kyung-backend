import { ApiProperty } from '@nestjs/swagger';

export class InitiatePaymentResponseDto {
  @ApiProperty({ description: 'Razorpay order ID — pass to the Razorpay checkout SDK' })
  razorpayOrderId: string;

  @ApiProperty({ description: 'Amount in paise (e.g. 50000 = ₹500)' })
  amount: number;

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty({ description: 'Razorpay key_id — needed by the frontend checkout SDK' })
  key: string;

  @ApiProperty({ example: 'KY-10001' })
  orderNumber: string;
}

export class WebhookAckDto {
  @ApiProperty({ example: true })
  received: boolean;
}
