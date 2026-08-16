export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

/** Cookie the middleware and the switcher agree on. */
export const LOCALE_COOKIE = 'atelier_locale';

export const localeConfig: Record<
  Locale,
  { label: string; nativeLabel: string; dir: 'ltr' | 'rtl'; htmlLang: string; intlLocale: string }
> = {
  en: { label: 'English', nativeLabel: 'English', dir: 'ltr', htmlLang: 'en', intlLocale: 'en-EG' },
  ar: { label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl', htmlLang: 'ar', intlLocale: 'ar-EG' },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'en' || value === 'ar';
}

export function toLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : defaultLocale;
}

/** Strip a leading `/en` or `/ar` so a path can be re-prefixed with another locale. */
export function stripLocale(pathname: string): string {
  const match = /^\/(en|ar)(?=\/|$)/.exec(pathname);
  return match ? pathname.slice(match[0].length) || '/' : pathname;
}

export function localizePath(pathname: string, locale: Locale): string {
  const bare = stripLocale(pathname);
  return bare === '/' ? `/${locale}` : `/${locale}${bare}`;
}

/** Intl tag for number, currency and date formatting. */
export function intlLocale(locale: Locale): string {
  return localeConfig[locale].intlLocale;
}
