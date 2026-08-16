import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/env';
import { getCategories, searchProducts } from '@/lib/queries';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: 'daily', priority: 0.9 },
  ];

  // A backend outage must not break the sitemap; fall back to static routes.
  try {
    const [products, categories] = await Promise.all([searchProducts({ page: '1' }), getCategories()]);

    return [
      ...staticRoutes,
      ...categories.map((category) => ({
        url: `${SITE_URL}/products?category=${category.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
      ...products.items.map((product) => ({
        url: `${SITE_URL}/products/${product.slug}`,
        lastModified: new Date(product.createdAt),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
