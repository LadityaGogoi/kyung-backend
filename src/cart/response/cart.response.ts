import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemImageDto {
  @ApiProperty() id: string;
  @ApiProperty() url: string;
  @ApiPropertyOptional() alt: string | null;
}

export class CartItemProductDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty() price: number;
  @ApiProperty({ type: [CartItemImageDto] }) images: CartItemImageDto[];
}

export class CartItemDto {
  @ApiProperty() id: string;
  @ApiProperty() productId: string;
  @ApiProperty() quantity: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: () => CartItemProductDto }) product: CartItemProductDto;
}

export class CartResponseDto {
  @ApiPropertyOptional() id: string | null;
  @ApiProperty({ type: [CartItemDto] }) items: CartItemDto[];
}

export class GuestCartResponseDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'integer' },
    example: { clxyz123: 2, clabc456: 1 },
    description: 'Map of productId → quantity',
  })
  cart: Record<string, number>;
}
