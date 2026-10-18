import { beforeEach, describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import { dashboardForRoute, dashboardForRole } from '../lib/dashboard';
import { apiEndpoints } from '../lib/api-endpoints';

describe('dashboard role routing', () => {
  test('routes each role to its own dashboard', () => {
    expect(dashboardForRole('MEMBER')).toBe('/member');
    expect(dashboardForRole('TRAINER')).toBe('/trainer');
    expect(dashboardForRole('ADMIN')).toBe('/admin');
    expect(dashboardForRole('SPONSOR')).toBe('/sponsor');
    expect(dashboardForRole('UNKNOWN')).toBeNull();
  });

  test('denies wrong dashboard paths by returning the correct role route', () => {
    expect(dashboardForRoute('MEMBER', '/admin')).toBeNull();
    expect(dashboardForRoute('ADMIN', '/admin/users')).toBe('/admin');
  });
});

describe('web API client', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.stubGlobal('document', { cookie: '' });
  });

  test('gets CSRF state and sends same-site cookies and the CSRF header', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'GET') {
        return new Response(JSON.stringify({ csrfToken: 'csrf-value' }), { status: 200 });
      }
      return new Response(JSON.stringify({ message: 'ok' }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { apiPost } = await import('../lib/api-client');
    await apiPost('/auth/logout', {});

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]?.credentials).toBe('include');
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('x-csrf-token')).toBe(
      'csrf-value',
    );
  });

  test('fetches a fresh CSRF token after logout clears the cookie', async () => {
    let issuedToken = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void init;
      if (String(input).endsWith('/auth/csrf')) {
        issuedToken += 1;
        return new Response(JSON.stringify({ csrfToken: `csrf-${issuedToken}` }), { status: 200 });
      }
      return new Response(JSON.stringify({ message: 'ok' }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { apiPost } = await import('../lib/api-client');

    await apiPost('/auth/logout', {});
    vi.stubGlobal('document', { cookie: '' });
    await apiPost('/auth/login', {});

    expect(issuedToken).toBe(2);
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('x-csrf-token')).toBe('csrf-1');
    expect(new Headers(fetchMock.mock.calls[3]?.[1]?.headers).get('x-csrf-token')).toBe('csrf-2');
  });

  test('loads the current user by silently refreshing once after a 401', async () => {
    const userResponse = { user: { id: 'u-1', email: 'member@example.com', role: 'MEMBER', profile: { name: 'Member' } } };
    let apiMeAttempts = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        apiMeAttempts += 1;
        return apiMeAttempts === 1
          ? new Response('{}', { status: 401 })
          : new Response(JSON.stringify(userResponse), { status: 200 });
      }
      if (url.endsWith('/auth/csrf')) {
        return new Response(JSON.stringify({ csrfToken: 'csrf-value' }), { status: 200 });
      }
      expect(init?.method).toBe('POST');
      return new Response(JSON.stringify(userResponse), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { loadCurrentUser } = await import('../lib/api-client');
    await expect(loadCurrentUser()).resolves.toEqual(userResponse);
    expect(apiMeAttempts).toBe(2);
  });

  test('retries transient read failures once and includes browser credentials', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { apiGet } = await import('../lib/api-client');

    await expect(apiGet('/health', z.object({ ok: z.boolean() }))).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe('include');
  });

  test('builds member machine and workout paths from the canonical endpoint map', () => {
    expect(apiEndpoints.memberProfile).toBe('/me/profile');
    expect(apiEndpoints.membership).toBe('/memberships/me');
    expect(apiEndpoints.machines.list).toBe('/machines');
    expect(apiEndpoints.machines.detail('leg-press')).toBe('/machines/leg-press');
    expect(apiEndpoints.machines.exercises('leg press')).toBe('/machines/leg%20press/exercises');
    expect(apiEndpoints.workouts.collection).toBe('/workouts');
    expect(apiEndpoints.workouts.personalRecords).toBe('/workouts/personal-records');
    expect(apiEndpoints.workouts.progress('exercise/1')).toBe(
      '/workouts/exercises/exercise%2F1/progress',
    );
  });

  test('includes the actual API URL and HTTP status on failed or mismatched responses', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Not found' }), { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ unexpected: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { apiGet } = await import('../lib/api-client');
    const schema = z.object({ expected: z.string() });

    await expect(apiGet('/me/profile', schema)).rejects.toMatchObject({
      status: 404,
      url: 'http://localhost:4000/me/profile',
    });
    await expect(apiGet('/workouts', schema)).rejects.toMatchObject({
      status: 200,
      url: 'http://localhost:4000/workouts',
    });
  });

  test('uses one shared refresh when concurrent member requests receive 401', async () => {
    const userResponse = {
      user: {
        id: 'u-1',
        email: 'member@example.com',
        role: 'MEMBER',
        profile: { name: 'Member' },
      },
    };
    let readAttempts = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/workouts')) {
        readAttempts += 1;
        return readAttempts <= 2
          ? new Response('{}', { status: 401 })
          : new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      expect(url.endsWith('/auth/refresh')).toBe(true);
      expect(init?.method).toBe('POST');
      return new Response(JSON.stringify(userResponse), { status: 200 });
    });
    vi.stubGlobal('document', { cookie: 'csrf_token=csrf-value', documentElement: { lang: 'mk' } });
    vi.stubGlobal('fetch', fetchMock);
    const { apiGet } = await import('../lib/api-client');
    const schema = z.object({ ok: z.boolean() });

    await expect(Promise.all([
      apiGet('/workouts', schema),
      apiGet('/workouts', schema),
    ])).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/auth/refresh'))).toHaveLength(1);
  });
});
