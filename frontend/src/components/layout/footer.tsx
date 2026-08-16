'use client';

import { Link, useI18n } from '@/i18n/provider';
import { fmt, localized } from '@/i18n';
import { FREE_SHIPPING_THRESHOLD_CENTS } from '@/lib/env';
import { formatPrice } from '@/lib/utils';
import type { CategoryNode } from '@/types';

export function Footer({ categories }: { categories: CategoryNode[] }) {
  const { t, locale } = useI18n();
  const threshold = formatPrice(FREE_SHIPPING_THRESHOLD_CENTS, undefined, locale);

  return (
    <footer className="mt-24 border-t border-line bg-paper-dim">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div>
          <p className="font-display text-lg uppercase tracking-[0.2em] tracking-wide-latin">{t.common.brand}</p>
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-ink-soft">{t.footer.about}</p>
        </div>

        <FooterColumn title={t.footer.shop}>
          {categories.slice(0, 5).map((category) => (
            <FooterLink key={category.id} href={`/products?category=${category.slug}`}>
              {localized(locale, category.name, category.nameAr)}
            </FooterLink>
          ))}
          <FooterLink href="/products">{t.nav.allProducts}</FooterLink>
        </FooterColumn>

        <FooterColumn title={t.footer.account}>
          <FooterLink href="/account">{t.footer.myAccount}</FooterLink>
          <FooterLink href="/orders">{t.footer.orderHistory}</FooterLink>
          <FooterLink href="/cart">{t.footer.bag}</FooterLink>
        </FooterColumn>

        <FooterColumn title={t.footer.help}>
          <FooterLink href="/products">{t.footer.shippingReturns}</FooterLink>
          <FooterLink href="/products">{t.footer.sizeGuide}</FooterLink>
          <FooterLink href="/products">{t.footer.contact}</FooterLink>
        </FooterColumn>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-ink-faint md:flex-row md:items-center md:justify-between">
          <p>{fmt(t.footer.rights, { year: new Date().getFullYear() })}</p>
          <p>{fmt(t.footer.perks, { threshold })}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="eyebrow">{title}</h3>
      <ul className="mt-3 space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-xs text-ink-soft transition-colors hover:text-ink">
        {children}
      </Link>
    </li>
  );
}
