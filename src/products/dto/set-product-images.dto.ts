import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { ProductImageInputDto } from './product-image-input.dto';

export class SetProductImagesDto {
  @ApiProperty({ type: [ProductImageInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageInputDto)
  images: ProductImageInputDto[];
}
