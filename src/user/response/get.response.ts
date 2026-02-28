import { ApiProperty } from '@nestjs/swagger';
import { MessageItem } from '@utils';
import { UserDetailDto } from './user-detail.response';

/** Get user (me) endpoint success response */
export class GetUserResponseDto {
  @ApiProperty({ type: MessageItem })
  message: MessageItem;

  @ApiProperty({ type: UserDetailDto })
  user: UserDetailDto;
}
