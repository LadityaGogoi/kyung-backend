import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({ description: 'DB order ID returned from POST /v1/orders' })
  @IsString()
  orderId: string;
}
