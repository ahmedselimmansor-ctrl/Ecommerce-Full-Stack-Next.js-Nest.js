import { NextRequest, NextResponse } from 'next/server';
import { LOCALE_COOKIE, defaultLocale, isLocale, locales } from '@/i18n/config';

/**
 * Locale routing.
 *
 * Every page lives under `/{locale}/…`. A request without a prefix is redirected
 * to the visitor's preferred locale, resolved in this order:
 *   1. the locale cookie (an explicit past choice)
 *   2. the Accept-Language header
 *   3. the default locale
 */
function resolveLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  const header = request.headers.get('accept-language');
  if (header) {
    // "ar-EG,ar;q=0.9,en;q=0.8" -> ['ar-EG', 'ar', 'en'] in quality order.
    const preferred = header
      .split(',')
      .map((part) => {
        const [tag, quality] = part.trim().split(';q=');
        return { tag: tag.split('-')[0].toLowerCase(), quality: quality ? Number(quality) : 1 };
      })
      .sort((a, b) => b.quality - a.quality);

    for (const { tag } of preferred) {
      if (isLocale(tag)) return tag;
    }
  }

  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));

  if (hasLocale) {
    // Remember the locale the visitor is actually browsing so a later visit to
    // "/" lands in the same language.
    const current = pathname.split('/')[1];
    const response = NextResponse.next();
    if (request.cookies.get(LOCALE_COOKIE)?.value !== current) {
      response.cookies.set(LOCALE_COOKIE, current, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }
    return response;
  }

  const locale = resolveLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;

  return NextResponse.redirect(url);
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'],
};
