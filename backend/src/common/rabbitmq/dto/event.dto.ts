import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';

// Base Event DTO
export class BaseEventDto {
  eventId: string;
  timestamp: Date;
  eventType: string;
  version: string;
  correlationId?: string;
  userId?: string;
}

// Order Item DTO
export class OrderEventItemDto {
  productId: string;
  productName: string;
  productSlug: string;
  quantity: number;
  priceCents: number;
  variantId?: string;
  imageUrl?: string;
}

// Shipping Address DTO
export class OrderEventShippingAddressDto {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode?: string;
  country?: string;
}

// Order Created Event
export class OrderCreatedEventDto extends BaseEventDto {
  orderId: string;
  items: OrderEventItemDto[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  paymentMethod: PaymentMethod;
  shippingAddress: OrderEventShippingAddressDto;
  notes?: string;
}

// Order Updated Event
export class OrderUpdatedEventDto extends BaseEventDto {
  orderId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  paymentRef?: string;
  reason?: string;
  totalCents?: number;
}

// Order Cancelled Event
export class OrderCancelledEventDto extends BaseEventDto {
  orderId: string;
  previousStatus: OrderStatus;
  reason: string;
  notes?: string;
  refunded?: boolean;
}

// Payment Event
export class PaymentEventDto extends BaseEventDto {
  paymentId: string;
  orderId?: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string;
  gatewayReference?: string;
  failureReason?: string;
}

// Notification Event
export class NotificationEventDto extends BaseEventDto {
  notificationId: string;
  recipientId: string;
  title: string;
  message: string;
  channel: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  metadata?: Record<string, any>;
}

// Inventory Update Event
export class InventoryUpdateEventDto extends BaseEventDto {
  productId: string;
  variantId: string;
  previousQuantity: number;
  newQuantity: number;
  delta: number;
  reason: string;
  orderId?: string;
}

// Message Payload Wrapper
export class RabbitMQMessagePayload<T> {
  messageId: string;
  timestamp: Date;
  routingKey: string;
  data: T;
  metadata?: Record<string, any>;

  static create<T>(data: T, routingKey: string): RabbitMQMessagePayload<T> {
    return {
      messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      routingKey,
      data,
    };
  }
}
