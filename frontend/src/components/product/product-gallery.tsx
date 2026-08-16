'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useT } from '@/i18n/provider';
import { fmt } from '@/i18n';
import { cn } from '@/lib/utils';
import type { ProductImage } from '@/types';

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const t = useT();
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? images[0];

  if (!active) {
    return <div className="aspect-portrait w-full bg-paper-dim" aria-hidden />;
  }

  return (
    <div className="flex flex-col-reverse gap-4 md:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-3 md:flex-col" aria-label={t.product.imagesLabel}>
          {images.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={fmt(t.product.viewImage, { index: index + 1, total: images.length })}
                aria-current={index === activeIndex}
                className={cn(
                  'relative aspect-portrait w-16 overflow-hidden border transition-colors md:w-20',
                  index === activeIndex ? 'border-ink' : 'border-transparent hover:border-line',
                )}
              >
                <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative aspect-portrait flex-1 overflow-hidden bg-paper-dim">
        <Image
          src={active.url}
          alt={productName}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
          className="object-cover"
        />
      </div>
    </div>
  );
}
