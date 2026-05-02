import { IsIn, IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsIn(['email', 'phone'])
  field: 'email' | 'phone';

  @IsString()
  @IsNotEmpty()
  value: string;

  /** 4 digits for static dev phone OTP; 6 for email OTP. */
  @IsString()
  @Matches(/^\d{4,6}$/)
  otp: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
