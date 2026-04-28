import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { AuthModule } from '@auth/auth.module';
import { ChatbotLogProducer, CHATBOT_LOG_QUEUE } from './chatbot.queue';
import { ChatbotLogProcessor } from './chatbot.processor';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: CHATBOT_LOG_QUEUE }),
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService, ChatbotLogProducer, ChatbotLogProcessor],
  exports: [ChatbotLogProducer],
})
export class ChatbotModule {}
