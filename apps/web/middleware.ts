import { authMeResponseSchema } from '@ironpulse/shared';
import { NextRequest, NextResponse } from 'next/server';
import { webEnv } from './lib/env';
import { dashboardForRole, dashboardForRoute, dashboardPaths } from './lib/dashboard';

function pathMatches(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function copySetCookies(from: Headers, to: Headers): void {
  const combined = from.get('set-cookie');
  if (!combined) return;
  for (const cookie of combined.split(/,\s*(?=[^;,=\s]+=)/)) {
    to.append('set-cookie', cookie);
  }
}

async function currentUser(request: NextRequest): Promise<{
  user: ReturnType<typeof authMeResponseSchema.parse>['user'] | null;
  cookies: string[];
}> {
  const apiUrl = webEnv.NEXT_PUBLIC_API_URL;
  const cookieHeader = request.headers.get('cookie') ?? '';
  const headers = { cookie: cookieHeader };
  let response = await fetch(`${apiUrl}/auth/me`, { headers, cache: 'no-store' });
  let cookies: string[] = [];

  if (response.status === 401) {
    const csrfToken = request.cookies.get('csrf_token')?.value;
    if (!request.cookies.has('ip_refresh') || !csrfToken) {
      return { user: null, cookies };
    }
    const refresh = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        ...headers,
        'content-type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      body: '{}',
      cache: 'no-store',
    });
    const setCookie = refresh.headers.get('set-cookie');
    if (setCookie) cookies = setCookie.split(/,\s*(?=[^;,=\s]+=)/);
    if (!refresh.ok) return { user: null, cookies };
    return { user: authMeResponseSchema.parse(await refresh.json()).user, cookies };
  }

  if (response.status === 401) return { user: null, cookies };
  if (!response.ok) throw new Error(`Authentication service returned ${response.status}.`);
  return { user: authMeResponseSchema.parse(await response.json()).user, cookies };
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const protectedRoute = Object.values(dashboardPaths).find((route) => pathMatches(pathname, route));
  if (!protectedRoute) return NextResponse.next();

  const { user, cookies } = await currentUser(request);
  if (!user) {
    const destination = request.nextUrl.clone();
    destination.pathname = '/login';
    destination.searchParams.set('next', pathname);
    const response = NextResponse.redirect(destination);
    cookies.forEach((cookie) => response.headers.append('set-cookie', cookie));
    return response;
  }

  const correctDashboard = dashboardForRole(user.role);
  if (!correctDashboard) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    cookies.forEach((cookie) => response.headers.append('set-cookie', cookie));
    return response;
  }
  const response = dashboardForRoute(user.role, pathname)
    ? NextResponse.next()
    : NextResponse.redirect(new URL(correctDashboard, request.url));
  cookies.forEach((cookie) => response.headers.append('set-cookie', cookie));
  return response;
}

export const config = {
  matcher: ['/member/:path*', '/trainer/:path*', '/admin/:path*', '/sponsor/:path*'],
};
