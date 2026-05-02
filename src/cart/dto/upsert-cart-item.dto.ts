import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class UpsertCartItemDto {
  @ApiProperty({ example: 'clxyz123', description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 2, description: 'Desired quantity; set to 0 to remove the item' })
  @IsInt()
  @Min(0)
  quantity: number;
}
