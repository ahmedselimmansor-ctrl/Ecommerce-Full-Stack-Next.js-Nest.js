import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { Package } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { getCurrentUser, getOrders } from '@/lib/queries';
import { getDictionary, plural, toLocale } from '@/i18n';
import { orderStatusLabel, paymentStatusLabel } from '@/lib/labels';
import { formatDate, formatPrice, ORDER_STATUS_TONE, PAYMENT_STATUS_TONE } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = getDictionary(toLocale((await params).locale));
  return { title: t.orders.historyTitle, robots: { index: false, follow: false } };
}

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const locale = toLocale((await params).locale);
  const t = getDictionary(locale);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/orders`);

  const page = Number((await searchParams).page ?? '1');
  const orders = await getOrders(Number.isFinite(page) && page > 0 ? page : 1);

  return (
    <div className="container-page py-10">
      <header className="mb-10">
        <p className="eyebrow">{t.account.title}</p>
        <h1 className="mt-2 font-display text-4xl">{t.orders.historyTitle}</h1>
      </header>

      {orders.items.length === 0 ? (
        <EmptyState
          icon={<Package className="size-8" aria-hidden />}
          title={t.orders.emptyTitle}
          description={t.orders.emptyBody}
          action={{ href: '/products', label: t.cart.startShopping }}
        />
      ) : (
        <ul className="space-y-4">
          {orders.items.map((order) => (
            <li key={order.id}>
              <Link
                href={`/${locale}/orders/${order.id}`}
                className="block border border-line bg-surface p-5 transition-colors hover:border-ink"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm tabular-nums">{order.orderNumber}</p>
                    <p className="mt-1 text-xs text-ink-faint">
                      {formatDate(order.createdAt, locale)} ·{' '}
                      {plural(order.items.length, t.orders.itemsOne, t.orders.itemsOther, {
                        count: order.items.length,
                      })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {order.paymentStatus !== 'UNPAID' && (
                      <span
                        className={`px-2 py-1 text-[0.625rem] uppercase tracking-[0.1em] ${PAYMENT_STATUS_TONE[order.paymentStatus]}`}
                      >
                        {paymentStatusLabel(order.paymentStatus, t)}
                      </span>
                    )}
                    <span
                      className={`px-2.5 py-1 text-[0.625rem] uppercase tracking-[0.1em] ${ORDER_STATUS_TONE[order.status]}`}
                    >
                      {orderStatusLabel(order.status, t)}
                    </span>
                    <span className="text-sm tabular-nums">
                      {formatPrice(order.totalCents, order.currency, locale)}
                    </span>
                  </div>
                </div>

                <ul className="mt-4 flex gap-2">
                  {order.items.slice(0, 5).map((item) => (
                    <li key={item.id} className="relative aspect-portrait w-12 bg-paper-dim">
                      {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="48px" className="object-cover" />}
                    </li>
                  ))}
                  {order.items.length > 5 && (
                    <li className="flex w-12 items-center justify-center text-xs text-ink-faint">
                      +{order.items.length - 5}
                    </li>
                  )}
                </ul>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {orders.totalPages > 1 && (
        <nav className="mt-10 flex justify-center gap-2" aria-label={t.common.next}>
          {Array.from({ length: orders.totalPages }, (_, index) => index + 1).map((value) => (
            <Link
              key={value}
              href={`/${locale}/orders?page=${value}`}
              aria-current={value === orders.page ? 'page' : undefined}
              className={`flex size-9 items-center justify-center text-xs tabular-nums ${
                value === orders.page ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-dim'
              }`}
            >
              {value}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
