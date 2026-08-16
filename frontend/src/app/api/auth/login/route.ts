import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookies } from '@/lib/session';
import type { AuthResult } from '@/types';
import { apiUrl } from '@/lib/env';

const API_URL = apiUrl();

export async function POST(request: NextRequest) {
  const body = await request.text();

  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(payload ?? { message: 'Unable to sign in.' }, { status: response.status });
  }

  const result = payload as AuthResult;
  await setSessionCookies(result.tokens);

  // The token pair stays server-side; the client only ever receives the profile.
  return NextResponse.json({ user: result.user });
}
