'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Languages } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { LOCALE_COOKIE, localeConfig, locales, localizePath, type Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

/**
 * Switches locale while staying on the same page.
 *
 * The current path is re-prefixed rather than sending the visitor home, and the
 * query string is preserved so an active set of filters survives the switch.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: Locale) => {
    if (next === locale) return;

    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    const query = searchParams.toString();
    const target = `${localizePath(pathname, next)}${query ? `?${query}` : ''}`;

    startTransition(() => {
      router.push(target);
      // The <html lang> and dir attributes are rendered by the server layout,
      // so the document has to re-render for the direction to flip.
      router.refresh();
    });
  };

  const other = locales.find((candidate) => candidate !== locale) ?? locale;

  return (
    <button
      type="button"
      onClick={() => switchTo(other)}
      disabled={isPending}
      title={`${t.nav.language}: ${localeConfig[other].nativeLabel}`}
      aria-label={`${t.nav.language}: ${localeConfig[other].nativeLabel}`}
      className={cn(
        'flex items-center gap-1.5 text-xs text-ink-soft transition-colors hover:text-ink disabled:opacity-50',
        className,
      )}
    >
      <Languages className="size-5" aria-hidden />
      <span className="hidden sm:inline">{localeConfig[other].nativeLabel}</span>
    </button>
  );
}
