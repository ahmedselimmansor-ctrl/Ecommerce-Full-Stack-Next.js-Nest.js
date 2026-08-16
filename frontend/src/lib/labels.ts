import type { Dictionary } from '@/i18n';
import type { Gender, OrderStatus, PaymentMethod, PaymentStatus } from '@/types';

/**
 * Enum values arrive from the API as stable identifiers (`SHIPPED`,
 * `CASH_ON_DELIVERY`). These map them to the active dictionary so no component
 * hard-codes a user-facing string for a backend enum.
 */
export function orderStatusLabel(status: OrderStatus, t: Dictionary): string {
  const map: Record<OrderStatus, string> = {
    PENDING: t.orders.statusPending,
    PAID: t.orders.statusPaid,
    PROCESSING: t.orders.statusProcessing,
    SHIPPED: t.orders.statusShipped,
    DELIVERED: t.orders.statusDelivered,
    CANCELLED: t.orders.statusCancelled,
    REFUNDED: t.orders.statusRefunded,
  };
  return map[status] ?? status;
}

export function paymentStatusLabel(status: PaymentStatus, t: Dictionary): string {
  const map: Record<PaymentStatus, string> = {
    UNPAID: t.payment.statusUnpaid,
    AWAITING_PAYMENT: t.payment.statusAwaiting,
    PAID: t.payment.statusPaid,
    FAILED: t.payment.statusFailed,
    REFUNDED: t.payment.statusRefunded,
  };
  return map[status] ?? status;
}

export function paymentMethodLabel(method: PaymentMethod, t: Dictionary): string {
  return method === 'CARD' ? t.payment.methodCard : t.payment.methodCod;
}

export function genderLabel(gender: Gender, t: Dictionary): string {
  const map: Record<Gender, string> = {
    MEN: t.products.genderMen,
    WOMEN: t.products.genderWomen,
    UNISEX: t.products.genderUnisex,
    KIDS: t.products.genderKids,
  };
  return map[gender] ?? gender;
}
