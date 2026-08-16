import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies, setSessionCookies } from '@/lib/session';
import { cookies } from 'next/headers';
import type { AuthTokens } from '@/types';
import { apiUrl } from '@/lib/env';

const API_URL = apiUrl();

/**
 * Backend-for-frontend proxy.
 *
 * Purpose: the browser talks only to its own origin, so the JWT can stay in an
 * httpOnly cookie and there is no CORS surface. On a 401 the proxy silently
 * rotates the refresh token and replays the request once, which makes short
 * access-token lifetimes invisible to the UI.
 */
async function proxy(request: NextRequest, segments: string[]): Promise<NextResponse> {
  const path = segments.join('/');
  const search = request.nextUrl.search;
  const target = `${API_URL}/${path}${search}`;

  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text();

  const store = await cookies();
  let accessToken = store.get(ACCESS_COOKIE)?.value;

  let response = await callBackend(target, request.method, body, accessToken);

  if (response.status === 401) {
    const refreshed = await refreshTokens(store.get(REFRESH_COOKIE)?.value);
    if (refreshed) {
      await setSessionCookies(refreshed);
      accessToken = refreshed.accessToken;
      response = await callBackend(target, request.method, body, accessToken);
    } else if (store.get(REFRESH_COOKIE)?.value) {
      await clearSessionCookies();
    }
  }

  const payload = await response.text();

  return new NextResponse(payload || null, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
      // Anything behind the BFF is user-specific by definition.
      'Cache-Control': 'no-store',
    },
  });
}

function callBackend(url: string, method: string, body: string | undefined, token?: string) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return fetch(url, { method, headers, body, cache: 'no-store' });
}

async function refreshTokens(refreshToken?: string): Promise<AuthTokens | null> {
  if (!refreshToken) return null;

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });

  if (!response.ok) return null;
  return (await response.json()) as AuthTokens;
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}
