import { IsIn, IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class VerifyOtpDto {
  @IsIn(['email', 'phone'])
  field: 'email' | 'phone';

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @Length(6, 6)
  otp: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
