import { ProductCard } from './product-card';
import type { ProductSummary } from '@/types';

interface ProductGridProps {
  products: ProductSummary[];
  /** Number of leading images to mark as LCP-priority. */
  priorityCount?: number;
}

export function ProductGrid({ products, priorityCount = 4 }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < priorityCount} />
      ))}
    </div>
  );
}
