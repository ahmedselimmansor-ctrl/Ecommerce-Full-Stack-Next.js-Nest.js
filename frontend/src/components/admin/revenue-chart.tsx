'use client';

import { useI18n } from '@/i18n/provider';
import { formatPrice } from '@/lib/utils';

interface RevenueChartProps {
  data: { date: string; revenueCents: number; orders: number }[];
}

/**
 * Daily revenue as a plain CSS bar chart.
 *
 * Deliberately dependency-free: a charting library would be a large client
 * bundle for one sparkline, and this reads the theme variables so it flips with
 * dark mode for free.
 */
export function RevenueChart({ data }: RevenueChartProps) {
  const { locale, t, dir } = useI18n();

  const max = Math.max(...data.map((point) => point.revenueCents), 1);
  const total = data.reduce((sum, point) => sum + point.revenueCents, 0);

  if (total === 0) {
    return (
      <div className="flex h-40 items-center justify-center border border-dashed border-line text-sm text-ink-soft">
        {t.admin.noData}
      </div>
    );
  }

  const dayFormatter = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="border border-line bg-surface p-5">
      <div
        className="flex h-40 items-end gap-1"
        // Bars read left-to-right as time even in RTL, because a time axis is
        // conventionally chronological in both directions here.
        style={{ direction: 'ltr' }}
        role="img"
        aria-label={`${t.admin.statRevenue}: ${formatPrice(total, undefined, locale)}`}
      >
        {data.map((point) => {
          const height = Math.max(2, Math.round((point.revenueCents / max) * 100));
          const label = `${dayFormatter.format(new Date(point.date))} — ${formatPrice(point.revenueCents, undefined, locale)}`;

          return (
            <div
              key={point.date}
              title={label}
              className="group relative flex-1 bg-ink/15 transition-colors hover:bg-ink"
              style={{ height: `${height}%` }}
            >
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap border border-line bg-surface px-2 py-1 text-[0.625rem] text-ink group-hover:block">
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex justify-between text-[0.625rem] text-ink-faint" style={{ direction: dir }}>
        <span>{dayFormatter.format(new Date(data[0]?.date ?? Date.now()))}</span>
        <span className="tabular-nums">{formatPrice(total, undefined, locale)}</span>
        <span>{dayFormatter.format(new Date(data[data.length - 1]?.date ?? Date.now()))}</span>
      </div>
    </div>
  );
}
