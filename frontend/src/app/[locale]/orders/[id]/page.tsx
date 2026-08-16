import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CancelOrderButton } from '@/components/orders/cancel-order-button';
import { PayOrderButton } from '@/components/payment/pay-order-button';
import { getCurrentUser, getOrder } from '@/lib/queries';
import { fmt, getDictionary, localized, toLocale } from '@/i18n';
import { orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from '@/lib/labels';
import { formatDate, formatPrice, ORDER_STATUS_TONE, PAYMENT_STATUS_TONE } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = getDictionary(toLocale((await params).locale));
  return { title: t.orders.orderLabel, robots: { index: false, follow: false } };
}

const TIMELINE = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

export default async function OrderDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  const locale = toLocale(rawLocale);
  const t = getDictionary(locale);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/orders/${id}`);

  const order = await getOrder(id);
  if (!order) notFound();

  const isCancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';
  const currentStep = TIMELINE.indexOf(order.status as (typeof TIMELINE)[number]);
  const canCancel = order.status === 'PENDING' || order.status === 'PAID';
  // Card orders that were never completed stay payable.
  const canPay =
    order.paymentMethod === 'CARD' &&
    (order.paymentStatus === 'AWAITING_PAYMENT' || order.paymentStatus === 'FAILED' || order.paymentStatus === 'UNPAID') &&
    !isCancelled;

  return (
    <div className="container-page py-10">
      <Link href={`/${locale}/orders`} className="text-xs text-ink-soft underline-offset-4 hover:underline">
        <span aria-hidden>←</span> {t.orders.backToOrders}
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="eyebrow">{t.orders.orderLabel}</p>
          <h1 className="mt-2 font-display text-3xl tabular-nums">{order.orderNumber}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {fmt(t.orders.placedOn, { date: formatDate(order.createdAt, locale) })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {order.paymentStatus !== 'UNPAID' && (
            <span
              className={`px-3 py-1.5 text-[0.6875rem] uppercase tracking-[0.12em] ${PAYMENT_STATUS_TONE[order.paymentStatus]}`}
            >
              {paymentStatusLabel(order.paymentStatus, t)}
            </span>
          )}
          <span
            className={`px-3 py-1.5 text-[0.6875rem] uppercase tracking-[0.12em] ${ORDER_STATUS_TONE[order.status]}`}
          >
            {orderStatusLabel(order.status, t)}
          </span>
          {canPay && <PayOrderButton orderId={order.id} />}
          {canCancel && <CancelOrderButton orderId={order.id} />}
        </div>
      </header>

      {!isCancelled && (
        <ol className="my-10 grid grid-cols-5 gap-2" aria-label={t.orders.progressLabel}>
          {TIMELINE.map((step, index) => {
            const isDone = index <= currentStep;
            return (
              <li key={step} className="flex flex-col gap-2">
                <span className={`h-0.5 w-full ${isDone ? 'bg-ink' : 'bg-line'}`} aria-hidden />
                <span
                  className={`text-[0.625rem] uppercase tracking-[0.1em] ${isDone ? 'text-ink' : 'text-ink-faint'}`}
                >
                  {orderStatusLabel(step, t)}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="grid gap-12 lg:grid-cols-[1fr_340px]">
        <section>
          <h2 className="eyebrow mb-4">{t.orders.items}</h2>
          <ul className="divide-y divide-line border-y border-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 py-5">
                <Link
                  href={`/${locale}/products/${item.productSlug}`}
                  className="relative aspect-portrait w-20 shrink-0 bg-paper-dim"
                >
                  {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="80px" className="object-cover" />}
                </Link>

                <div className="flex flex-1 items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/${locale}/products/${item.productSlug}`}
                      className="text-sm underline-offset-4 hover:underline"
                    >
                      {localized(locale, item.productName, item.productNameAr)}
                    </Link>
                    <p className="mt-1 text-xs text-ink-faint">
                      {localized(locale, item.color, item.colorAr)} · {t.product.sizeLabel} {item.size} ·{' '}
                      {fmt(t.orders.qty, { count: item.quantity })}
                    </p>
                    <p className="mt-1 text-xs tabular-nums text-ink-faint">{fmt(t.orders.sku, { sku: item.sku })}</p>
                  </div>
                  <span className="text-sm tabular-nums">
                    {formatPrice(item.unitPriceCents * item.quantity, order.currency, locale)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-8">
          <div className="border border-line bg-surface p-6">
            <h2 className="eyebrow mb-4">{t.cart.summary}</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">{t.common.subtotal}</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotalCents, order.currency, locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">{t.common.shipping}</dt>
                <dd className="tabular-nums">
                  {order.shippingCents === 0
                    ? t.common.free
                    : formatPrice(order.shippingCents, order.currency, locale)}
                </dd>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between text-clay">
                  <dt>{t.common.discount}</dt>
                  <dd className="tabular-nums">−{formatPrice(order.discountCents, order.currency, locale)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-2 text-base">
                <dt>{t.common.total}</dt>
                <dd className="tabular-nums">{formatPrice(order.totalCents, order.currency, locale)}</dd>
              </div>
            </dl>

            <p className="mt-4 border-t border-line pt-4 text-xs text-ink-soft">
              {t.orders.paymentLabel}: {paymentMethodLabel(order.paymentMethod, t)}
            </p>
            {order.paymentRef && (
              <p className="mt-1 text-xs tabular-nums text-ink-faint" dir="ltr">
                {order.paymentRef}
              </p>
            )}
          </div>

          <div className="border border-line bg-surface p-6">
            <h2 className="eyebrow mb-4">{t.orders.shippingTo}</h2>
            <address className="text-xs not-italic leading-relaxed text-ink-soft">
              <span className="block text-sm text-ink">{order.shipFullName}</span>
              {order.shipLine1}
              {order.shipLine2 ? `, ${order.shipLine2}` : ''}
              <br />
              {order.shipCity}, {order.shipState}
              {order.shipPostalCode ? ` ${order.shipPostalCode}` : ''}
              <br />
              {order.shipCountry}
              <br />
              <span dir="ltr">{order.shipPhone}</span>
            </address>

            {order.notes && (
              <p className="mt-4 border-t border-line pt-4 text-xs text-ink-soft">
                <span className="text-ink">{t.orders.notesLabel}: </span>
                {order.notes}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
