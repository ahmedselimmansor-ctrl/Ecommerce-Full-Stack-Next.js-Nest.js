'use client';

import { useLocale } from '@/i18n/provider';
import { cn, discountPercent, formatPrice } from '@/lib/utils';

interface PriceProps {
  cents: number;
  compareAtCents?: number | null;
  currency?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
};

export function Price({ cents, compareAtCents, currency, className, size = 'md' }: PriceProps) {
  const locale = useLocale();
  const discount = discountPercent(cents, compareAtCents ?? null);

  return (
    <span className={cn('inline-flex items-baseline gap-2', SIZES[size], className)}>
      <span className={cn('tabular-nums', discount && 'text-clay')}>{formatPrice(cents, currency, locale)}</span>
      {discount && (
        <>
          <span className="text-xs tabular-nums text-ink-faint line-through">
            {formatPrice(compareAtCents!, currency, locale)}
          </span>
          <span className="text-[0.625rem] uppercase tracking-[0.12em] text-clay">−{discount}%</span>
        </>
      )}
    </span>
  );
}
