import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

export const CHATBOT_LOG_QUEUE = 'chatbot-log-drain';

export interface ChatbotLogJob {
  sessionId: string;
  messages: Array<{ role: string; content: string; createdAt: string }>;
}

@Injectable()
export class ChatbotLogProducer {
  constructor(
    @InjectQueue(CHATBOT_LOG_QUEUE) private readonly queue: Queue<ChatbotLogJob>,
  ) {}

  async enqueue(job: ChatbotLogJob) {
    await this.queue.add('drain', job, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
  }
}
