import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class ChangeEmailDto {
  @ApiProperty({ example: 'new@email.com' })
  @IsEmail()
  newEmail: string;

  @ApiProperty()
  @IsString()
  currentPassword: string;
}
