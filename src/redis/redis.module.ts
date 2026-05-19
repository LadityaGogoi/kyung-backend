import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRedisClient } from './redis.config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) => createRedisClient(config),
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
