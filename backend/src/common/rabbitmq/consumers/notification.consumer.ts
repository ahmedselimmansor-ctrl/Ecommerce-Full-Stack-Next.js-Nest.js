import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq.service';
import { NOTIFICATIONS_QUEUE } from '../rabbitmq.constants';
import { RabbitMQMessagePayload, NotificationEventDto } from '../dto/event.dto';

@Injectable()
export class NotificationConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationConsumer.name);
  private consumerTag: string | null = null;

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async onModuleInit(): Promise<void> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await this.startConsuming();
    } catch (error: any) {
      this.logger.error(`Failed to start notification consumer: ${error.message}`);
    }
  }

  private async startConsuming(): Promise<void> {
    this.logger.log(`Starting notification consumer for queue: ${NOTIFICATIONS_QUEUE}`);
    try {
      const consumer = await this.rabbitMQService.consumeWithQoS(
        NOTIFICATIONS_QUEUE,
        async (message) => await this.handleMessage(message),
        20
      );
      this.consumerTag = consumer.consumerTag;
      this.logger.log(`Notification consumer started with tag: ${this.consumerTag}`);
    } catch (error: any) {
      this.logger.error(`Failed to start consumer: ${error.message}`);
      setTimeout(() => this.startConsuming(), 5000);
    }
  }

  private async handleMessage(message: any): Promise<void> {
    try {
      const content = message.content.toString();
      const payload: RabbitMQMessagePayload<NotificationEventDto> = JSON.parse(content);
      this.logger.debug(`Received notification: ${payload.messageId}`);

      const event = payload.data as NotificationEventDto;
      switch (event.channel) {
        case 'email':
          await this.handleEmailNotification(event);
          break;
        case 'sms':
          await this.handleSMSNotification(event);
          break;
        case 'push':
          await this.handlePushNotification(event);
          break;
        default:
          this.logger.warn(`Unknown channel: ${event.channel}`);
      }
      this.logger.log(`Processed notification: ${payload.messageId}`);
    } catch (error: any) {
      this.logger.error(`Error handling notification: ${error.message}`);
      throw error;
    }
  }

  private async handleEmailNotification(event: NotificationEventDto): Promise<void> {
    this.logger.log(`Sending Email to ${event.recipientId}: ${event.title}`);
    console.log(`\n=== Email Notification ===`);
    console.log(`To: User ${event.recipientId}`);
    console.log(`Subject: ${event.title}`);
    console.log(`Message: ${event.message}`);
    console.log(`==========================\n`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  private async handleSMSNotification(event: NotificationEventDto): Promise<void> {
    this.logger.log(`Sending SMS to ${event.recipientId}: ${event.title}`);
    console.log(`\n=== SMS Notification ===`);
    console.log(`To: User ${event.recipientId}`);
    console.log(`Message: ${event.message}`);
    console.log(`========================\n`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  private async handlePushNotification(event: NotificationEventDto): Promise<void> {
    this.logger.log(`Sending Push to ${event.recipientId}: ${event.title}`);
    console.log(`\n=== Push Notification ===`);
    console.log(`To: User ${event.recipientId}`);
    console.log(`Title: ${event.title}`);
    console.log(`Body: ${event.message}`);
    console.log(`==========================\n`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  async onModuleDestroy(): Promise<void> {
    if (this.consumerTag) {
      this.logger.log(`Stopping notification consumer: ${this.consumerTag}`);
    }
  }
}
