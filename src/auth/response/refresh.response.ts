import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { MessageItem } from '@utils';

export class RefreshResponseDto {
  @ApiProperty({ type: MessageItem })
  message: MessageItem;

  @ApiProperty()
  access_token: string;

  @ApiProperty()
  refresh_token: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;
}
