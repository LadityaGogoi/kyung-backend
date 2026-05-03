import { IsIn, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RequestOtpDto {
  @IsIn(['email', 'phone'])
  field: 'email' | 'phone';

  @IsString()
  @IsNotEmpty()
  value: string;

  /** Sent with phone flow; applied when OTP is verified. */
  @IsOptional()
  @IsString()
  name?: string;
}
