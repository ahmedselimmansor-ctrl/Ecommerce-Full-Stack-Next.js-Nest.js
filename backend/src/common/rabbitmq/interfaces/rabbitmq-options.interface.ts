/**
 * RabbitMQ Configuration Options Interface
 */
export interface RabbitMQOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  exchange: string;
  queues: {
    orderEvents: string;
    notifications: string;
    paymentEvents: string;
  };
  connectionRetryDelay: number;
}

/**
 * Queue Configuration Options
 */
export interface QueueOptions {
  name: string;
  durable?: boolean;
  exclusive?: boolean;
  autoDelete?: boolean;
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
  ttl?: number;
  maxLength?: number;
}

/**
 * Consumer Configuration Options
 */
export interface ConsumerOptions {
  queue: string;
  routingKeys?: string[];
  exchange?: string;
  exchangeType?: string;
  noAck?: boolean;
  prefetchCount?: number;
}
