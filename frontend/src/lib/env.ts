/**
 * Environment access with fallbacks that survive empty strings.
 *
 * A Docker `ARG` with no value becomes `ENV NAME=""`, and `process.env.NAME ?? default`
 * keeps that empty string — which then blows up in `new URL('')` or silently
 * becomes `0` in `Number('')`. Every read goes through here instead.
 *
 * NEXT_PUBLIC_* names must appear as complete literals so the Next.js compiler
 * can inline them into the client bundle; they cannot be looked up dynamically.
 */

function text(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function integer(value: string | undefined, fallback: number): number {
  const parsed = Number(value?.trim());
  return Number.isFinite(parsed) && parsed >= 0 && value?.trim() ? parsed : fallback;
}

export const SITE_URL = text(process.env.NEXT_PUBLIC_SITE_URL, 'http://localhost:3000');
export const CURRENCY = text(process.env.NEXT_PUBLIC_CURRENCY, 'EGP');
export const LOCALE = text(process.env.NEXT_PUBLIC_LOCALE, 'en-EG');
export const FREE_SHIPPING_THRESHOLD_CENTS = integer(process.env.NEXT_PUBLIC_FREE_SHIPPING_CENTS, 150_000);
export const FLAT_SHIPPING_CENTS = integer(process.env.NEXT_PUBLIC_FLAT_SHIPPING_CENTS, 6_000);

/** Server-only: the Cloud Run URL of the API. Never referenced from the browser. */
export function apiUrl(): string {
  return text(process.env.API_URL, 'http://localhost:8080/api/v1').replace(/\/$/, '');
}
