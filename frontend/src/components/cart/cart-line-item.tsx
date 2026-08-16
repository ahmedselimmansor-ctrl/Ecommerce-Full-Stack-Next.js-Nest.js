'use client';

import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { useCartStore, type CartItem } from '@/store/cart-store';
import { Link, useI18n } from '@/i18n/provider';
import { fmt, localized } from '@/i18n';
import { formatPrice } from '@/lib/utils';

interface CartLineItemProps {
  item: CartItem;
  compact?: boolean;
}

export function CartLineItem({ item, compact = false }: CartLineItemProps) {
  const { t, locale } = useI18n();
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const name = localized(locale, item.name, item.nameAr);
  const colour = localized(locale, item.color, item.colorAr);
  const isOverStock = item.maxStock > 0 && item.quantity > item.maxStock;

  return (
    <li className="flex gap-4 py-5">
      <Link href={`/products/${item.slug}`} className="relative aspect-portrait w-20 shrink-0 bg-paper-dim">
        {item.imageUrl && <Image src={item.imageUrl} alt={name} fill sizes="80px" className="object-cover" />}
      </Link>

      <div className="flex flex-1 flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/products/${item.slug}`} className="text-sm underline-offset-4 hover:underline">
              {name}
            </Link>
            <p className="mt-1 text-xs text-ink-faint">
              {colour} · {t.product.sizeLabel} {item.size}
            </p>
            {isOverStock && (
              <p className="mt-1 text-xs text-clay">{fmt(t.cart.onlyLeftWarning, { count: item.maxStock })}</p>
            )}
          </div>

          <button
            type="button"
            aria-label={fmt(t.cart.removeItem, { name })}
            onClick={() => {
              removeItem(item.variantId);
              toast(t.cart.removed, { description: name });
            }}
            className="text-ink-faint transition-colors hover:text-clay"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <QuantityStepper
            value={item.quantity}
            min={1}
            max={Math.min(20, item.maxStock || 20)}
            onChange={(value) => setQuantity(item.variantId, value)}
            className={compact ? 'origin-[left_center] scale-90 rtl:origin-[right_center]' : undefined}
          />
          <span className="text-sm tabular-nums">
            {formatPrice(item.unitPriceCents * item.quantity, undefined, locale)}
          </span>
        </div>
      </div>
    </li>
  );
}
