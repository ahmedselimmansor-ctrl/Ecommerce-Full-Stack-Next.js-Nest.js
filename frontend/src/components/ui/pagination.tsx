'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useI18n } from '@/i18n/provider';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Current query string without the `page` key, e.g. `category=shirts`. */
  baseQuery: string;
  /** Locale-less base path, e.g. `/products` or `/admin/orders`. */
  basePath?: string;
}

export function Pagination({ page, totalPages, baseQuery, basePath = '/products' }: PaginationProps) {
  const { t } = useI18n();

  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams(baseQuery);
    if (target > 1) params.set('page', String(target));
    const query = params.toString();
    return `${basePath}${query ? `?${query}` : ''}`;
  };

  // Window of at most five page numbers centred on the current page.
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index).filter(
    (value) => value >= 1 && value <= totalPages,
  );

  return (
    <nav className="mt-14 flex items-center justify-center gap-2" aria-label={t.common.next}>
      {page > 1 && (
        <Link href={href(page - 1)} aria-label={t.common.previous} className="p-2 text-ink-soft hover:text-ink">
          {/* Chevrons follow the reading direction, so they flip in Arabic. */}
          <ChevronLeft className="size-4 flip-rtl" aria-hidden />
        </Link>
      )}

      {pages.map((value) => (
        <Link
          key={value}
          href={href(value)}
          aria-current={value === page ? 'page' : undefined}
          className={cn(
            'flex size-9 items-center justify-center text-xs tabular-nums transition-colors',
            value === page ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-dim hover:text-ink',
          )}
        >
          {value}
        </Link>
      ))}

      {page < totalPages && (
        <Link href={href(page + 1)} aria-label={t.common.next} className="p-2 text-ink-soft hover:text-ink">
          <ChevronRight className="size-4 flip-rtl" aria-hidden />
        </Link>
      )}
    </nav>
  );
}
