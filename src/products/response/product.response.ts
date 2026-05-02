import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { MessageItem } from '@utils';

export class ProductCategoryBriefDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
}

export class ProductImageDto {
  @ApiProperty() id: string;
  @ApiProperty() url: string;
  @ApiProperty() publicId: string;
  @ApiPropertyOptional() alt: string | null;
  @ApiProperty() sortOrder: number;
}

export class ProductListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty() price: number;
  @ApiPropertyOptional() compareAtPrice: number | null;
  @ApiProperty() stockQuantity: number;
  @ApiProperty() isFeatured: boolean;
  @ApiPropertyOptional({ enum: Gender }) gender: Gender | null;
  @ApiPropertyOptional() colour: string | null;
  @ApiPropertyOptional({ type: () => ProductCategoryBriefDto }) category: ProductCategoryBriefDto | null;
  @ApiPropertyOptional({ type: () => ProductCategoryBriefDto }) subcategory: ProductCategoryBriefDto | null;
  @ApiProperty({ type: [ProductImageDto] }) images: ProductImageDto[];
}

export class ProductListingResponseDto {
  @ApiProperty({ type: [ProductListItemDto] }) products: ProductListItemDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}

export class ProductDetailDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiPropertyOptional() description: string | null;
  @ApiProperty() price: number;
  @ApiPropertyOptional() compareAtPrice: number | null;
  @ApiPropertyOptional() sku: string | null;
  @ApiProperty() stockQuantity: number;
  @ApiProperty() trackInventory: boolean;
  @ApiProperty() lowStockThreshold: number;
  @ApiPropertyOptional({ enum: Gender }) gender: Gender | null;
  @ApiPropertyOptional() colour: string | null;
  @ApiProperty() isFeatured: boolean;
  @ApiPropertyOptional({ type: () => ProductCategoryBriefDto }) category: ProductCategoryBriefDto | null;
  @ApiPropertyOptional({ type: () => ProductCategoryBriefDto }) subcategory: ProductCategoryBriefDto | null;
  @ApiProperty({ type: [ProductImageDto] }) images: ProductImageDto[];
}

export class ProductStaffDetailDto extends ProductDetailDto {
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() costPerItem: number | null;
  @ApiPropertyOptional() barcode: string | null;
  @ApiPropertyOptional() weight: number | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty() reviewsCount: number;
  @ApiProperty() orderItemsCount: number;
}

export class ProductEntityDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiPropertyOptional() description: string | null;
  @ApiProperty() price: number;
  @ApiPropertyOptional() compareAtPrice: number | null;
  @ApiPropertyOptional() costPerItem: number | null;
  @ApiPropertyOptional() sku: string | null;
  @ApiPropertyOptional() barcode: string | null;
  @ApiProperty() trackInventory: boolean;
  @ApiProperty() stockQuantity: number;
  @ApiProperty() lowStockThreshold: number;
  @ApiPropertyOptional() weight: number | null;
  @ApiPropertyOptional() categoryId: string | null;
  @ApiPropertyOptional() subcategoryId: string | null;
  @ApiPropertyOptional({ enum: Gender }) gender: Gender | null;
  @ApiPropertyOptional() colour: string | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty() isFeatured: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

/** Staff table row with relations for grid views. */
export class ProductStaffListRowDto extends ProductEntityDto {
  @ApiPropertyOptional({ type: () => ProductCategoryBriefDto }) category: ProductCategoryBriefDto | null;
  @ApiPropertyOptional({ type: () => ProductCategoryBriefDto }) subcategory: ProductCategoryBriefDto | null;
  @ApiProperty({ type: [ProductImageDto] }) images: ProductImageDto[];
}

export class ProductStaffListingResponseDto {
  @ApiProperty({ type: [ProductStaffListRowDto] }) products: ProductStaffListRowDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}

export class ProductMutationResponseDto {
  @ApiProperty({ type: MessageItem }) message: MessageItem;
  @ApiProperty({ type: ProductEntityDto }) product: ProductEntityDto;
}

export class ProductImagesUpdatedResponseDto {
  @ApiProperty({ type: MessageItem }) message: MessageItem;
}

export class ProductInventoryResponseDto {
  @ApiProperty({ type: MessageItem }) message: MessageItem;
  @ApiProperty() stockQuantity: number;
  @ApiProperty() trackInventory: boolean;
  @ApiProperty() lowStockThreshold: number;
}
