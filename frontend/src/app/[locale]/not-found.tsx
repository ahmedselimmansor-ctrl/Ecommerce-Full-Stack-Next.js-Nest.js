'use client';

import { Link, useT } from '@/i18n/provider';

export default function NotFound() {
  const t = useT();

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-display text-4xl">{t.errors.notFoundTitle}</h1>
      <p className="mt-3 max-w-sm text-sm text-ink-soft">{t.errors.notFoundBody}</p>
      <Link
        href="/products"
        className="mt-8 border-b border-ink pb-0.5 text-xs uppercase tracking-[0.14em] tracking-wide-latin transition-opacity hover:opacity-60"
      >
        {t.cart.browse}
      </Link>
    </div>
  );
}
