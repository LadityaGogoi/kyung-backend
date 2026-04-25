import { IsIn, IsString, IsNotEmpty } from 'class-validator';

export class RequestOtpDto {
  @IsIn(['email', 'phone'])
  field: 'email' | 'phone';

  @IsString()
  @IsNotEmpty()
  value: string;
}
