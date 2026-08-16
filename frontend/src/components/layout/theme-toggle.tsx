'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme/theme-provider';
import { themePreferences, type ThemePreference } from '@/components/theme/theme-constants';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

const ICONS: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/**
 * Cycles light → dark → system. A three-state control rather than a binary
 * switch, because "follow my OS" is a real preference and a toggle cannot
 * express it.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();
  const t = useT();

  const labels: Record<ThemePreference, string> = {
    light: t.nav.themeLight,
    dark: t.nav.themeDark,
    system: t.nav.themeSystem,
  };

  const Icon = ICONS[preference];
  const nextPreference = themePreferences[(themePreferences.indexOf(preference) + 1) % themePreferences.length];

  return (
    <button
      type="button"
      onClick={() => setPreference(nextPreference)}
      title={`${t.nav.theme}: ${labels[preference]}`}
      aria-label={`${t.nav.theme}: ${labels[preference]}`}
      className={cn('text-ink-soft transition-colors hover:text-ink', className)}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}
