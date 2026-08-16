'use client';

import { usePathname, useRouter, useSearchParams, } from 'next/navigation';
import { useTransition } from 'react';
import { useT } from '@/i18n/provider';
import { orderStatusLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types';

const STATUSES: OrderStatus[] = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

export function AdminOrderFilters() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const active = searchParams.get('status');

  const select = (status: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === null || params.get('status') === status) params.delete('status');
    else params.set('status', status);
    params.delete('page');
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={() => select(null)}
        aria-pressed={!active}
        className={cn(
          'border px-3 py-2 text-xs transition-colors',
          !active ? 'border-ink bg-ink text-paper' : 'border-line text-ink-soft hover:border-ink hover:text-ink',
        )}
      >
        {t.admin.filterAll}
      </button>

      {STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => select(status)}
          aria-pressed={active === status}
          className={cn(
            'border px-3 py-2 text-xs transition-colors',
            active === status
              ? 'border-ink bg-ink text-paper'
              : 'border-line text-ink-soft hover:border-ink hover:text-ink',
          )}
        >
          {orderStatusLabel(status, t)}
        </button>
      ))}
    </div>
  );
}
