import { Plus } from 'lucide-react';
import { Link } from '@/i18n/provider';
import { getAdminProducts } from '@/lib/queries';
import { getDictionary, toLocale } from '@/i18n';
import { AdminProductTable } from '@/components/admin/admin-product-table';
import { AdminProductFilters } from '@/components/admin/admin-product-filters';
import { Pagination } from '@/components/ui/pagination';

export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const locale = toLocale((await params).locale);
  const t = getDictionary(locale);
  const query = await searchParams;

  const products = await getAdminProducts(query);

  const baseQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key !== 'page' && value) baseQuery.set(key, value);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl">{t.admin.productsTitle}</h2>
        <Link
          href="/admin/products/new"
          className="inline-flex h-10 items-center gap-2 bg-ink px-4 text-xs uppercase tracking-[0.12em] tracking-wide-latin text-paper transition-colors hover:bg-ink-soft"
        >
          <Plus className="size-4" aria-hidden />
          {t.admin.newProduct}
        </Link>
      </div>

      <AdminProductFilters />

      <AdminProductTable products={products.items} />

      <Pagination
        page={products.page}
        totalPages={products.totalPages}
        baseQuery={baseQuery.toString()}
        basePath="/admin/products"
      />
    </div>
  );
}
