// Swagger decorators for API documentation (visible in Swagger UI)
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// Validation decorators — NestJS runs these before the request reaches the controller
import { IsEmail, IsOptional, IsString, MinLength, IsMobilePhone } from 'class-validator';

/**
 * RegisterDto — defines the data a user must send when creating an account.
 *
 * NestJS automatically validates every incoming request against these rules.
 * If any rule fails (e.g. invalid email, short password), it returns a
 * 400 Bad Request error with a description of what went wrong — before
 * any of our own code runs.
 */
export class RegisterDto {
  // Must be a properly formatted email address
  @ApiProperty({ example: 'sourav@lahon.in' })
  @IsEmail()
  email: string;

  // Must be a string of at least 6 characters
  @ApiProperty({ example: 'lahon123', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  // Must be a valid mobile phone number in international format (e.g. +916001098923)
  // 'undefined' as the first argument means any country/locale is accepted
  @ApiProperty({ example: '+916001098923' })
  @IsMobilePhone(undefined, { strictMode: false })
  phone: string;

  // Optional — user can register without providing a display name
  @ApiPropertyOptional({ example: 'Sourav Lahon' })
  @IsOptional()
  @IsString()
  name?: string;
}
