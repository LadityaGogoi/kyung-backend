import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ProductImageDto {
  @IsString()
  url: string;

  @IsString()
  publicId: string;

  @IsOptional()
  @IsString()
  alt?: string;
}

export class SetProductImagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images: ProductImageDto[];
}
