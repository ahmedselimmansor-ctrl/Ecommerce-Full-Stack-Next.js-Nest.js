import { THEME_COOKIE, THEME_STORAGE_KEY } from './theme-constants';

/**
 * Applies the saved theme before first paint.
 *
 * This runs synchronously in <head>, ahead of hydration, which is the only way
 * to avoid a flash of the wrong palette. The server cannot decide alone because
 * "system" depends on the OS setting, which only the browser knows.
 */
const script = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    if (stored !== 'light' && stored !== 'dark' && stored !== 'system') {
      var match = document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark|system)/);
      stored = match ? match[1] : 'system';
    }
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored === 'dark' || (stored === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  } catch (error) {
    // A blocked localStorage must not stop the page from rendering.
  }
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />;
}
