import { AlertTriangle, CreditCard, Package, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { getAdminStats } from '@/lib/queries';
import { fmt, getDictionary, toLocale } from '@/i18n';
import { orderStatusLabel } from '@/lib/labels';
import { formatNumber, formatPrice, ORDER_STATUS_TONE } from '@/lib/utils';
import { RevenueChart } from '@/components/admin/revenue-chart';

export default async function AdminOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = toLocale((await params).locale);
  const t = getDictionary(locale);
  const stats = await getAdminStats(30);

  const cards = [
    {
      label: t.admin.statRevenue,
      value: formatPrice(stats.revenueCents, undefined, locale),
      icon: TrendingUp,
    },
    { label: t.admin.statOrders, value: formatNumber(stats.orderCount, locale), icon: ShoppingBag },
    {
      label: t.admin.statAverage,
      value: formatPrice(stats.averageOrderCents, undefined, locale),
      icon: CreditCard,
    },
    { label: t.admin.statCustomers, value: formatNumber(stats.customerCount, locale), icon: Users },
  ];

  const secondary = [
    { label: t.admin.statPending, value: stats.pendingOrders },
    { label: t.admin.statAwaitingPayment, value: stats.awaitingPayment },
    { label: t.admin.statActiveProducts, value: stats.activeProducts },
    { label: t.admin.statOutOfStock, value: stats.outOfStockVariants },
  ];

  return (
    <div className="space-y-10">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="border border-line bg-surface p-5">
              <div className="flex items-center justify-between">
                <p className="eyebrow">{card.label}</p>
                <Icon className="size-4 text-ink-faint" aria-hidden />
              </div>
              <p className="mt-3 text-2xl tabular-nums">{card.value}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {secondary.map((item) => (
          <div key={item.label} className="border border-line bg-paper-dim px-4 py-3">
            <p className="text-xs text-ink-soft">{item.label}</p>
            <p className="mt-1 text-lg tabular-nums">{formatNumber(item.value, locale)}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="eyebrow mb-4">{fmt(t.admin.revenueLast30, { days: 30 })}</h2>
        <RevenueChart data={stats.revenueByDay} />
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        <section>
          <h2 className="eyebrow mb-4">{t.admin.ordersByStatus}</h2>
          {stats.ordersByStatus.length === 0 ? (
            <p className="text-sm text-ink-soft">{t.admin.noData}</p>
          ) : (
            <ul className="space-y-2">
              {stats.ordersByStatus.map((group) => (
                <li key={group.status} className="flex items-center justify-between gap-3">
                  <span
                    className={`px-2 py-1 text-[0.625rem] uppercase tracking-[0.1em] ${ORDER_STATUS_TONE[group.status]}`}
                  >
                    {orderStatusLabel(group.status, t)}
                  </span>
                  <span className="text-sm tabular-nums">{formatNumber(group.count, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="eyebrow mb-4">{t.admin.topProducts}</h2>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-ink-soft">{t.admin.noData}</p>
          ) : (
            <ul className="space-y-3">
              {stats.topProducts.map((product) => (
                <li key={product.productSlug} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{product.productName}</p>
                    <p className="text-xs text-ink-faint">
                      {fmt(t.admin.unitsSold, { count: formatNumber(product.unitsSold, locale) })}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                    {formatPrice(product.revenueCents, undefined, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="eyebrow mb-4 flex items-center gap-2">
            <AlertTriangle className="size-3.5 text-clay" aria-hidden />
            {t.admin.lowStock}
          </h2>
          {stats.lowStockVariants.length === 0 ? (
            <p className="text-sm text-ink-soft">{t.admin.lowStockEmpty}</p>
          ) : (
            <ul className="space-y-2">
              {stats.lowStockVariants.map((variant) => (
                <li key={variant.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate text-ink-soft">
                    {fmt(t.admin.lowStockLine, {
                      product: variant.productName,
                      size: variant.size,
                      colour: variant.color,
                    })}
                  </span>
                  <span className="shrink-0 tabular-nums text-clay">
                    {fmt(t.admin.remaining, { count: variant.stock })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="flex items-center gap-2 text-xs text-ink-faint">
        <Package className="size-3.5" aria-hidden />
        {t.admin.statActiveProducts}: {formatNumber(stats.activeProducts, locale)} ·{' '}
        {t.admin.filterInactive}: {formatNumber(stats.inactiveProducts, locale)}
      </section>
    </div>
  );
}
