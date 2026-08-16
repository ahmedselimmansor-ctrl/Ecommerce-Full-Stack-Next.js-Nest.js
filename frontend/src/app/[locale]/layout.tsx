import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import '../globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { CartSync } from '@/components/cart/cart-sync';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { ThemeScript } from '@/components/theme/theme-script';
import { I18nProvider } from '@/i18n/provider';
import { getDictionary, isLocale, localeConfig, locales, type Locale } from '@/i18n';
import { getCategories, getCurrentUser } from '@/lib/queries';
import { SITE_URL } from '@/lib/env';
import type { CategoryNode } from '@/types';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8f5' },
    { media: '(prefers-color-scheme: dark)', color: '#14110f' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const isArabic = locale === 'ar';

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: isArabic ? 'أتيليه — ملابس مدروسة' : 'Atelier — Considered clothing',
      template: isArabic ? '%s · أتيليه' : '%s · Atelier',
    },
    description: isArabic
      ? 'ملابس بكميات محدودة من خامات طبيعية. قمصان وتريكو وبناطيل وجاكيتات، بنشحن لكل مصر.'
      : 'Small-run clothing made from natural fibres. Shirts, knitwear, trousers and outerwear, shipped across Egypt.',
    // Tell search engines about the other language rather than letting them
    // treat the two versions as duplicates.
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: {
        en: `${SITE_URL}/en`,
        ar: `${SITE_URL}/ar`,
        'x-default': `${SITE_URL}/en`,
      },
    },
    openGraph: {
      type: 'website',
      siteName: isArabic ? 'أتيليه' : 'Atelier',
      locale: isArabic ? 'ar_EG' : 'en_US',
      alternateLocale: isArabic ? 'en_US' : 'ar_EG',
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const messages = getDictionary(locale);
  const { dir, htmlLang } = localeConfig[locale];

  // Both are needed by the shell on every route; one round trip instead of two.
  // A backend hiccup degrades to an empty nav rather than a 500 for the site.
  const [categories, user] = await Promise.all([
    getCategories().catch((): CategoryNode[] => []),
    getCurrentUser(),
  ]);

  return (
    <html lang={htmlLang} dir={dir} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-dvh flex-col">
        <ThemeProvider>
          <I18nProvider locale={locale} messages={messages}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper focus:start-3"
            >
              {messages.common.skipToContent}
            </a>

            <Header categories={categories} user={user} />

            <main id="main" className="flex-1">
              {children}
            </main>

            <Footer categories={categories} />

            <CartDrawer />
            <CartSync user={user} />
            <Toaster />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
