import { ApiProperty } from '@nestjs/swagger';
import { MessageItem } from '@utils';

/** Error response shape for 4xx (uses message template from utils) */
export class UserErrorResponseDto {
  @ApiProperty({ example: 401 })
  statusCode: number;

  @ApiProperty({
    type: MessageItem,
    example: {
      title: 'Authentication Failed',
      subTitle: 'Invalid or missing token',
    },
  })
  message: MessageItem;

  @ApiProperty({ example: 'Unauthorized' })
  error: string;
}
