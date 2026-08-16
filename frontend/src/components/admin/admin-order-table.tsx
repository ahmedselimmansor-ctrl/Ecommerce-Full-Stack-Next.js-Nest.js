'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api, ClientApiError } from '@/lib/api-client';
import { Link, useI18n } from '@/i18n/provider';
import { plural } from '@/i18n';
import { orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from '@/lib/labels';
import { cn, formatDate, formatPrice, ORDER_STATUS_TONE, PAYMENT_STATUS_TONE } from '@/lib/utils';
import type { AdminOrder, OrderStatus } from '@/types';

const STATUSES: OrderStatus[] = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

export function AdminOrderTable({ orders }: { orders: AdminOrder[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    setPendingId(orderId);
    try {
      // Cancelling or refunding restocks the reserved units server-side.
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success(t.admin.statusUpdated);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : t.admin.statusFailed);
    } finally {
      setPendingId(null);
    }
  };

  if (orders.length === 0) {
    return (
      <p className="border border-dashed border-line px-6 py-16 text-center text-sm text-ink-soft">
        {t.admin.noOrders}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[58rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-paper-dim">
            <Th>{t.admin.colOrder}</Th>
            <Th>{t.admin.colCustomer}</Th>
            <Th>{t.admin.colDate}</Th>
            <Th className="text-end">{t.admin.colTotal}</Th>
            <Th>{t.admin.colPayment}</Th>
            <Th>{t.admin.updateStatus}</Th>
            <Th className="text-end">{t.common.actions}</Th>
          </tr>
        </thead>

        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-line last:border-0 hover:bg-paper-dim/50">
              <Td>
                <p className="tabular-nums">{order.orderNumber}</p>
                <p className="text-xs text-ink-faint">
                  {plural(order.items.length, t.orders.itemsOne, t.orders.itemsOther, {
                    count: order.items.length,
                  })}
                </p>
              </Td>

              <Td className="text-xs">
                <p>
                  {order.user.firstName} {order.user.lastName}
                </p>
                <p className="text-ink-faint" dir="ltr">
                  {order.user.email}
                </p>
              </Td>

              <Td className="text-xs text-ink-soft">{formatDate(order.createdAt, locale)}</Td>

              <Td className="text-end tabular-nums">{formatPrice(order.totalCents, order.currency, locale)}</Td>

              <Td>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-ink-soft">{paymentMethodLabel(order.paymentMethod, t)}</span>
                  <span
                    className={cn(
                      'w-fit px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.1em]',
                      PAYMENT_STATUS_TONE[order.paymentStatus],
                    )}
                  >
                    {paymentStatusLabel(order.paymentStatus, t)}
                  </span>
                </div>
              </Td>

              <Td>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'px-2 py-1 text-[0.625rem] uppercase tracking-[0.1em]',
                      ORDER_STATUS_TONE[order.status],
                    )}
                  >
                    {orderStatusLabel(order.status, t)}
                  </span>
                  <select
                    value={order.status}
                    disabled={pendingId === order.id}
                    onChange={(event) => updateStatus(order.id, event.target.value as OrderStatus)}
                    aria-label={t.admin.updateStatus}
                    className="border border-line bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-ink disabled:opacity-50"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {orderStatusLabel(status, t)}
                      </option>
                    ))}
                  </select>
                </div>
              </Td>

              <Td className="text-end">
                <Link
                  href={`/orders/${order.id}`}
                  className="text-xs text-ink-soft underline-offset-4 hover:text-ink hover:underline"
                >
                  {t.admin.viewOrder}
                </Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn('px-4 py-3 text-start text-xs font-normal text-ink-soft', className)}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 align-middle', className)}>{children}</td>;
}
