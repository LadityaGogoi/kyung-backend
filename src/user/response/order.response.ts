import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { MessageItem } from '@utils';

export class OrderItemDto {
  @ApiProperty() id: string;
  @ApiProperty() productId: string;
  @ApiProperty() productName: string;
  @ApiPropertyOptional() productSku: string | null;
  @ApiProperty() quantity: number;
  @ApiProperty() priceAtPurchase: number;
}

export class OrderSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty({ enum: OrderStatus }) status: OrderStatus;
  @ApiProperty() subtotal: number;
  @ApiProperty() shippingCost: number;
  @ApiProperty() tax: number;
  @ApiProperty() discount: number;
  @ApiProperty() total: number;
  @ApiProperty() currency: string;
  @ApiProperty({ type: [OrderItemDto] }) items: OrderItemDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class OrderListResponseDto {
  @ApiProperty({ type: MessageItem }) message: MessageItem;
  @ApiProperty({ type: [OrderSummaryDto] }) orders: OrderSummaryDto[];
}
