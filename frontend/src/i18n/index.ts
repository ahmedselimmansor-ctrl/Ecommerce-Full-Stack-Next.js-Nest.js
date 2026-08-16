import { ar } from './messages/ar';
import { en, type Dictionary } from './messages/en';
import type { Locale } from './config';

const dictionaries: Record<Locale, Dictionary> = { en, ar };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/**
 * Fill `{token}` placeholders.
 *
 *   fmt(t.cart.addForFreeShipping, { amount: 'EGP 200' })
 *
 * Unknown tokens are left in place rather than replaced with "undefined", so a
 * mistake is visible in review instead of shipping silently.
 */
export function fmt(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/**
 * Pick the singular or plural string. Arabic has richer plural rules than this,
 * but the two phrasings used here read correctly for every count.
 */
export function plural(count: number, one: string, other: string, values: Record<string, string | number> = {}): string {
  return fmt(count === 1 ? one : other, { count, ...values });
}

/** Prefer the Arabic column when it exists, fall back to English otherwise. */
export function localized(locale: Locale, base: string, arabic?: string | null): string {
  return locale === 'ar' && arabic ? arabic : base;
}

export type { Dictionary };
export * from './config';
