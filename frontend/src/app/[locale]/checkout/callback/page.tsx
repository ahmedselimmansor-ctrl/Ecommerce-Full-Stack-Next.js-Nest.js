import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Link } from '@/i18n/provider';
import { getCurrentUser } from '@/lib/queries';
import { serverFetchOrNull } from '@/lib/api-server';
import { buildQuery, formatPrice } from '@/lib/utils';
import { fmt, getDictionary, toLocale } from '@/i18n';
import { PaymentPoller } from '@/components/payment/payment-poller';
import type { PaymentReconciliation } from '@/types';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = getDictionary(toLocale((await params).locale));
  return { title: t.payment.verifying, robots: { index: false, follow: false } };
}

/**
 * Where Kashier sends the shopper back to.
 *
 * The query string here is *not* proof of payment — the webhook is. This page
 * reads the order back from the API and reports whatever the server actually
 * recorded, so a shopper who edits the URL sees no change in outcome.
 */
export default async function PaymentCallbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = toLocale((await params).locale);
  const t = getDictionary(locale);
  const query = await searchParams;

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/orders`);

  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') flat[key] = value;
  }

  const result = await serverFetchOrNull<PaymentReconciliation>(
    `/payments/kashier/reconcile${buildQuery(flat)}`,
    { auth: true },
  );

  if (!result) {
    return (
      <Shell
        icon={<XCircle className="size-10 text-clay" aria-hidden />}
        title={t.payment.failedTitle}
        body={t.payment.failedBody}
      >
        <Link
          href="/orders"
          className="border-b border-ink pb-0.5 text-xs uppercase tracking-[0.14em] tracking-wide-latin"
        >
          {t.nav.orders}
        </Link>
      </Shell>
    );
  }

  const { order } = result;
  const total = formatPrice(order.totalCents, order.currency, locale);

  if (order.paymentStatus === 'PAID') {
    return (
      <Shell
        icon={<CheckCircle2 className="size-10 text-sage" aria-hidden />}
        title={t.payment.successTitle}
        body={fmt(t.payment.successBody, { number: order.orderNumber })}
        amount={total}
      >
        <Link
          href={`/orders/${order.id}`}
          className="border-b border-ink pb-0.5 text-xs uppercase tracking-[0.14em] tracking-wide-latin"
        >
          {t.payment.viewOrder}
        </Link>
      </Shell>
    );
  }

  if (order.paymentStatus === 'FAILED') {
    return (
      <Shell
        icon={<XCircle className="size-10 text-clay" aria-hidden />}
        title={t.payment.failedTitle}
        body={t.payment.failedBody}
        amount={total}
      >
        <Link
          href={`/orders/${order.id}`}
          className="border-b border-ink pb-0.5 text-xs uppercase tracking-[0.14em] tracking-wide-latin"
        >
          {t.payment.retry}
        </Link>
      </Shell>
    );
  }

  // Still awaiting the webhook. The poller re-checks for a short while rather
  // than leaving the shopper staring at an indefinite spinner.
  return (
    <Shell
      icon={<Clock className="size-10 text-ink-faint" aria-hidden />}
      title={t.payment.pendingTitle}
      body={fmt(t.payment.pendingBody, { number: order.orderNumber })}
      amount={total}
    >
      <PaymentPoller orderId={order.id} />
      <Link
        href={`/orders/${order.id}`}
        className="border-b border-ink pb-0.5 text-xs uppercase tracking-[0.14em] tracking-wide-latin"
      >
        {t.payment.viewOrder}
      </Link>
    </Shell>
  );
}

function Shell({
  icon,
  title,
  body,
  amount,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  amount?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      {icon}
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="max-w-md text-sm text-ink-soft">{body}</p>
      {amount && <p className="text-lg tabular-nums">{amount}</p>}
      <div className="mt-4 flex flex-col items-center gap-3">{children}</div>
    </div>
  );
}
