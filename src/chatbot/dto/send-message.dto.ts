import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MessageRole } from '@prisma/client';

export class SendMessageDto {
  @IsEnum(MessageRole)
  role: MessageRole;

  @IsString()
  content: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
