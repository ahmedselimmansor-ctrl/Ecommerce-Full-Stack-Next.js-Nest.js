import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductGallery } from '@/components/product/product-gallery';
import { AddToCartPanel } from '@/components/product/add-to-cart-panel';
import { ProductGrid } from '@/components/product/product-grid';
import { ReviewSection } from '@/components/product/review-section';
import { Price } from '@/components/ui/price';
import { RatingStars } from '@/components/ui/rating-stars';
import { getProduct, getProductReviews } from '@/lib/queries';
import { fmt, getDictionary, localized, toLocale } from '@/i18n';
import { FREE_SHIPPING_THRESHOLD_CENTS, SITE_URL } from '@/lib/env';
import { formatPrice } from '@/lib/utils';

export const revalidate = 60;

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = toLocale(rawLocale);
  const product = await getProduct(slug);
  if (!product) return { title: '404' };

  const name = localized(locale, product.name, product.nameAr);
  const description = localized(locale, product.description, product.descriptionAr).slice(0, 155);

  return {
    title: name,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}/products/${slug}`,
      languages: {
        en: `${SITE_URL}/en/products/${slug}`,
        ar: `${SITE_URL}/ar/products/${slug}`,
      },
    },
    openGraph: {
      title: name,
      description,
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale = toLocale(rawLocale);
  const t = getDictionary(locale);

  const product = await getProduct(slug);
  if (!product) notFound();

  const reviews = await getProductReviews(slug).catch(() => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  }));

  const name = localized(locale, product.name, product.nameAr);
  const description = localized(locale, product.description, product.descriptionAr);
  const categoryName = localized(locale, product.category.name, product.category.nameAr);

  // Product structured data so the listing can surface price and availability
  // in search results.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: product.images.map((image) => image.url),
    sku: product.variants[0]?.sku,
    inLanguage: locale,
    offers: {
      '@type': 'Offer',
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: product.currency,
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    ...(product.ratingCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.ratingAvg,
        reviewCount: product.ratingCount,
      },
    }),
  };

  const details = [
    { label: t.product.material, value: localized(locale, product.material ?? '', product.materialAr) },
    { label: t.product.care, value: localized(locale, product.care ?? '', product.careAr) },
    {
      label: t.product.shipping,
      value: fmt(t.product.shippingBody, {
        threshold: formatPrice(FREE_SHIPPING_THRESHOLD_CENTS, product.currency, locale),
      }),
    },
  ].filter((detail) => detail.value);

  return (
    <div className="container-page py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-xs text-ink-faint">
        <Link href={`/${locale}`} className="hover:text-ink">
          {t.product.breadcrumbHome}
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/${locale}/products?category=${product.category.slug}`} className="hover:text-ink">
          {categoryName}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-ink-soft">{name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={product.images} productName={name} />

        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">{categoryName}</p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl">{name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <Price
              cents={product.priceCents}
              compareAtCents={product.compareAtCents}
              currency={product.currency}
              size="lg"
            />
            {product.ratingCount > 0 && (
              <RatingStars
                value={product.ratingAvg}
                count={product.ratingCount}
                label={fmt(t.product.ratedLabel, { value: product.ratingAvg.toFixed(1) })}
              />
            )}
          </div>

          <p className="mt-6 text-sm leading-relaxed text-ink-soft">{description}</p>

          <div className="mt-8 border-t border-line pt-8">
            <AddToCartPanel product={product} />
          </div>

          <dl className="mt-10 space-y-3 border-t border-line pt-6 text-xs">
            {details.map((detail) => (
              <div key={detail.label} className="flex gap-4">
                <dt className="w-24 shrink-0 uppercase tracking-[0.1em] tracking-wide-latin text-ink-faint">
                  {detail.label}
                </dt>
                <dd className="text-ink-soft">{detail.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-20">
        <ReviewSection
          slug={slug}
          reviews={reviews.items}
          ratingAvg={product.ratingAvg}
          ratingCount={product.ratingCount}
        />
      </div>

      {product.related.length > 0 && (
        <section className="mt-20 border-t border-line pt-12">
          <h2 className="mb-8 font-display text-2xl">{t.product.relatedTitle}</h2>
          <ProductGrid products={product.related} priorityCount={0} />
        </section>
      )}
    </div>
  );
}
