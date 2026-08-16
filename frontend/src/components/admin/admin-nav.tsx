'use client';

import { usePathname } from 'next/navigation';
import { ArrowLeft, BarChart3, FolderTree, Package, ShoppingCart } from 'lucide-react';
import { Link, useI18n } from '@/i18n/provider';
import { stripLocale } from '@/i18n';
import { cn } from '@/lib/utils';

export function AdminNav() {
  const { t } = useI18n();
  const pathname = stripLocale(usePathname());

  const items = [
    { href: '/admin', label: t.admin.navOverview, icon: BarChart3, exact: true },
    { href: '/admin/products', label: t.admin.navProducts, icon: Package, exact: false },
    { href: '/admin/categories', label: t.admin.navCategories, icon: FolderTree, exact: false },
    { href: '/admin/orders', label: t.admin.navOrders, icon: ShoppingCart, exact: false },
  ];

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-line pb-3" aria-label={t.admin.console}>
      {items.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 text-xs transition-colors',
              isActive ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-dim hover:text-ink',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}

      <Link
        href="/"
        className="ms-auto inline-flex items-center gap-2 px-3 py-2 text-xs text-ink-faint transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4 flip-rtl" aria-hidden />
        {t.admin.backToStore}
      </Link>
    </nav>
  );
}
