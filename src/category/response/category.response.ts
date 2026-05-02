import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageItem } from '@utils';

/** One node in the category tree (children may be empty or nested). */
export class CategoryTreeNodeDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiPropertyOptional() description: string | null;
  @ApiPropertyOptional() imageUrl: string | null;
  @ApiPropertyOptional() parentId: string | null;
  @ApiProperty() sortOrder: number;
  @ApiProperty() isActive: boolean;
  @ApiProperty({ type: () => [CategoryTreeNodeDto] }) children: CategoryTreeNodeDto[];
}

export class CategoryTreeResponseDto {
  @ApiProperty({ type: [CategoryTreeNodeDto] }) categories: CategoryTreeNodeDto[];
}

export class CategoryEntityDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiPropertyOptional() description: string | null;
  @ApiPropertyOptional() imageUrl: string | null;
  @ApiPropertyOptional() parentId: string | null;
  @ApiProperty() sortOrder: number;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class CategoryMutationResponseDto {
  @ApiProperty({ type: MessageItem }) message: MessageItem;
  @ApiProperty({ type: CategoryEntityDto }) category: CategoryEntityDto;
}

/** Single row in the flat admin list (e.g. product form pickers). */
export class CategoryFlatRowDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() parentId: string | null;
}
