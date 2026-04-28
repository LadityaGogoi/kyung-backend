import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ChatbotService } from './chatbot.service';
import { CreateConversationDto, SendMessageDto } from './dto';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import type { UserWithoutPassword } from '@common/types';

@ApiTags('chatbot')
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'chatbot', version: '1' })
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('conversations')
  createConversation(
    @CurrentUser() user: UserWithoutPassword,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatbotService.createConversation(user.id, dto);
  }

  @Get('conversations')
  getConversations(@CurrentUser() user: UserWithoutPassword) {
    return this.chatbotService.getConversations(user.id);
  }

  @Get('conversations/:id')
  getConversation(
    @CurrentUser() user: UserWithoutPassword,
    @Param('id') id: string,
  ) {
    return this.chatbotService.getConversation(user.id, id);
  }

  @Delete('conversations/:id')
  deleteConversation(
    @CurrentUser() user: UserWithoutPassword,
    @Param('id') id: string,
  ) {
    return this.chatbotService.deleteConversation(user.id, id);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @CurrentUser() user: UserWithoutPassword,
    @Param('id') id: string,
  ) {
    return this.chatbotService.getMessages(user.id, id);
  }

  @Post('conversations/:id/messages')
  addMessage(
    @CurrentUser() user: UserWithoutPassword,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatbotService.addMessage(user.id, id, dto);
  }
}
