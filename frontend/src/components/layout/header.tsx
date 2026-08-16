'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Menu, Search, ShoppingBag, User as UserIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api-client';
import { selectItemCount, useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';
import { Link, useI18n } from '@/i18n/provider';
import { localized } from '@/i18n';
import { ThemeToggle } from './theme-toggle';
import { LanguageSwitcher } from './language-switcher';
import { cn, formatNumber } from '@/lib/utils';
import { fmt } from '@/i18n';
import type { CategoryNode, User } from '@/types';

interface HeaderProps {
  categories: CategoryNode[];
  user: User | null;
}

export function Header({ categories, user: initialUser }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useI18n();

  const openDrawer = useCartStore((state) => state.openDrawer);
  const clearCart = useCartStore((state) => state.clear);
  // The store is authoritative after a client-side sign-in; the server value
  // seeds it so the first paint is already correct.
  const storeUser = useAuthStore((state) => state.user);
  const isReady = useAuthStore((state) => state.isReady);
  const user = isReady ? storeUser : initialUser;

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  // The cart lives in localStorage, so the count is only correct after
  // hydration — render 0 on the server to keep the markup identical.
  const itemCount = useCartStore(selectItemCount);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setIsMobileOpen(false);
    setIsSearchOpen(false);
  }, [pathname]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/${locale}/products?q=${encodeURIComponent(trimmed)}`);
    setIsSearchOpen(false);
  };

  const handleSignOut = async () => {
    await authApi.logout().catch(() => undefined);
    clearCart();
    useAuthStore.getState().setUser(null);
    toast.success(t.nav.signedOut);
    router.push(`/${locale}`);
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-sm">
      <div className="container-page">
        <div className="flex h-16 items-center justify-between gap-6">
          <button
            type="button"
            onClick={() => setIsMobileOpen((open) => !open)}
            aria-label={isMobileOpen ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={isMobileOpen}
            className="text-ink-soft hover:text-ink md:hidden"
          >
            {isMobileOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>

          <Link href="/" className="font-display text-xl uppercase tracking-[0.2em] tracking-wide-latin">
            {t.common.brand}
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label={t.nav.main}>
            <NavLink href="/products" isActive={pathname.endsWith('/products')}>
              {t.common.all}
            </NavLink>
            {categories.slice(0, 5).map((category) => (
              <NavLink key={category.id} href={`/products?category=${category.slug}`} isActive={false}>
                {localized(locale, category.name, category.nameAr)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <ThemeToggle />

            <button
              type="button"
              onClick={() => setIsSearchOpen((open) => !open)}
              aria-label={t.nav.searchLabel}
              aria-expanded={isSearchOpen}
              className="text-ink-soft hover:text-ink"
            >
              <Search className="size-5" aria-hidden />
            </button>

            {user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                aria-label={t.nav.adminDashboard}
                title={t.nav.adminDashboard}
                className="text-ink-soft hover:text-ink"
              >
                <LayoutDashboard className="size-5" aria-hidden />
              </Link>
            )}

            {user ? (
              <div className="group relative">
                <Link href="/account" className="flex items-center gap-2 text-ink-soft hover:text-ink">
                  <UserIcon className="size-5" aria-hidden />
                  <span className="hidden text-xs lg:inline">{user.firstName}</span>
                </Link>
                <div className="invisible absolute end-0 top-full w-40 border border-line bg-surface opacity-0 shadow-sm transition-all group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <Link href="/account" className="block px-4 py-2.5 text-xs hover:bg-paper-dim">
                    {t.nav.account}
                  </Link>
                  <Link href="/orders" className="block px-4 py-2.5 text-xs hover:bg-paper-dim">
                    {t.nav.orders}
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="block w-full px-4 py-2.5 text-start text-xs text-clay hover:bg-paper-dim"
                  >
                    {t.nav.signOut}
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/login" aria-label={t.nav.signIn} className="text-ink-soft hover:text-ink">
                <UserIcon className="size-5" aria-hidden />
              </Link>
            )}

            <button
              type="button"
              onClick={openDrawer}
              aria-label={fmt(t.nav.openBag, { count: mounted ? itemCount : 0 })}
              className="relative text-ink-soft hover:text-ink"
            >
              <ShoppingBag className="size-5" aria-hidden />
              {mounted && itemCount > 0 && (
                <span className="absolute -top-1.5 flex size-4 items-center justify-center rounded-full bg-ink text-[0.5625rem] tabular-nums text-paper end-2">
                  {itemCount > 9 ? '9+' : formatNumber(itemCount, locale)}
                </span>
              )}
            </button>
          </div>
        </div>

        {isSearchOpen && (
          <form onSubmit={handleSearch} className="border-t border-line py-3">
            <label className="sr-only" htmlFor="site-search">
              {t.nav.searchLabel}
            </label>
            <input
              id="site-search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.nav.searchPlaceholder}
              className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-ink-faint"
            />
          </form>
        )}

        {isMobileOpen && (
          <nav className="border-t border-line py-4 md:hidden" aria-label={t.nav.mobile}>
            <ul className="space-y-3">
              <li>
                <Link href="/products" className="text-sm">
                  {t.nav.allProducts}
                </Link>
              </li>
              {categories.map((category) => (
                <li key={category.id}>
                  <Link href={`/products?category=${category.slug}`} className="text-sm text-ink-soft">
                    {localized(locale, category.name, category.nameAr)}
                  </Link>
                </li>
              ))}
              {user?.role === 'ADMIN' && (
                <li>
                  <Link href="/admin" className="text-sm text-clay">
                    {t.nav.adminDashboard}
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}

function NavLink({ href, isActive, children }: { href: string; isActive: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        'text-xs uppercase tracking-[0.14em] tracking-wide-latin transition-colors',
        isActive ? 'text-ink' : 'text-ink-soft hover:text-ink',
      )}
    >
      {children}
    </Link>
  );
}
