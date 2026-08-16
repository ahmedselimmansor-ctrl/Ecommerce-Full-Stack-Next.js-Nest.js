import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ProfileForm } from '@/components/forms/profile-form';
import { getAddresses, getCurrentUser, getOrders } from '@/lib/queries';
import { fmt, getDictionary, toLocale } from '@/i18n';
import { orderStatusLabel } from '@/lib/labels';
import { formatDate, formatPrice, ORDER_STATUS_TONE } from '@/lib/utils';
import type { Address } from '@/types';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = getDictionary(toLocale((await params).locale));
  return { title: t.account.title, robots: { index: false, follow: false } };
}

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = toLocale((await params).locale);
  const t = getDictionary(locale);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/account`);

  const [orders, addresses] = await Promise.all([
    getOrders(1).catch(() => ({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 })),
    getAddresses().catch((): Address[] => []),
  ]);

  return (
    <div className="container-page py-10">
      <header className="mb-10">
        <p className="eyebrow">{t.account.title}</p>
        <h1 className="mt-2 font-display text-4xl">{fmt(t.account.greeting, { name: user.firstName })}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {fmt(t.account.memberSince, { date: formatDate(user.createdAt, locale) })}
        </p>
      </header>

      <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="eyebrow mb-5">{t.account.profileDetails}</h2>
          <ProfileForm user={user} />
        </section>

        <aside className="space-y-10">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="eyebrow">{t.account.recentOrders}</h2>
              <Link href={`/${locale}/orders`} className="text-xs text-ink-soft underline-offset-4 hover:underline">
                {t.account.viewAll}
              </Link>
            </div>

            {orders.items.length === 0 ? (
              <p className="text-sm text-ink-soft">{t.account.noOrders}</p>
            ) : (
              <ul className="space-y-3">
                {orders.items.slice(0, 3).map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/${locale}/orders/${order.id}`}
                      className="block border border-line bg-surface p-4 transition-colors hover:border-ink"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs tabular-nums">{order.orderNumber}</span>
                        <span
                          className={`px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.1em] ${ORDER_STATUS_TONE[order.status]}`}
                        >
                          {orderStatusLabel(order.status, t)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-ink-faint">
                        {formatDate(order.createdAt, locale)} · {formatPrice(order.totalCents, order.currency, locale)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="eyebrow mb-4">{t.account.savedAddresses}</h2>
            {addresses.length === 0 ? (
              <p className="text-sm text-ink-soft">{t.account.noAddresses}</p>
            ) : (
              <ul className="space-y-3">
                {addresses.map((address) => (
                  <li key={address.id} className="border border-line bg-surface p-4 text-xs leading-relaxed">
                    <p className="text-sm">{address.fullName}</p>
                    <p className="mt-1 text-ink-soft">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ''}
                      <br />
                      {address.city}, {address.state}
                      <br />
                      <span dir="ltr">{address.phone}</span>
                    </p>
                    {address.isDefault && (
                      <p className="mt-2 text-[0.625rem] uppercase tracking-[0.1em]">{t.account.defaultAddress}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
