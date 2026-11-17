import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQService } from './rabbitmq.service';
import { EventPublisher } from './publishers/event.publisher';
import { OrderConsumer } from './consumers/order.consumer';
import { NotificationConsumer } from './consumers/notification.consumer';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    RabbitMQService,
    EventPublisher,
    OrderConsumer,
    NotificationConsumer,
  ],
  exports: [
    RabbitMQService,
    EventPublisher,
    OrderConsumer,
    NotificationConsumer,
  ],
})
export class RabbitMQModule {}
