import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string | null;

  @ApiPropertyOptional({ description: 'Omit to leave unchanged' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
