import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQService } from '../rabbitmq.service';
import { RabbitMQMessagePayload } from '../dto/event.dto';
import {
  ORDER_CREATED_ROUTING_KEY,
  ORDER_UPDATED_ROUTING_KEY,
  ORDER_CANCELLED_ROUTING_KEY,
  PAYMENT_COMPLETED_ROUTING_KEY,
  PAYMENT_FAILED_ROUTING_KEY,
  STOCK_UPDATED_ROUTING_KEY,
  NOTIFICATION_EMAIL_ROUTING_KEY,
  NOTIFICATION_SMS_ROUTING_KEY,
} from '../rabbitmq.constants';
import {
  OrderCreatedEventDto,
  OrderUpdatedEventDto,
  OrderCancelledEventDto,
  PaymentEventDto,
  NotificationEventDto,
  InventoryUpdateEventDto,
} from '../dto/event.dto';

@Injectable()
export class EventPublisher {
  private readonly logger = new Logger(EventPublisher.name);

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly configService: ConfigService
  ) {}

  private get exchange(): string {
    return this.configService.get<string>('rabbitmq.exchange') || 'atelier_events';
  }

  private async publishEvent<T>(routingKey: string, event: T): Promise<boolean> {
    if (!this.rabbitMQService.isConnectedToRabbitMQ()) {
      this.logger.warn('RabbitMQ is not connected. Event will not be published.');
      return false;
    }

    try {
      const payload = RabbitMQMessagePayload.create(event, routingKey);
      const result = await this.rabbitMQService.publish(this.exchange, routingKey, payload);
      this.logger.debug(`Published event: ${routingKey}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to publish event ${routingKey}: ${error.message}`);
      return false;
    }
  }

  // Order Events
  async publishOrderCreated(event: OrderCreatedEventDto): Promise<boolean> {
    return this.publishEvent(ORDER_CREATED_ROUTING_KEY, event);
  }

  async publishOrderUpdated(event: OrderUpdatedEventDto): Promise<boolean> {
    return this.publishEvent(ORDER_UPDATED_ROUTING_KEY, event);
  }

  async publishOrderCancelled(event: OrderCancelledEventDto): Promise<boolean> {
    return this.publishEvent(ORDER_CANCELLED_ROUTING_KEY, event);
  }

  // Payment Events
  async publishPaymentCompleted(event: PaymentEventDto): Promise<boolean> {
    return this.publishEvent(PAYMENT_COMPLETED_ROUTING_KEY, event);
  }

  async publishPaymentFailed(event: PaymentEventDto): Promise<boolean> {
    return this.publishEvent(PAYMENT_FAILED_ROUTING_KEY, event);
  }

  // Inventory Events
  async publishInventoryUpdated(event: InventoryUpdateEventDto): Promise<boolean> {
    return this.publishEvent(STOCK_UPDATED_ROUTING_KEY, event);
  }

  // Notification Events
  async publishEmailNotification(event: NotificationEventDto): Promise<boolean> {
    return this.publishEvent(NOTIFICATION_EMAIL_ROUTING_KEY, event);
  }

  async publishSMSNotification(event: NotificationEventDto): Promise<boolean> {
    return this.publishEvent(NOTIFICATION_SMS_ROUTING_KEY, event);
  }

  // Raw message publishing
  async publishRaw<T>(queue: string, message: T, routingKey?: string): Promise<boolean> {
    if (!this.rabbitMQService.isConnectedToRabbitMQ()) {
      this.logger.warn('RabbitMQ is not connected.');
      return false;
    }
    return this.rabbitMQService.publishToQueue(queue, message, routingKey);
  }

  async sendToQueue<T>(queue: string, message: T): Promise<boolean> {
    if (!this.rabbitMQService.isConnectedToRabbitMQ()) {
      this.logger.warn('RabbitMQ is not connected.');
      return false;
    }
    return this.rabbitMQService.sendToQueue(queue, message);
  }

  isReady(): boolean {
    return this.rabbitMQService.isConnectedToRabbitMQ();
  }
}
