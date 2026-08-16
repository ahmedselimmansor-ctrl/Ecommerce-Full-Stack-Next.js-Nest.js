import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from './cache.service';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('Redis');
        const client = new Redis({
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password') || undefined,
          tls: config.get<boolean>('redis.tls') ? {} : undefined,
          // Memorystore lives behind a Serverless VPC connector; keep retries
          // bounded so a cold connector never hangs a request thread.
          maxRetriesPerRequest: 2,
          connectTimeout: 5_000,
          enableOfflineQueue: false,
          lazyConnect: false,
          retryStrategy: (attempt) => Math.min(attempt * 200, 3_000),
        });

        client.on('error', (error) => logger.warn(`Redis error: ${error.message}`));
        client.on('connect', () => logger.log('Connected to Redis'));

        return client;
      },
    },
    CacheService,
  ],
  exports: [REDIS_CLIENT, CacheService],
})
export class RedisModule {}
