import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { MessageItem } from '@utils';

export class WishlistProductImageDto {
  @ApiProperty() id: string;
  @ApiProperty() url: string;
  @ApiProperty() publicId: string;
  @ApiPropertyOptional() alt: string | null;
  @ApiProperty() sortOrder: number;
}

export class WishlistProductCategoryDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
}

export class WishlistProductDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty() price: number;
  @ApiPropertyOptional() compareAtPrice: number | null;
  @ApiProperty() stockQuantity: number;
  @ApiPropertyOptional({ enum: Gender }) gender: Gender | null;
  @ApiPropertyOptional() colour: string | null;
  @ApiPropertyOptional({ type: () => WishlistProductCategoryDto }) category: WishlistProductCategoryDto | null;
  @ApiPropertyOptional({ type: () => WishlistProductCategoryDto }) subcategory: WishlistProductCategoryDto | null;
  @ApiProperty({ type: [WishlistProductImageDto] }) images: WishlistProductImageDto[];
}

export class WishlistItemDto {
  @ApiProperty() id: string;
  @ApiProperty() productId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: () => WishlistProductDto }) product: WishlistProductDto;
}

export class WishlistResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: [WishlistItemDto] }) items: WishlistItemDto[];
  @ApiProperty() total: number;
}

export class WishlistItemAddedResponseDto {
  @ApiProperty({ type: MessageItem }) message: MessageItem;
  @ApiProperty({ type: WishlistItemDto }) item: WishlistItemDto;
}
