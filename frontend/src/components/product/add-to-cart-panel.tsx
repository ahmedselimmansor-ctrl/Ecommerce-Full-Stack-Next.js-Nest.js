'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { useCartStore } from '@/store/cart-store';
import { Link, useI18n } from '@/i18n/provider';
import { fmt, localized } from '@/i18n';
import { FREE_SHIPPING_THRESHOLD_CENTS } from '@/lib/env';
import { cn, formatPrice } from '@/lib/utils';
import type { ProductDetail } from '@/types';

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export function AddToCartPanel({ product }: { product: ProductDetail }) {
  const { t, locale } = useI18n();
  const addItem = useCartStore((state) => state.addItem);

  const colors = useMemo(() => {
    const map = new Map<string, { hex: string | null; ar: string | null }>();
    for (const variant of product.variants) {
      if (!map.has(variant.color)) map.set(variant.color, { hex: variant.colorHex, ar: variant.colorAr });
    }
    return [...map.entries()].map(([name, meta]) => ({ name, hex: meta.hex, nameAr: meta.ar }));
  }, [product.variants]);

  const sizes = useMemo(() => {
    const unique = [...new Set(product.variants.map((variant) => variant.size))];
    return unique.sort((a, b) => {
      const indexA = SIZE_ORDER.indexOf(a);
      const indexB = SIZE_ORDER.indexOf(b);
      if (indexA === -1 || indexB === -1) return a.localeCompare(b);
      return indexA - indexB;
    });
  }, [product.variants]);

  const [color, setColor] = useState(colors[0]?.name ?? '');
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = product.variants.find((variant) => variant.color === color && variant.size === size);
  const selectedColour = colors.find((option) => option.name === color);

  /** A size is only offered if the chosen colour actually exists in it. */
  const stockForSize = (candidate: string) =>
    product.variants.find((variant) => variant.color === color && variant.size === candidate)?.stock ?? 0;

  const productName = localized(locale, product.name, product.nameAr);

  const handleAdd = () => {
    if (!size) {
      toast.error(t.product.chooseSize);
      return;
    }
    if (!selectedVariant || selectedVariant.stock < 1) {
      toast.error(t.product.comboSoldOut);
      return;
    }

    addItem(
      {
        variantId: selectedVariant.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        nameAr: product.nameAr,
        sku: selectedVariant.sku,
        size: selectedVariant.size,
        color: selectedVariant.color,
        colorAr: selectedVariant.colorAr,
        colorHex: selectedVariant.colorHex,
        imageUrl: product.images[0]?.url ?? null,
        unitPriceCents: selectedVariant.priceCents ?? product.priceCents,
        maxStock: selectedVariant.stock,
      },
      quantity,
    );

    toast.success(fmt(t.product.addedToBag, { name: productName }), {
      description: fmt(t.product.addedDetail, {
        colour: localized(locale, selectedVariant.color, selectedVariant.colorAr),
        size: selectedVariant.size,
        quantity,
      }),
      action: { label: t.product.viewBag, onClick: () => useCartStore.getState().openDrawer() },
    });
  };

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="eyebrow mb-3">
          {t.product.colourLabel}:{' '}
          <span className="text-ink">{localized(locale, color, selectedColour?.nameAr)}</span>
        </legend>
        <ul className="flex flex-wrap gap-3">
          {colors.map((option) => (
            <li key={option.name}>
              <button
                type="button"
                title={localized(locale, option.name, option.nameAr)}
                aria-label={localized(locale, option.name, option.nameAr)}
                aria-pressed={color === option.name}
                onClick={() => {
                  setColor(option.name);
                  setSize('');
                }}
                className={cn(
                  'size-8 rounded-full border transition-all',
                  color === option.name
                    ? 'border-ink ring-1 ring-ink ring-offset-2 ring-offset-paper'
                    : 'border-line hover:border-ink-faint',
                )}
                style={{ backgroundColor: option.hex ?? '#ddd' }}
              />
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-3">{t.product.sizeLabel}</legend>
        <ul className="flex flex-wrap gap-2">
          {sizes.map((option) => {
            const isAvailable = stockForSize(option) > 0;
            return (
              <li key={option}>
                <button
                  type="button"
                  disabled={!isAvailable}
                  aria-pressed={size === option}
                  onClick={() => {
                    setSize(option);
                    setQuantity(1);
                  }}
                  className={cn(
                    'min-w-14 border px-3 py-2 text-xs uppercase tracking-[0.1em] transition-colors',
                    size === option
                      ? 'border-ink bg-ink text-paper'
                      : 'border-line text-ink-soft hover:border-ink hover:text-ink',
                    !isAvailable && 'cursor-not-allowed text-ink-faint line-through hover:border-line',
                  )}
                >
                  {option}
                </button>
              </li>
            );
          })}
        </ul>

        {selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 5 && (
          <p className="mt-3 text-xs text-clay">{fmt(t.product.onlyLeft, { count: selectedVariant.stock })}</p>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper value={quantity} max={Math.min(20, selectedVariant?.stock ?? 20)} onChange={setQuantity} />
        <Button size="lg" onClick={handleAdd} disabled={!product.inStock} className="flex-1">
          <ShoppingBag className="size-4" aria-hidden />
          {product.inStock ? t.product.addToBag : t.product.soldOut}
        </Button>
      </div>

      <p className="text-xs text-ink-faint">
        {fmt(t.product.freeShippingOver, {
          threshold: formatPrice(FREE_SHIPPING_THRESHOLD_CENTS, product.currency, locale),
        })}{' '}
        ·{' '}
        <Link href="/products" className="underline underline-offset-4 hover:text-ink">
          {t.product.continueShopping}
        </Link>
      </p>
    </div>
  );
}
