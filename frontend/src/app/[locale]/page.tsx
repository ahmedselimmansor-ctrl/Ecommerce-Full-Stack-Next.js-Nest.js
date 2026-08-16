import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProductGrid } from '@/components/product/product-grid';
import { getCategories, getFeaturedProducts } from '@/lib/queries';
import { fmt, getDictionary, localized, toLocale } from '@/i18n';
import { FREE_SHIPPING_THRESHOLD_CENTS } from '@/lib/env';
import { formatPrice } from '@/lib/utils';
import type { CategoryNode, ProductSummary } from '@/types';

export const revalidate = 60;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = toLocale((await params).locale);
  const t = getDictionary(locale);

  const [featured, categories] = await Promise.all([
    getFeaturedProducts().catch((): ProductSummary[] => []),
    getCategories().catch((): CategoryNode[] => []),
  ]);

  const threshold = formatPrice(FREE_SHIPPING_THRESHOLD_CENTS, undefined, locale);

  const perks = [
    { title: fmt(t.home.perkShippingTitle, { threshold }), body: t.home.perkShippingBody },
    { title: t.home.perkCodTitle, body: t.home.perkCodBody },
    { title: t.home.perkReturnsTitle, body: t.home.perkReturnsBody },
  ];

  return (
    <>
      <section className="relative isolate flex min-h-[70vh] items-end overflow-hidden bg-paper-dim">
        <Image
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&h=1080&q=80"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden />

        <div className="container-page relative pb-16">
          <p className="text-[0.6875rem] uppercase tracking-[0.24em] tracking-wide-latin text-white/80">
            {t.home.season}
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl leading-tight text-white md:text-6xl">
            {t.home.heroTitle}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/85">{t.home.heroBody}</p>
          <Link
            href={`/${locale}/products`}
            className="mt-8 inline-flex items-center gap-2 bg-paper px-8 py-4 text-xs uppercase tracking-[0.16em] tracking-wide-latin text-ink transition-opacity hover:opacity-90"
          >
            {t.home.heroCta}
            <ArrowRight className="size-4 flip-rtl" aria-hidden />
          </Link>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="container-page py-16">
          <h2 className="eyebrow mb-6">{t.home.shopByCategory}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {categories.slice(0, 6).map((category) => (
              <Link key={category.id} href={`/${locale}/products?category=${category.slug}`} className="group">
                <div className="relative aspect-square overflow-hidden bg-paper-dim">
                  {category.imageUrl && (
                    <Image
                      src={category.imageUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 16vw, 45vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.12em] tracking-wide-latin">
                  {localized(locale, category.name, category.nameAr)}
                </p>
                <p className="text-xs text-ink-faint">{fmt(t.home.piecesCount, { count: category.productCount })}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="container-page py-8 pb-20">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="eyebrow">{t.home.selected}</p>
              <h2 className="mt-1 font-display text-3xl">{t.home.editTitle}</h2>
            </div>
            <Link
              href={`/${locale}/products`}
              className="hidden items-center gap-2 border-b border-ink pb-0.5 text-xs uppercase tracking-[0.14em] tracking-wide-latin md:inline-flex"
            >
              {t.home.viewAll}
              <ArrowRight className="size-3.5 flip-rtl" aria-hidden />
            </Link>
          </div>

          <ProductGrid products={featured} />
        </section>
      )}

      <section className="border-y border-line bg-paper-dim">
        <div className="container-page grid gap-8 py-14 md:grid-cols-3">
          {perks.map((perk) => (
            <div key={perk.title}>
              <h3 className="text-sm">{perk.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">{perk.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
