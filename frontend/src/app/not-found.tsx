import Link from 'next/link';
import './globals.css';

/**
 * Root-level 404. The middleware redirects every real page into `/{locale}`, so
 * this only catches paths that never reached a locale segment — which means it
 * has to render its own <html>, since no layout wraps it.
 */
export default function RootNotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper text-center text-ink">
        <p className="eyebrow">404</p>
        <h1 className="font-display text-4xl">This page has moved on</h1>
        <Link href="/en" className="border-b border-ink pb-0.5 text-xs uppercase tracking-[0.14em]">
          Go to the store
        </Link>
      </body>
    </html>
  );
}
