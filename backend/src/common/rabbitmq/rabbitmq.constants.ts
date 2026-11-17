// RabbitMQ Queue and Exchange Constants
// This file defines all RabbitMQ queue and exchange names used in the application.

export const RABBITMQ_EXCHANGE = 'atelier_events';

// Queue names
export const ORDER_EVENTS_QUEUE = 'order_events';
export const NOTIFICATIONS_QUEUE = 'notifications';
export const PAYMENT_EVENTS_QUEUE = 'payment_events';
export const INVENTORY_UPDATES_QUEUE = 'inventory_updates';

// Routing keys
export const ORDER_CREATED_ROUTING_KEY = 'order.created';
export const ORDER_UPDATED_ROUTING_KEY = 'order.updated';
export const ORDER_CANCELLED_ROUTING_KEY = 'order.cancelled';
export const PAYMENT_COMPLETED_ROUTING_KEY = 'payment.completed';
export const PAYMENT_FAILED_ROUTING_KEY = 'payment.failed';
export const STOCK_UPDATED_ROUTING_KEY = 'stock.updated';
export const NOTIFICATION_EMAIL_ROUTING_KEY = 'notification.email';
export const NOTIFICATION_SMS_ROUTING_KEY = 'notification.sms';

// Exchange types
export const EXCHANGE_TYPE_DIRECT = 'direct';
export const EXCHANGE_TYPE_FANOUT = 'fanout';
export const EXCHANGE_TYPE_TOPIC = 'topic';

// Dead Letter Exchange for failed messages
export const DLX_EXCHANGE = 'atelier_dlx';
export const DLX_QUEUE = 'atelier_dlx_queue';
