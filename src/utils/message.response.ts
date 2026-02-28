import { ApiProperty } from '@nestjs/swagger';

export class MessageItem {
  @ApiProperty({
    description: 'The title of the message',
    example: 'Success',
  })
  title: string;

  @ApiProperty({
    description: 'The subtitle of the message',
    example: 'Success message',
  })
  subTitle: string;
}

export class MessageResponse {
  @ApiProperty({
    description: 'The message',
  })
  message: MessageItem;
}
