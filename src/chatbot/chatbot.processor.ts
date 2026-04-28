import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { CHATBOT_LOG_QUEUE, ChatbotLogJob } from './chatbot.queue';

@Processor(CHATBOT_LOG_QUEUE)
export class ChatbotLogProcessor extends WorkerHost {
  private readonly logger = new Logger(ChatbotLogProcessor.name);

  async process(job: Job<ChatbotLogJob>) {
    const { sessionId, messages } = job.data;
    this.logger.log(`Draining chatbot log: session=${sessionId} messages=${messages.length}`);
    // TODO: batch-write anonymous sessions to DB here
  }
}
