import { ApiProperty } from '@nestjs/swagger';
import { MessageItem } from '@utils';

/** Login endpoint success response (message + tokens only) */
export class LoginResponseDto {
  @ApiProperty({ type: MessageItem })
  message: MessageItem;

  @ApiProperty({ description: 'JWT access token (short-lived, e.g. 6h)' })
  access_token: string;

  @ApiProperty({ description: 'JWT refresh token (long-lived, e.g. 7d)' })
  refresh_token: string;
}
