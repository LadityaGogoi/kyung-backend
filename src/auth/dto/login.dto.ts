import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsMobilePhone } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '+916001098923' })
  @IsMobilePhone(undefined, { strictMode: false })
  phone: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}
