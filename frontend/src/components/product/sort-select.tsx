'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { useT } from '@/i18n/provider';

export function SortSelect() {
  const t = useT();
  const options = [
    { value: 'newest', label: t.products.sortNewest },
    { value: 'price_asc', label: t.products.sortPriceAsc },
    { value: 'price_desc', label: t.products.sortPriceDesc },
    { value: 'rating', label: t.products.sortRating },
    { value: 'name', label: t.products.sortName },
  ];

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-xs text-ink-soft">
      <span className="sr-only sm:not-sr-only">{t.products.sort}</span>
      <select
        value={searchParams.get('sort') ?? 'newest'}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set('sort', event.target.value);
          params.delete('page');
          startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
        }}
        className="border border-line bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-ink"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
