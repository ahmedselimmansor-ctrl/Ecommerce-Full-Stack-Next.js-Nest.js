import { getAdminOrders } from '@/lib/queries';
import { getDictionary, toLocale } from '@/i18n';
import { AdminOrderTable } from '@/components/admin/admin-order-table';
import { AdminOrderFilters } from '@/components/admin/admin-order-filters';
import { Pagination } from '@/components/ui/pagination';

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const locale = toLocale((await params).locale);
  const t = getDictionary(locale);
  const query = await searchParams;

  const orders = await getAdminOrders(query);

  const baseQuery = new URLSearchParams();
  if (query.status) baseQuery.set('status', query.status);

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl">{t.admin.ordersTitle}</h2>

      <AdminOrderFilters />

      <AdminOrderTable orders={orders.items} />

      <Pagination
        page={orders.page}
        totalPages={orders.totalPages}
        baseQuery={baseQuery.toString()}
        basePath="/admin/orders"
      />
    </div>
  );
}
