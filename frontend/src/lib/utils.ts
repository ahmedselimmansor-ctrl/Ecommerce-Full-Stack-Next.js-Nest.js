import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CURRENCY, LOCALE } from './env';
import { intlLocale, type Locale } from '@/i18n/config';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Money is transported as integer minor units everywhere; format at the edge.
 *
 * `locale` is optional so server components that already know it can pass it
 * through — Arabic pages then get Arabic-Indic digits and the right currency
 * placement instead of an English-formatted number in an RTL paragraph.
 */
export function formatPrice(cents: number, currency: string = CURRENCY, locale?: Locale): string {
  return new Intl.NumberFormat(locale ? intlLocale(locale) : LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDate(value: string | Date, locale?: Locale): string {
  return new Intl.DateTimeFormat(locale ? intlLocale(locale) : LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatNumber(value: number, locale?: Locale): string {
  return new Intl.NumberFormat(locale ? intlLocale(locale) : LOCALE).format(value);
}

export function discountPercent(priceCents: number, compareAtCents: number | null): number | null {
  if (!compareAtCents || compareAtCents <= priceCents) return null;
  return Math.round(((compareAtCents - priceCents) / compareAtCents) * 100);
}

/** Turn a filter object into a query string, dropping empties and expanding arrays. */
export function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const entry of value) if (entry !== '') search.append(key, String(entry));
    } else {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

/** Tailwind classes for each order status badge. Shared by the store and admin. */
export const ORDER_STATUS_TONE: Record<string, string> = {
  PENDING: 'bg-paper-dim text-ink-soft',
  PAID: 'bg-sage/15 text-sage',
  PROCESSING: 'bg-sage/15 text-sage',
  SHIPPED: 'bg-ink text-paper',
  DELIVERED: 'bg-sage text-white',
  CANCELLED: 'bg-clay/15 text-clay',
  REFUNDED: 'bg-clay/15 text-clay',
};

export const PAYMENT_STATUS_TONE: Record<string, string> = {
  UNPAID: 'bg-paper-dim text-ink-soft',
  AWAITING_PAYMENT: 'bg-clay/15 text-clay',
  PAID: 'bg-sage/15 text-sage',
  FAILED: 'bg-clay/15 text-clay',
  REFUNDED: 'bg-paper-dim text-ink-soft',
};
