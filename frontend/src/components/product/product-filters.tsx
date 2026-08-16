'use client';

import { useCallback, useMemo, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { fmt, localized } from '@/i18n';
import { cn, formatPrice } from '@/lib/utils';
import type { CategoryNode, ProductFilters as Filters } from '@/types';

interface ProductFiltersProps {
  filters: Filters;
  categories: CategoryNode[];
}

/**
 * Filter state lives in the URL, not in React state: every filtered view is
 * shareable, survives a refresh, and is rendered on the server.
 */
export function ProductFilters({ filters, categories }: ProductFiltersProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const genders = [
    { value: 'WOMEN', label: t.products.genderWomen },
    { value: 'MEN', label: t.products.genderMen },
    { value: 'UNISEX', label: t.products.genderUnisex },
    { value: 'KIDS', label: t.products.genderKids },
  ];

  const activeSizes = useMemo(() => searchParams.getAll('size'), [searchParams]);
  const activeColors = useMemo(() => searchParams.getAll('color'), [searchParams]);
  const activeCategory = searchParams.get('category');
  const activeGender = searchParams.get('gender');
  const activeMaxPrice = searchParams.get('maxPrice');

  const push = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      // Any filter change invalidates the current page offset.
      params.delete('page');
      startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  const toggleMulti = (key: 'size' | 'color', value: string) =>
    push((params) => {
      const current = params.getAll(key);
      params.delete(key);
      const next = current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value];
      for (const entry of next) params.append(key, entry);
    });

  const setSingle = (key: string, value: string | null) =>
    push((params) => {
      if (value === null || params.get(key) === value) params.delete(key);
      else params.set(key, value);
    });

  const activeCount =
    activeSizes.length +
    activeColors.length +
    (activeCategory ? 1 : 0) +
    (activeGender ? 1 : 0) +
    (activeMaxPrice ? 1 : 0);

  return (
    <aside className="space-y-8" aria-label={t.products.filtersLabel}>
      <div className="flex items-center justify-between">
        <h2 className="eyebrow">{t.products.filter}</h2>
        <div className="flex items-center gap-3">
          {isPending && (
            <Loader2 className="size-3.5 animate-spin text-ink-faint" aria-label={t.products.updatingResults} />
          )}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
              className="inline-flex items-center gap-1 text-xs text-ink-faint underline-offset-4 hover:text-ink hover:underline"
            >
              <X className="size-3" aria-hidden />
              {fmt(t.products.clearCount, { count: activeCount })}
            </button>
          )}
        </div>
      </div>

      <FilterGroup title={t.products.category}>
        <ul className="space-y-1.5">
          {categories.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => setSingle('category', category.slug)}
                aria-pressed={activeCategory === category.slug}
                className={cn(
                  'flex w-full items-center justify-between text-start text-sm transition-colors',
                  activeCategory === category.slug ? 'text-ink' : 'text-ink-soft hover:text-ink',
                )}
              >
                <span className={cn(activeCategory === category.slug && 'underline underline-offset-4')}>
                  {localized(locale, category.name, category.nameAr)}
                </span>
                <span className="text-xs tabular-nums text-ink-faint">{category.productCount}</span>
              </button>
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title={t.products.department}>
        <div className="flex flex-wrap gap-2">
          {genders.map((gender) => (
            <Chip
              key={gender.value}
              isActive={activeGender === gender.value}
              onClick={() => setSingle('gender', gender.value)}
            >
              {gender.label}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title={t.products.size}>
        <div className="flex flex-wrap gap-2">
          {filters.sizes.map((size) => (
            <Chip key={size} isActive={activeSizes.includes(size)} onClick={() => toggleMulti('size', size)}>
              {size}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title={t.products.colour}>
        <ul className="flex flex-wrap gap-2.5">
          {filters.colors.map((color) => {
            const isActive = activeColors.includes(color.name);
            const label = localized(locale, color.name, color.nameAr);
            return (
              <li key={color.name}>
                <button
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={isActive}
                  onClick={() => toggleMulti('color', color.name)}
                  className={cn(
                    'size-7 rounded-full border transition-all',
                    isActive ? 'border-ink ring-1 ring-ink ring-offset-2 ring-offset-paper' : 'border-line',
                  )}
                  style={{ backgroundColor: color.hex ?? '#ddd' }}
                />
              </li>
            );
          })}
        </ul>
      </FilterGroup>

      <FilterGroup title={t.products.maxPrice}>
        <input
          type="range"
          min={filters.priceRange.minCents}
          max={filters.priceRange.maxCents}
          step={5000}
          value={activeMaxPrice ? Number(activeMaxPrice) : filters.priceRange.maxCents}
          onChange={(event) => setSingle('maxPrice', event.target.value)}
          className="w-full accent-[var(--color-ink)]"
          aria-label={t.products.maxPrice}
        />
        <div className="mt-2 flex justify-between text-xs tabular-nums text-ink-faint">
          <span>{formatPrice(filters.priceRange.minCents, undefined, locale)}</span>
          <span>
            {formatPrice(activeMaxPrice ? Number(activeMaxPrice) : filters.priceRange.maxCents, undefined, locale)}
          </span>
        </div>
      </FilterGroup>

      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={searchParams.get('inStock') === 'true'}
          onChange={(event) => setSingle('inStock', event.target.checked ? 'true' : null)}
          className="size-4 accent-[var(--color-ink)]"
        />
        {t.products.inStockOnly}
      </label>
    </aside>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5">
      <h3 className="eyebrow mb-3">{title}</h3>
      {children}
    </section>
  );
}

function Chip({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        'border px-3 py-1.5 text-xs uppercase tracking-[0.1em] transition-colors',
        isActive ? 'border-ink bg-ink text-paper' : 'border-line text-ink-soft hover:border-ink hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
