// Swagger decorators for API documentation (visible in Swagger UI)
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsMobilePhone,
  IsNotEmpty,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: '+916001098923' })
  @IsMobilePhone(undefined, { strictMode: false })
  phone: string;

  @ApiProperty({ example: 'Sourav Lahon' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'lahon123', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @ApiPropertyOptional({ example: 'sourav@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
