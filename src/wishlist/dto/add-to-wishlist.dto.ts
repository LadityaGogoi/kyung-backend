import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AddToWishlistDto {
  @ApiProperty({ example: 'clxyz123', description: 'Product ID to add to wishlist' })
  @IsString()
  productId: string;
}
