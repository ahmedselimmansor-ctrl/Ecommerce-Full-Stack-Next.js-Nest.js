import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchX } from 'lucide-react';
import { ProductGrid } from '@/components/product/product-grid';
import { ProductFilters } from '@/components/product/product-filters';
import { SortSelect } from '@/components/product/sort-select';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { getCategories, getProductFilters, searchProducts } from '@/lib/queries';
import { getDictionary, localized, plural, toLocale } from '@/i18n';

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = getDictionary(locale);
  return { title: t.products.allProducts };
}

function toArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const locale = toLocale((await params).locale);
  const t = getDictionary(locale);
  const search = await searchParams;

  const query = {
    q: first(search.q),
    category: first(search.category),
    gender: first(search.gender),
    size: toArray(search.size),
    color: toArray(search.color),
    minPrice: first(search.minPrice),
    maxPrice: first(search.maxPrice),
    inStock: first(search.inStock),
    sort: first(search.sort),
    page: first(search.page) ?? '1',
  };

  const [results, filters, categories] = await Promise.all([
    searchProducts(query),
    getProductFilters(),
    getCategories(),
  ]);

  // Rebuilt without `page` so pagination links keep the active filters.
  const baseQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (key === 'page' || value === undefined) continue;
    for (const entry of Array.isArray(value) ? value : [value]) baseQuery.append(key, entry);
  }

  const activeCategory = categories.find((category) => category.slug === query.category);

  return (
    <div className="container-page py-10">
      <header className="mb-10">
        <p className="eyebrow">{query.q ? t.products.searchLabel : t.products.collection}</p>
        <h1 className="mt-2 font-display text-4xl">
          {query.q
            ? `“${query.q}”`
            : activeCategory
              ? localized(locale, activeCategory.name, activeCategory.nameAr)
              : t.products.allProducts}
        </h1>
        {activeCategory && (
          <p className="mt-2 max-w-lg text-sm text-ink-soft">
            {localized(locale, activeCategory.description ?? '', activeCategory.descriptionAr)}
          </p>
        )}
      </header>

      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <Suspense fallback={<div className="h-96" aria-hidden />}>
          <ProductFilters filters={filters} categories={categories} />
        </Suspense>

        <section>
          <div className="mb-6 flex items-center justify-between border-b border-line pb-4">
            <p className="text-xs tabular-nums text-ink-faint">
              {plural(results.total, t.products.resultsOne, t.products.resultsOther, { count: results.total })}
            </p>
            <Suspense fallback={null}>
              <SortSelect />
            </Suspense>
          </div>

          {results.items.length === 0 ? (
            <EmptyState
              icon={<SearchX className="size-8" aria-hidden />}
              title={t.products.emptyTitle}
              description={t.products.emptyBody}
              action={{ href: '/products', label: t.products.clearFilters }}
            />
          ) : (
            <>
              <ProductGrid products={results.items} />
              <Pagination page={results.page} totalPages={results.totalPages} baseQuery={baseQuery.toString()} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
