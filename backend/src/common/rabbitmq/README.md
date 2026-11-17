# RabbitMQ Module

This module provides complete RabbitMQ integration for the Atelier e-commerce application.

## Files Created:

### Core Services:
- `rabbitmq.service.ts` - Main RabbitMQ service with connection management
- `rabbitmq.module.ts` - Module definition
- `rabbitmq.constants.ts` - Queue and exchange constants

### DTOs:
- `dto/event.dto.ts` - Event DTOs for all message types

### Interfaces:
- `interfaces/rabbitmq-options.interface.ts` - Configuration interfaces

### Publishers:
- `publishers/event.publisher.ts` - High-level event publishing service

### Consumers:
- `consumers/order.consumer.ts` - Consumes order events
- `consumers/notification.consumer.ts` - Consumes notification events

## Usage:

### 1. Import RabbitMQModule in app.module.ts:

```typescript
import { RabbitMQModule } from './common/rabbitmq/rabbitmq.module';

@Module({
  imports: [
    // ... other imports
    RabbitMQModule,
  ],
})
export class AppModule {}
```

### 2. Use EventPublisher to publish events:

```typescript
import { EventPublisher } from './common/rabbitmq/publishers/event.publisher';

@Injectable()
export class OrdersService {
  constructor(private readonly eventPublisher: EventPublisher) {}

  async createOrder(orderData: any) {
    // Create order...
    
    // Publish order created event
    await this.eventPublisher.publishOrderCreated({
      eventId: 'unique-id',
      timestamp: new Date(),
      eventType: 'order.created',
      version: '1.0',
      orderId: order.id,
      userId: order.userId,
      // ... other fields
    });
  }
}
```

### 3. Consumers are automatically started with the application

## Environment Variables:

Add these to your .env file:
```
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=rabbitmq
RABBITMQ_PASSWORD=rabbitmq
RABBITMQ_EXCHANGE=atelier_events
RABBITMQ_QUEUES_ORDER_EVENTS=order_events
RABBITMQ_QUEUES_NOTIFICATIONS=notifications
RABBITMQ_QUEUES_PAYMENT_EVENTS=payment_events
RABBITMQ_CONNECTION_RETRY_DELAY=5000
```

## Dependencies:

Make sure to install:
```bash
npm install amqplib @types/amqplib
```
