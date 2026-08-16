import { NextResponse } from 'next/server';
import { clearSessionCookies, getRefreshToken } from '@/lib/session';
import { apiUrl } from '@/lib/env';

const API_URL = apiUrl();

export async function POST() {
  const refreshToken = await getRefreshToken();

  // Revoke server-side first so the token cannot be replayed even if the
  // cookie delete is lost in transit.
  if (refreshToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    }).catch(() => undefined);
  }

  await clearSessionCookies();
  return NextResponse.json({ ok: true });
}
