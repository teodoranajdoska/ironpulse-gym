import {
  authMeResponseSchema,
  csrfResponseSchema,
  messageResponseSchema,
} from '@ironpulse/shared';
import { z } from 'zod';
import { webEnv } from './env';

let refreshInFlight: Promise<boolean> | null = null;
const MAX_READ_RETRIES = 1;
const RETRY_DELAY_MS = 200;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const apiBaseUrl = webEnv.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');

function apiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
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
  if (cookieToken) return decodeURIComponent(cookieToken);
  const url = apiUrl('/auth/csrf');
  const response = await fetchResponse(url, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  }, true);
  if (!response.ok) {
    throw new ApiError('Unable to initialize secure request.', response.status, url);
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('The API returned an invalid CSRF response.', response.status, url);
  }
  try {
    return csrfResponseSchema.parse(payload).csrfToken;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError('The API returned an invalid CSRF response.', response.status, url);
    }
    throw error;
  }
}

async function fetchResponse(
  url: string,
  init: RequestInit,
  retryRead: boolean,
): Promise<Response> {
  const attempts = retryRead ? MAX_READ_RETRIES + 1 : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (
        retryRead &&
        attempt + 1 < attempts &&
        [502, 503, 504].includes(response.status)
      ) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      return response;
    } catch (error) {
      if (attempt + 1 < attempts && error instanceof TypeError) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      if (error instanceof TypeError) {
        throw new ApiError(
          `Unable to reach the API at ${url}. Check the API server and browser connection.`,
          0,
          url,
        );
      }
      throw error;
    }
  }
  throw new Error('The API request retry loop ended without a response.');
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
  const request: RequestInit = {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  };
  const url = apiUrl(path);
  const response = await fetchResponse(url, request, method === 'GET' || method === 'HEAD');
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
        ? body.message
        : 'Request failed.';
    throw new ApiError(message, response.status, url);
  }
  if (response.status === 204) {
    throw new ApiError(
      'The server returned an empty response unexpectedly.',
      response.status,
      url,
    );
  }
  const payload: unknown = await response.json();
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError('The API response did not match the expected shape.', response.status, url);
    }
    throw error;
  }
}

export function apiGet<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  return send(path, schema, { method: 'GET' }).catch(async (error: unknown) => {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    if (!refreshInFlight) {
      refreshInFlight = send('/auth/refresh', authMeResponseSchema, {
        method: 'POST',
        body: '{}',
      })
        .then(() => true)
        .catch((refreshError: unknown) => {
          if (refreshError instanceof ApiError && refreshError.status === 401) return false;
          throw refreshError;
        })
        .finally(() => {
          refreshInFlight = null;
        });
    }
    if (!(await refreshInFlight)) throw error;
    return send(path, schema, { method: 'GET' });
  });
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

export function apiPatchParsed<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
): Promise<T> {
  return send(path, schema, { method: 'PATCH', body: JSON.stringify(body) });
}

export function apiPutParsed<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
): Promise<T> {
  return send(path, schema, { method: 'PUT', body: JSON.stringify(body) });
}

export function apiDeleteParsed<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
): Promise<T> {
  return send(path, schema, { method: 'DELETE', body: JSON.stringify(body) });
}

export async function loadCurrentUser() {
  try {
    return await apiGet('/auth/me', authMeResponseSchema);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    return null;
  }
}
