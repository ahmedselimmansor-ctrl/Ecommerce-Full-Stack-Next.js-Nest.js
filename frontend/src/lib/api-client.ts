'use client';

/**
 * Browser-side API access.
 *
 * Every call goes through the same-origin BFF route (`/api/bff/*`), which
 * attaches the access token from the httpOnly cookie and transparently refreshes
 * it. The browser never sees a token, and there is no CORS preflight.
 */

export class ClientApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ClientApiError';
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/bff${path.startsWith('/') ? path : `/${path}`}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(payload?.message)
      ? payload.message[0]
      : (payload?.message ?? 'Something went wrong. Please try again.');
    throw new ClientApiError(response.status, message);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

/**
 * Drop the ISR cache for catalogue data after an admin write, so the change is
 * visible immediately instead of after the 60-second revalidate window.
 * Best-effort: a failure here only means the shopper view is briefly stale.
 */
export async function revalidateCatalogue(tags: string[] = ['products', 'categories']): Promise<void> {
  await fetch('/api/revalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags }),
  }).catch(() => undefined);
}

/** Auth endpoints live outside the BFF because they write session cookies. */
export const authApi = {
  login: (body: { email: string; password: string }) =>
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(unwrap),

  register: (body: Record<string, unknown>) =>
    fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(unwrap),

  logout: () => fetch('/api/auth/logout', { method: 'POST' }).then(unwrap),
};

async function unwrap(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(payload?.message)
      ? payload.message[0]
      : (payload?.message ?? 'Something went wrong. Please try again.');
    throw new ClientApiError(response.status, message);
  }
  return payload;
}
