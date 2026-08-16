'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 350;

export function AdminProductFilters() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [term, setTerm] = useState(searchParams.get('q') ?? '');
  const status = searchParams.get('status') ?? 'all';

  const apply = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete('page');
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  // Debounced so typing does not fire one request per keystroke.
  useEffect(() => {
    const current = searchParams.get('q') ?? '';
    if (term === current) return;

    const timer = setTimeout(() => {
      apply((params) => {
        if (term.trim()) params.set('q', term.trim());
        else params.delete('q');
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const statuses = [
    { value: 'all', label: t.admin.filterAll },
    { value: 'active', label: t.admin.filterActive },
    { value: 'inactive', label: t.admin.filterInactive },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="relative flex-1 sm:max-w-xs">
        <span className="sr-only">{t.admin.searchProducts}</span>
        <Search className="absolute top-1/2 size-4 -translate-y-1/2 text-ink-faint start-3" aria-hidden />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={t.admin.searchProducts}
          className="field ps-9"
        />
      </label>

      <div className="flex items-center gap-1">
        {statuses.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() =>
              apply((params) => {
                if (option.value === 'all') params.delete('status');
                else params.set('status', option.value);
              })
            }
            aria-pressed={status === option.value}
            className={cn(
              'border px-3 py-2 text-xs transition-colors',
              status === option.value
                ? 'border-ink bg-ink text-paper'
                : 'border-line text-ink-soft hover:border-ink hover:text-ink',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
