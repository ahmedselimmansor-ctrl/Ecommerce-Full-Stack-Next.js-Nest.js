import 'server-only';
import { getAccessToken } from './session';
import { apiUrl } from './env';

const API_URL = apiUrl();

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ServerFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** ISR window in seconds. Omit for uncached (dynamic) reads. */
  revalidate?: number;
  tags?: string[];
  auth?: boolean;
}

/**
 * Server-side data fetching for Server Components and route handlers.
 *
 * Public catalogue reads are cached by the Next.js data layer, which keeps the
 * Cloud Run backend cold-start out of the render path for most page views.
 */
export async function serverFetch<T>(path: string, options: ServerFetchOptions = {}): Promise<T> {
  const { body, revalidate, tags, auth = false, headers, ...rest } = options;

  const requestHeaders = new Headers(headers);
  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = await getAccessToken();
    if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    // Authenticated reads must never be shared between users.
    cache: auth ? 'no-store' : rest.cache,
    next: auth ? undefined : { revalidate, tags },
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(payload?.message)
      ? payload.message[0]
      : (payload?.message ?? `Request failed with status ${response.status}`);
    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
}

/** Same as serverFetch but returns null on 404 instead of throwing. */
export async function serverFetchOrNull<T>(path: string, options: ServerFetchOptions = {}): Promise<T | null> {
  try {
    return await serverFetch<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
