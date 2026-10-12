import { beforeEach, describe, expect, test, vi } from 'vitest';
import { dashboardForRoute, dashboardForRole } from '../lib/dashboard';

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
});
