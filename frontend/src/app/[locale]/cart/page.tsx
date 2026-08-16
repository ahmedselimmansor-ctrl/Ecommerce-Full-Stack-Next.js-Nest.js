'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { CartLineItem } from '@/components/cart/cart-line-item';
import { EmptyState } from '@/components/ui/empty-state';
import { selectSubtotalCents, useCartStore } from '@/store/cart-store';
import { Link, useI18n } from '@/i18n/provider';
import { formatPrice } from '@/lib/utils';
import { FLAT_SHIPPING_CENTS, FREE_SHIPPING_THRESHOLD_CENTS } from '@/lib/env';

export default function CartPage() {
  const { t, locale } = useI18n();
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore(selectSubtotalCents);

  // The bag is restored from localStorage, so the first paint must match the
  // server output to avoid a hydration mismatch.
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => setIsHydrated(true), []);

  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_CENTS;

  if (!isHydrated) {
    return <div className="container-page py-20" aria-busy="true" />;
  }

  return (
    <div className="container-page py-10">
      <h1 className="mb-8 font-display text-4xl">{t.cart.title}</h1>

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="size-8" aria-hidden />}
          title={t.cart.emptyTitle}
          description={t.cart.emptyBody}
          action={{ href: '/products', label: t.cart.startShopping }}
        />
      ) : (
        <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
          <ul className="divide-y divide-line border-y border-line">
            {items.map((item) => (
              <CartLineItem key={item.variantId} item={item} />
            ))}
          </ul>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border border-line bg-surface p-6">
              <h2 className="eyebrow mb-5">{t.cart.summary}</h2>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-soft">{t.common.subtotal}</dt>
                  <dd className="tabular-nums">{formatPrice(subtotal, undefined, locale)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-soft">{t.common.shipping}</dt>
                  <dd className="tabular-nums">
                    {shipping === 0 ? t.common.free : formatPrice(shipping, undefined, locale)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-line pt-3 text-base">
                  <dt>{t.common.total}</dt>
                  <dd className="tabular-nums">{formatPrice(subtotal + shipping, undefined, locale)}</dd>
                </div>
              </dl>

              <Link
                href="/checkout"
                className="mt-6 flex h-12 w-full items-center justify-center bg-ink text-xs uppercase tracking-[0.14em] tracking-wide-latin text-paper transition-colors hover:bg-ink-soft"
              >
                {t.cart.checkout}
              </Link>

              <Link
                href="/products"
                className="mt-3 block text-center text-xs text-ink-soft underline-offset-4 hover:underline"
              >
                {t.cart.continueShopping}
              </Link>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-ink-faint">{t.cart.priceNote}</p>
          </aside>
        </div>
      )}
    </div>
  );
}
