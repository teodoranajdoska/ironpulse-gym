import {
  authMeResponseSchema,
  csrfResponseSchema,
  messageResponseSchema,
} from '@ironpulse/shared';
import { z } from 'zod';
import { webEnv } from './env';

let csrfToken: string | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  return (
    document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith(prefix))
      ?.slice(prefix.length) ?? null
  );
}

async function getCsrfToken(): Promise<string> {
  const cookieToken = readCookie('csrf_token');
  if (cookieToken) {
    csrfToken = decodeURIComponent(cookieToken);
    return csrfToken;
  }
  if (csrfToken) return csrfToken;
  const response = await fetch(`${webEnv.NEXT_PUBLIC_API_URL}/auth/csrf`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok) throw new ApiError('Unable to initialize secure request.', response.status);
  csrfToken = csrfResponseSchema.parse(await response.json()).csrfToken;
  return csrfToken;
}

async function send<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit,
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (typeof document !== 'undefined') {
    headers.set('accept-language', document.documentElement?.lang || 'mk');
  }
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    headers.set('x-csrf-token', await getCsrfToken());
  }
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const response = await fetch(`${webEnv.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
        ? body.message
        : 'Request failed.';
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) {
    throw new ApiError('The server returned an empty response unexpectedly.', response.status);
  }
  return schema.parse(await response.json());
}

export function apiGet<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  return send(path, schema, { method: 'GET' });
}

export function apiPost(
  path: string,
  body: unknown,
): Promise<z.infer<typeof messageResponseSchema>> {
  return send(path, messageResponseSchema, { method: 'POST', body: JSON.stringify(body) });
}

export function apiPostParsed<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
): Promise<T> {
  return send(path, schema, { method: 'POST', body: JSON.stringify(body) });
}

export async function loadCurrentUser() {
  try {
    return await apiGet('/auth/me', authMeResponseSchema);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
  }

  try {
    await apiPostParsed('/auth/refresh', {}, authMeResponseSchema);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    return null;
  }

  try {
    return await apiGet('/auth/me', authMeResponseSchema);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    return null;
  }
}
