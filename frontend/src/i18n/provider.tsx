'use client';

import { createContext, useContext, useMemo } from 'react';
import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import { localeConfig, localizePath, type Locale } from './config';
import type { Dictionary } from './messages/en';

interface I18nValue {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  t: Dictionary;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Carries the active locale and its dictionary to client components.
 *
 * The dictionary is a plain nested object of strings, which is exactly why the
 * messages contain no functions: this value is serialised across the RSC
 * boundary on every navigation.
 */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Dictionary;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({ locale, dir: localeConfig[locale].dir, t: messages }),
    [locale, messages],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>');
  return value;
}

/** Shorthand for the common case of only needing the strings. */
export function useT(): Dictionary {
  return useI18n().t;
}

export function useLocale(): Locale {
  return useI18n().locale;
}

/**
 * `next/link` that keeps the active locale prefix.
 *
 * Using this everywhere means no page can accidentally drop the visitor back
 * into the default language mid-session.
 */
export function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const locale = useLocale();
  const localizedHref = typeof href === 'string' && href.startsWith('/') ? localizePath(href, locale) : href;
  return <NextLink href={localizedHref} {...props} />;
}
