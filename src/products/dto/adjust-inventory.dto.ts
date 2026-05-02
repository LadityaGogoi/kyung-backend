import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

/** Use `stockQuantity` (absolute) or `delta` (relative), not both. Optionally update thresholds / tracking. */
export class AdjustInventoryDto {
  @ApiPropertyOptional({ description: 'Set stock to this value' })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({ description: 'Add (positive) or remove (negative) units' })
  @IsOptional()
  @IsInt()
  delta?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;
}
