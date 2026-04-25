import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'Home' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ example: 'Flat 4B, Sunrise Apartments' })
  @IsString()
  street: string;

  @ApiPropertyOptional({ example: 'Koramangala' })
  @IsOptional()
  @IsString()
  street2?: string;

  @ApiPropertyOptional({ example: 'Near Forum Mall' })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  city: string;

  @ApiPropertyOptional({ example: 'Karnataka' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: '560095' })
  @IsString()
  postalCode: string;

  @ApiPropertyOptional({ example: 'India', default: 'India' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
