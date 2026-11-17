import type { NextConfig } from 'next';

const gcsBucket = process.env.NEXT_PUBLIC_GCS_BUCKET;

const nextConfig: NextConfig = {
  // Emits .next/standalone so the Docker image stays small on Cloud Run.
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/**' },
      ...(gcsBucket ? [{ protocol: 'https' as const, hostname: `${gcsBucket}.storage.googleapis.com`, pathname: '/**' }] : []),
      // Seed catalogue photography (Unsplash License). Images uploaded through
      // the admin go to Cloud Storage above; this host only serves demo data.
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      // Local development with MinIO (docker-compose)
      { protocol: 'http', hostname: 'localhost', port: '9000', pathname: '/**' },
      { protocol: 'http', hostname: 'minio', port: '9000', pathname: '/**' },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
