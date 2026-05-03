import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { MessageItem } from '@utils';

export class OrderAddressDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional() label: string | null;
  @ApiProperty() street: string;
  @ApiPropertyOptional() street2: string | null;
  @ApiPropertyOptional() landmark: string | null;
  @ApiProperty() city: string;
  @ApiPropertyOptional() state: string | null;
  @ApiProperty() postalCode: string;
  @ApiProperty() country: string;
}

export class OrderItemImageDto {
  @ApiProperty() id: string;
  @ApiProperty() url: string;
  @ApiProperty() alt: string | null;
}

export class OrderItemProductDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty({ type: [OrderItemImageDto] }) images: OrderItemImageDto[];
}

export class OrderItemDto {
  @ApiProperty() id: string;
  @ApiProperty() productId: string;
  @ApiProperty({ type: () => OrderItemProductDto }) product: OrderItemProductDto;
  @ApiProperty() quantity: number;
  @ApiProperty() priceAtPurchase: number;
  @ApiProperty() productName: string;
  @ApiPropertyOptional() productSku: string | null;
}

export class OrderDto {
  @ApiProperty() id: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: OrderStatus }) status: OrderStatus;
  @ApiProperty() subtotal: number;
  @ApiProperty() shippingCost: number;
  @ApiProperty() tax: number;
  @ApiProperty() discount: number;
  @ApiProperty() total: number;
  @ApiProperty() currency: string;
  @ApiPropertyOptional() notes: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: () => OrderAddressDto }) shippingAddress: OrderAddressDto;
  @ApiPropertyOptional({ type: () => OrderAddressDto }) billingAddress: OrderAddressDto | null;
  @ApiProperty({ type: [OrderItemDto] }) items: OrderItemDto[];
}

export class OrderListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty({ enum: OrderStatus }) status: OrderStatus;
  @ApiProperty() total: number;
  @ApiProperty() currency: string;
  @ApiProperty() itemCount: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class OrderListResponseDto {
  @ApiProperty({ type: [OrderListItemDto] }) orders: OrderListItemDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}

export class OrderMutationResponseDto {
  @ApiProperty({ type: MessageItem }) message: MessageItem;
  @ApiProperty({ type: () => OrderDto }) order: OrderDto;
}
