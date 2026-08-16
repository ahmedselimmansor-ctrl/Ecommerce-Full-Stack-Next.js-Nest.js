import 'server-only';
import { cookies } from 'next/headers';
import type { AuthTokens } from '@/types';

export const ACCESS_COOKIE = 'atelier_at';
export const REFRESH_COOKIE = 'atelier_rt';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Tokens live in httpOnly cookies, never in localStorage — that keeps them out
 * of reach of any injected script. The browser therefore never holds a bearer
 * token; the BFF route attaches it server-side.
 */
export async function setSessionCookies(tokens: AuthTokens): Promise<void> {
  const store = await cookies();

  store.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: tokens.expiresIn,
  });

  store.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return Boolean(store.get(ACCESS_COOKIE)?.value ?? store.get(REFRESH_COOKIE)?.value);
}
