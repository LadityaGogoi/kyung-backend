import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsMobilePhone } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Sourav Lahon' })
  @IsOptional()
  @IsString()
  name?: string | null;

  @ApiPropertyOptional({ example: '+916001098923' })
  @IsOptional()
  @IsMobilePhone(undefined, { strictMode: false })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}
