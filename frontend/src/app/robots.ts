import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Account and checkout routes are per-user and must never be indexed.
      disallow: ['/api/', '/account', '/orders', '/checkout', '/cart'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
