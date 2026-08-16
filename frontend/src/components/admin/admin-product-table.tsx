'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Pencil, PowerOff, Star } from 'lucide-react';
import { toast } from 'sonner';
import { api, ClientApiError, revalidateCatalogue } from '@/lib/api-client';
import { Link, useI18n } from '@/i18n/provider';
import { localized } from '@/i18n';
import { cn, formatNumber, formatPrice } from '@/lib/utils';
import type { AdminProduct } from '@/types';

export function AdminProductTable({ products }: { products: AdminProduct[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const deactivate = async (product: AdminProduct) => {
    if (!window.confirm(t.admin.deactivateConfirm)) return;

    setPendingId(product.id);
    try {
      // Soft delete: order history keeps pointing at a real product row.
      await api.delete(`/products/${product.id}`);
      await revalidateCatalogue();
      toast.success(t.admin.productDeactivated);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : t.admin.productFailed);
    } finally {
      setPendingId(null);
    }
  };

  if (products.length === 0) {
    return (
      <p className="border border-dashed border-line px-6 py-16 text-center text-sm text-ink-soft">
        {t.admin.noProducts}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[52rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-paper-dim text-start">
            <Th>{t.admin.colName}</Th>
            <Th>{t.admin.colCategory}</Th>
            <Th className="text-end">{t.admin.colPrice}</Th>
            <Th className="text-end">{t.admin.colStock}</Th>
            <Th className="text-end">{t.admin.colVariants}</Th>
            <Th>{t.admin.colStatus}</Th>
            <Th className="text-end">{t.common.actions}</Th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-line last:border-0 hover:bg-paper-dim/50">
              <Td>
                <div className="flex items-center gap-3">
                  <div className="relative aspect-portrait w-10 shrink-0 bg-paper-dim">
                    {product.images[0] && (
                      <Image
                        src={product.images[0].url}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate">{localized(locale, product.name, product.nameAr)}</p>
                    <p className="truncate text-xs text-ink-faint" dir="ltr">
                      {product.slug}
                    </p>
                  </div>
                  {product.isFeatured && (
                    <Star className="size-3.5 shrink-0 fill-ink text-ink" aria-label={t.admin.featured} />
                  )}
                </div>
              </Td>

              <Td className="text-xs text-ink-soft">
                {localized(locale, product.category.name, product.category.nameAr)}
              </Td>

              <Td className="text-end tabular-nums">
                {formatPrice(product.priceCents, product.currency, locale)}
              </Td>

              <Td
                className={cn(
                  'text-end tabular-nums',
                  product.totalStock === 0 ? 'text-clay' : product.totalStock < 20 ? 'text-clay-soft' : '',
                )}
              >
                {formatNumber(product.totalStock, locale)}
              </Td>

              <Td className="text-end tabular-nums text-ink-soft">{formatNumber(product.variantCount, locale)}</Td>

              <Td>
                <span
                  className={cn(
                    'px-2 py-1 text-[0.625rem] uppercase tracking-[0.1em]',
                    product.isActive ? 'bg-sage/15 text-sage' : 'bg-paper-dim text-ink-faint',
                  )}
                >
                  {product.isActive ? t.admin.active : t.admin.inactive}
                </span>
              </Td>

              <Td className="text-end">
                <div className="inline-flex items-center gap-1">
                  <Link
                    href={`/admin/products/${product.id}`}
                    aria-label={t.common.edit}
                    title={t.common.edit}
                    className="p-2 text-ink-soft transition-colors hover:text-ink"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Link>

                  {product.isActive && (
                    <button
                      type="button"
                      onClick={() => deactivate(product)}
                      disabled={pendingId === product.id}
                      aria-label={t.admin.deactivate}
                      title={t.admin.deactivate}
                      className="p-2 text-ink-soft transition-colors hover:text-clay disabled:opacity-40"
                    >
                      <PowerOff className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn('px-4 py-3 text-start text-xs font-normal text-ink-soft', className)}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 align-middle', className)}>{children}</td>;
}
