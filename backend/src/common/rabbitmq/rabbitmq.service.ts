import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { Options } from 'amqplib';
import { ConsumerOptions, QueueOptions } from './interfaces/rabbitmq-options.interface';
import {
  DLX_EXCHANGE,
  DLX_QUEUE,
  EXCHANGE_TYPE_DIRECT,
  NOTIFICATIONS_QUEUE,
  ORDER_EVENTS_QUEUE,
  PAYMENT_EVENTS_QUEUE,
} from './rabbitmq.constants';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  
  private channelModel: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  private getConfig() {
    return this.configService.get<any>('rabbitmq');
  }

  private getConnectionString(): string {
    const config = this.getConfig();
    return `amqp://${config.user}:${config.password}@${config.host}:${config.port}`;
  }

  private async connectWithRetry(maxRetries: number = 5): Promise<void> {
    const config = this.getConfig();
    let retryCount = 0;
    
    while (retryCount < maxRetries && !this.isConnected) {
      try {
        this.logger.log(`Connecting to RabbitMQ at ${config.host}:${config.port}...`);
        this.channelModel = await amqp.connect(this.getConnectionString());
        this.isConnected = true;
        this.setupConnectionHandlers();
        this.logger.log('Connected to RabbitMQ successfully');
        return;
      } catch (error: any) {
        retryCount++;
        const delay = config.connectionRetryDelay * retryCount;
        this.logger.warn(`Failed to connect (attempt ${retryCount}/${maxRetries}): ${error.message}`);
        if (retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (!this.isConnected) {
      throw new Error(`Failed to connect to RabbitMQ after ${maxRetries} attempts.`);
    }
  }

  private setupConnectionHandlers(): void {
    if (!this.channelModel) return;
    
    this.channelModel.on('error', (error: Error) => {
      this.isConnected = false;
      this.channel = null;
      this.logger.error(`RabbitMQ connection error: ${error.message}`);
    });
    
    this.channelModel.on('close', () => {
      this.isConnected = false;
      this.channel = null;
      this.logger.warn('RabbitMQ connection closed');
    });
  }

  private async createChannel(): Promise<amqp.Channel> {
    if (!this.channelModel) {
      await this.connectWithRetry();
    }
    
    const channel = await this.channelModel!.createChannel();
    
    channel.on('error', (error: Error) => {
      this.logger.error(`Channel error: ${error.message}`);
    });
    
    channel.on('close', () => {
      this.logger.warn('Channel closed');
      this.channel = null;
    });
    
    this.channel = channel;
    return channel;
  }

  private async ensureChannel(): Promise<amqp.Channel> {
    if (!this.channel) {
      return this.createChannel();
    }
    return this.channel;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.connectWithRetry();
      await this.createChannel();
      await this.setupExchangesAndQueues();
    } catch (error: any) {
      this.logger.error(`Failed to initialize RabbitMQ: ${error.message}`);
    }
  }

  private async setupExchangesAndQueues(): Promise<void> {
    const channel = await this.ensureChannel();
    const config = this.getConfig();

    await channel.assertExchange(DLX_EXCHANGE, EXCHANGE_TYPE_DIRECT, { durable: true });
    await channel.assertQueue(DLX_QUEUE, { durable: true });
    await channel.bindQueue(DLX_QUEUE, DLX_EXCHANGE, '#');

    await channel.assertExchange(config.exchange, EXCHANGE_TYPE_DIRECT, { durable: true });

    const queues = [ORDER_EVENTS_QUEUE, NOTIFICATIONS_QUEUE, PAYMENT_EVENTS_QUEUE];
    for (const queue of queues) {
      await channel.assertQueue(queue, {
        durable: true,
        deadLetterExchange: DLX_EXCHANGE,
        deadLetterRoutingKey: queue,
      });
      await channel.bindQueue(queue, config.exchange, queue);
    }

    this.logger.log('Exchanges and queues setup complete');
  }

  async createQueue(options: QueueOptions): Promise<amqp.Replies.AssertQueue> {
    const channel = await this.ensureChannel();
    return channel.assertQueue(options.name, {
      durable: options.durable ?? true,
      exclusive: options.exclusive ?? false,
      autoDelete: options.autoDelete ?? false,
      deadLetterExchange: options.deadLetterExchange,
      deadLetterRoutingKey: options.deadLetterRoutingKey,
      messageTtl: options.ttl,
      maxLength: options.maxLength,
    });
  }

  async publish<T>(exchange: string, routingKey: string, message: T, options?: Options.Publish): Promise<boolean> {
    try {
      const channel = await this.ensureChannel();
      const payload = Buffer.from(JSON.stringify(message));
      const published = channel.publish(exchange, routingKey, payload, {
        persistent: true,
        ...options,
      });
      this.logger.debug(`Published to ${exchange} with key ${routingKey}`);
      return published;
    } catch (error: any) {
      this.logger.error(`Failed to publish: ${error.message}`);
      return false;
    }
  }

  async publishToQueue<T>(queue: string, message: T, routingKey?: string): Promise<boolean> {
    const config = this.getConfig();
    return this.publish<T>(config.exchange, routingKey ?? queue, message);
  }

  async sendToQueue<T>(queue: string, message: T, options?: Options.Publish): Promise<boolean> {
    try {
      const channel = await this.ensureChannel();
      const payload = Buffer.from(JSON.stringify(message));
      const sent = channel.sendToQueue(queue, payload, { persistent: true, ...options });
      this.logger.debug(`Sent to queue: ${queue}`);
      return sent;
    } catch (error: any) {
      this.logger.error(`Failed to send to queue: ${error.message}`);
      return false;
    }
  }

  async consume(queue: string, onMessage: (msg: amqp.ConsumeMessage) => Promise<void>, options?: Options.Consume): Promise<amqp.Replies.Consume> {
    const channel = await this.ensureChannel();
    return channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        await onMessage(msg);
        channel.ack(msg);
      } catch (error: any) {
        this.logger.error(`Error processing message from ${queue}: ${error.message}`);
        channel.nack(msg, false, true);
      }
    }, { noAck: false, ...options });
  }

  async consumeWithQoS(queue: string, onMessage: (msg: amqp.ConsumeMessage) => Promise<void>, prefetchCount: number = 10): Promise<amqp.Replies.Consume> {
    const channel = await this.ensureChannel();
    await channel.prefetch(prefetchCount);
    return this.consume(queue, onMessage, {});
  }

  getChannel(): amqp.Channel | null {
    return this.channel;
  }

  isConnectedToRabbitMQ(): boolean {
    return this.isConnected && this.channel !== null;
  }

  async reconnect(): Promise<void> {
    this.logger.log('Reconnecting to RabbitMQ...');
    await this.closeConnection();
    await this.onModuleInit();
  }

  async onModuleDestroy(): Promise<void> {
    await this.closeConnection();
  }

  private async closeConnection(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.channelModel) {
        await this.channelModel.close();
        this.channelModel = null;
      }
      this.isConnected = false;
      this.logger.log('RabbitMQ connection closed');
    } catch (error: any) {
      this.logger.error(`Error closing connection: ${error.message}`);
    }
  }
}
