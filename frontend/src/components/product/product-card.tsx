'use client';

import Image from 'next/image';
import { Price } from '@/components/ui/price';
import { RatingStars } from '@/components/ui/rating-stars';
import { Link, useI18n } from '@/i18n/provider';
import { fmt, localized, plural } from '@/i18n';
import type { ProductSummary } from '@/types';

interface ProductCardProps {
  product: ProductSummary;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const { t, locale } = useI18n();
  const [primary, secondary] = product.images;

  const name = localized(locale, product.name, product.nameAr);
  const categoryName = localized(locale, product.category.name, product.category.nameAr);

  return (
    <article className="group">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-portrait overflow-hidden bg-paper-dim">
          {primary && (
            <Image
              src={primary.url}
              alt={name}
              fill
              sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
              priority={priority}
              className="object-cover transition-opacity duration-500 group-hover:opacity-0"
            />
          )}
          {/* Second shot cross-fades on hover — a catalogue convention that costs
              nothing because the image is already in the payload. */}
          {secondary && (
            <Image
              src={secondary.url}
              alt=""
              fill
              sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}

          {!product.inStock && (
            <span className="absolute top-3 bg-ink px-2 py-1 text-[0.625rem] uppercase tracking-[0.14em] text-paper start-3">
              {t.products.soldOut}
            </span>
          )}
          {product.compareAtCents && product.inStock && (
            <span className="absolute top-3 bg-clay px-2 py-1 text-[0.625rem] uppercase tracking-[0.14em] text-white start-3">
              {t.products.sale}
            </span>
          )}
        </div>

        <div className="mt-3 space-y-1.5">
          <p className="eyebrow">{categoryName}</p>
          <h3 className="text-sm leading-snug">{name}</h3>
          <Price
            cents={product.priceCents}
            compareAtCents={product.compareAtCents}
            currency={product.currency}
            size="sm"
          />
          {product.ratingCount > 0 && (
            <RatingStars
              value={product.ratingAvg}
              count={product.ratingCount}
              size={12}
              label={fmt(t.product.ratedLabel, { value: product.ratingAvg.toFixed(1) })}
            />
          )}
        </div>
      </Link>

      {product.colors.length > 0 && (
        <ul
          className="mt-2 flex items-center gap-1.5"
          aria-label={plural(
            product.colors.length,
            t.products.coloursAvailable,
            t.products.coloursAvailable,
            { count: product.colors.length },
          )}
        >
          {product.colors.slice(0, 5).map((color) => (
            <li
              key={color.name}
              title={localized(locale, color.name, color.nameAr)}
              className="size-3 rounded-full border border-line"
              style={{ backgroundColor: color.hex ?? '#ddd' }}
            />
          ))}
          {product.colors.length > 5 && (
            <li className="text-[0.625rem] text-ink-faint">+{product.colors.length - 5}</li>
          )}
        </ul>
      )}
    </article>
  );
}
