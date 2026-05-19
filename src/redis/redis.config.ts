import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { type RedisOptions } from 'ioredis';

const logger = new Logger('Redis');

/**
 * Resolves Redis connection settings for ioredis / BullMQ.
 * Priority: REDIS_PRIVATE_URL → REDIS_URL → REDISHOST/REDISPORT (Railway) → REDIS_HOST/REDIS_PORT (local).
 */
export function resolveRedisOptions(config: ConfigService): RedisOptions {
  const url =
    config.get<string>('REDIS_PRIVATE_URL') || config.get<string>('REDIS_URL');
  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      ...(parsed.username ? { username: decodeURIComponent(parsed.username) } : {}),
      ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
      ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
      maxRetriesPerRequest: null,
    };
  }

  const host =
    config.get<string>('REDISHOST') ||
    config.get<string>('REDIS_HOST', 'localhost');
  const port = Number(
    config.get<string>('REDISPORT') ??
      config.get<number>('REDIS_PORT') ??
      6379,
  );
  const password =
    config.get<string>('REDISPASSWORD') ||
    config.get<string>('REDIS_PASSWORD');
  const username = config.get<string>('REDISUSER');

  return {
    host,
    port,
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
    maxRetriesPerRequest: null,
  };
}

export function createRedisClient(config: ConfigService): Redis {
  const client = new Redis(resolveRedisOptions(config));

  client.on('error', (err: Error) => {
    logger.error(`Redis connection error: ${err.message}`);
  });

  return client;
}
