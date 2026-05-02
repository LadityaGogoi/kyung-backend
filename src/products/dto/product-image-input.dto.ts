import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ProductImageInputDto {
  @ApiProperty({ description: 'Cloudinary secure URL' })
  @IsString()
  @MaxLength(2048)
  url: string;

  @ApiProperty({ description: 'Cloudinary public ID' })
  @IsString()
  @MaxLength(512)
  publicId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  alt?: string;
}
