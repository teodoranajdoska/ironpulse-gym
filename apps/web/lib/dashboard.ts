export const dashboardPaths = {
  MEMBER: '/member',
  TRAINER: '/trainer',
  ADMIN: '/admin',
  SPONSOR: '/sponsor',
} as const;

export type DashboardRole = keyof typeof dashboardPaths;
export type DashboardPath = (typeof dashboardPaths)[DashboardRole];

export function dashboardForRole(role: string): DashboardPath | null {
  if (role === 'MEMBER') return dashboardPaths.MEMBER;
  if (role === 'TRAINER') return dashboardPaths.TRAINER;
  if (role === 'ADMIN') return dashboardPaths.ADMIN;
  if (role === 'SPONSOR') return dashboardPaths.SPONSOR;
  return null;
}

export function dashboardForRoute(role: string, pathname: string): DashboardPath | null {
  const dashboard = dashboardForRole(role);
  if (!dashboard) return null;
  return pathname === dashboard || pathname.startsWith(`${dashboard}/`) ? dashboard : null;
}

export function safeReturnTo(candidate: string | null, fallback: DashboardPath): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return fallback;
  }
  const target = new URL(candidate, 'http://ironpulse.local');
  return target.origin === 'http://ironpulse.local'
    ? `${target.pathname}${target.search}${target.hash}`
    : fallback;
}

export function dashboardDetailAllowed(role: string, section: string): boolean {
  return (
    (role === 'MEMBER' && (section === 'machines' || section === 'exercises')) ||
    (role === 'TRAINER' && (section === 'clients' || section === 'nutrition'))
  );
}
