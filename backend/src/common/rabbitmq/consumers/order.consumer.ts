import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq.service';
import { ORDER_EVENTS_QUEUE } from '../rabbitmq.constants';
import { RabbitMQMessagePayload, OrderCreatedEventDto, OrderUpdatedEventDto, OrderCancelledEventDto } from '../dto/event.dto';

@Injectable()
export class OrderConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderConsumer.name);
  private consumerTag: string | null = null;

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async onModuleInit(): Promise<void> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await this.startConsuming();
    } catch (error: any) {
      this.logger.error(`Failed to start order consumer: ${error.message}`);
    }
  }

  private async startConsuming(): Promise<void> {
    this.logger.log(`Starting order consumer for queue: ${ORDER_EVENTS_QUEUE}`);
    try {
      const consumer = await this.rabbitMQService.consumeWithQoS(
        ORDER_EVENTS_QUEUE,
        async (message) => await this.handleMessage(message),
        10
      );
      this.consumerTag = consumer.consumerTag;
      this.logger.log(`Order consumer started with tag: ${this.consumerTag}`);
    } catch (error: any) {
      this.logger.error(`Failed to start consumer: ${error.message}`);
      setTimeout(() => this.startConsuming(), 5000);
    }
  }

  private async handleMessage(message: any): Promise<void> {
    try {
      const content = message.content.toString();
      const payload: RabbitMQMessagePayload<any> = JSON.parse(content);
      this.logger.debug(`Received order event: ${payload.messageId}`);

      const event = payload.data;
      
      switch (payload.routingKey) {
        case 'order.created':
          await this.handleOrderCreated(event as OrderCreatedEventDto);
          break;
        case 'order.updated':
          await this.handleOrderUpdated(event as OrderUpdatedEventDto);
          break;
        case 'order.cancelled':
          await this.handleOrderCancelled(event as OrderCancelledEventDto);
          break;
        default:
          this.logger.warn(`Unknown order event type: ${payload.routingKey}`);
      }
      this.logger.log(`Processed order event: ${payload.routingKey} for order ${event.orderId}`);
    } catch (error: any) {
      this.logger.error(`Error handling order message: ${error.message}`);
      throw error;
    }
  }

  private async handleOrderCreated(event: OrderCreatedEventDto): Promise<void> {
    this.logger.log(`\nOrder Created: ${event.orderId}`);
    this.logger.log(`  - Items: ${event.items.length}`);
    this.logger.log(`  - Total: EGP ${(event.totalCents / 100).toFixed(2)}`);
    this.logger.log(`  - Payment Method: ${event.paymentMethod}`);
    this.logger.log(`  - Status: PENDING`);
    
    console.log('\n=== Order Created ===');
    console.log(`Order ID: ${event.orderId}`);
    console.log(`Items: ${event.items.length}`);
    console.log(`Total: EGP ${(event.totalCents / 100).toFixed(2)}`);
    console.log(`Payment Method: ${event.paymentMethod}`);
    console.log(`=====================\n`);
    
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  private async handleOrderUpdated(event: OrderUpdatedEventDto): Promise<void> {
    this.logger.log(`\nOrder Updated: ${event.orderId}`);
    this.logger.log(`  - Status: ${event.previousStatus} -> ${event.newStatus}`);
    if (event.reason) {
      this.logger.log(`  - Reason: ${event.reason}`);
    }
    
    console.log('\n=== Order Updated ===');
    console.log(`Order ID: ${event.orderId}`);
    console.log(`Status: ${event.previousStatus} -> ${event.newStatus}`);
    if (event.reason) {
      console.log(`Reason: ${event.reason}`);
    }
    console.log(`======================\n`);
    
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  private async handleOrderCancelled(event: OrderCancelledEventDto): Promise<void> {
    this.logger.log(`\nOrder Cancelled: ${event.orderId}`);
    this.logger.log(`  - Previous Status: ${event.previousStatus}`);
    this.logger.log(`  - Reason: ${event.reason}`);
    if (event.refunded) {
      this.logger.log(`  - Refunded: Yes`);
    }
    
    console.log('\n=== Order Cancelled ===');
    console.log(`Order ID: ${event.orderId}`);
    console.log(`Previous Status: ${event.previousStatus}`);
    console.log(`Reason: ${event.reason}`);
    console.log(`Refunded: ${event.refunded ? 'Yes' : 'No'}`);
    console.log(`========================\n`);
    
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  async onModuleDestroy(): Promise<void> {
    if (this.consumerTag) {
      this.logger.log(`Stopping order consumer: ${this.consumerTag}`);
    }
  }
}
