'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { THEME_COOKIE, THEME_STORAGE_KEY, type ThemePreference } from './theme-constants';

interface ThemeValue {
  preference: ThemePreference;
  /** What is actually on screen once "system" is resolved. */
  resolved: 'light' | 'dark';
  setPreference: (next: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function apply(preference: ThemePreference): 'light' | 'dark' {
  const isDark = preference === 'dark' || (preference === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  return isDark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Starts at 'system' to match what the server rendered; the inline script has
  // already put the correct class on <html>, so there is no visible flash.
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null;
    const initial = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    setPreferenceState(initial);
    setResolved(apply(initial));
  }, []);

  // Follow the OS while the preference is "system".
  useEffect(() => {
    if (preference !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(apply('system'));
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    setResolved(apply(next));
    localStorage.setItem(THEME_STORAGE_KEY, next);
    // Mirrored into a cookie so the inline script has something to read on a
    // fresh device where localStorage is empty.
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
}
