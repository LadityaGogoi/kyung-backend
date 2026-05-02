import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ description: 'Shipping address ID (must belong to the authenticated user)' })
  @IsString()
  shippingAddressId: string;

  @ApiPropertyOptional({ description: 'Billing address ID; defaults to shipping address if omitted' })
  @IsOptional()
  @IsString()
  billingAddressId?: string;

  @ApiPropertyOptional({ description: 'Optional order notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
