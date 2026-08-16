'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { CartLineItem } from './cart-line-item';
import { selectSubtotalCents, useCartStore } from '@/store/cart-store';
import { Link, useI18n } from '@/i18n/provider';
import { fmt } from '@/i18n';
import { formatPrice } from '@/lib/utils';
import { FREE_SHIPPING_THRESHOLD_CENTS } from '@/lib/env';

export function CartDrawer() {
  const { t, locale, dir } = useI18n();
  const isOpen = useCartStore((state) => state.isDrawerOpen);
  const closeDrawer = useCartStore((state) => state.closeDrawer);
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore(selectSubtotalCents);

  // Escape closes, and the background is locked while the panel is open.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer();
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, closeDrawer]);

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotal);
  // The panel slides in from the reading-end edge: right in English, left in Arabic.
  const hiddenTransform = dir === 'rtl' ? '-translate-x-full' : 'translate-x-full';

  return (
    <>
      <div
        onClick={closeDrawer}
        aria-hidden
        className={`fixed inset-0 z-40 bg-ink/30 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t.cart.yourBag}
        className={`fixed top-0 z-50 flex h-dvh w-full max-w-md flex-col bg-paper shadow-xl transition-transform duration-300 ease-out end-0 ${
          isOpen ? 'translate-x-0' : hiddenTransform
        }`}
        style={{ insetInlineEnd: 0 }}
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="font-display text-lg">
            {t.cart.yourBag} <span className="text-ink-faint">({items.length})</span>
          </h2>
          <button type="button" onClick={closeDrawer} aria-label={t.common.close} className="text-ink-soft hover:text-ink">
            <X className="size-5" aria-hidden />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-sm text-ink-soft">{t.cart.empty}</p>
            <Link
              href="/products"
              onClick={closeDrawer}
              className="border-b border-ink pb-0.5 text-xs uppercase tracking-[0.14em] tracking-wide-latin"
            >
              {t.cart.browse}
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
              {items.map((item) => (
                <CartLineItem key={item.variantId} item={item} compact />
              ))}
            </ul>

            <footer className="border-t border-line px-6 py-5">
              {remaining > 0 ? (
                <p className="mb-4 text-xs text-ink-soft">
                  {fmt(t.cart.addForFreeShipping, { amount: formatPrice(remaining, undefined, locale) })}
                </p>
              ) : (
                <p className="mb-4 text-xs text-sage">{t.cart.qualifiedFreeShipping}</p>
              )}

              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-ink-soft">{t.common.subtotal}</span>
                <span className="tabular-nums">{formatPrice(subtotal, undefined, locale)}</span>
              </div>

              <Link
                href="/checkout"
                onClick={closeDrawer}
                className="mb-2 flex h-12 w-full items-center justify-center bg-ink text-xs uppercase tracking-[0.14em] tracking-wide-latin text-paper transition-colors hover:bg-ink-soft"
              >
                {t.cart.checkoutShort}
              </Link>

              <Link
                href="/cart"
                onClick={closeDrawer}
                className="block text-center text-xs uppercase tracking-[0.14em] tracking-wide-latin text-ink-soft hover:text-ink"
              >
                {t.cart.viewFullBag}
              </Link>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
