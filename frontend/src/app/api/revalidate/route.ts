import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAccessToken } from '@/lib/session';
import { apiUrl } from '@/lib/env';

const API_URL = apiUrl();

/**
 * On-demand cache invalidation for admin writes.
 *
 * Catalogue reads are ISR-cached for 60 seconds, which is right for shoppers but
 * wrong for an admin who just deactivated a product and expects it gone. The
 * dashboard calls this after a successful mutation so the change is visible on
 * the next navigation instead of up to a minute later.
 *
 * Only the tags this app actually uses are accepted, so the endpoint cannot be
 * used to sweep unrelated cache entries.
 */
const ALLOWED_TAGS = new Set(['products', 'categories', 'payments']);

export async function POST(request: NextRequest) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 });
  }

  // Authority comes from the API, not from a client claim.
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 });
  }

  const user = (await response.json()) as { role?: string };
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { tags?: string[] };
  const tags = (body.tags ?? []).filter((tag) => ALLOWED_TAGS.has(tag));

  for (const tag of tags) revalidateTag(tag);

  return NextResponse.json({ revalidated: tags });
}
