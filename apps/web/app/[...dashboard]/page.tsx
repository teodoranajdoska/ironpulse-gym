import { notFound } from 'next/navigation';
import { UserRole } from '@ironpulse/shared';
import { DashboardSectionPage } from '@/components/role-dashboard';
import { dashboardDetailAllowed } from '@/lib/dashboard';

const dashboardRoles: Record<string, UserRole> = {
  member: 'MEMBER',
  trainer: 'TRAINER',
  admin: 'ADMIN',
  sponsor: 'SPONSOR',
};

export default function DashboardPage({
  params,
}: {
  params: { dashboard: string[] };
}): JSX.Element {
  const [roleSlug, section] = params.dashboard;
  const role = dashboardRoles[roleSlug];
  if (!role || !section) notFound();
  if (params.dashboard.length > 3) notFound();
  const memberSections = new Set([
    'membership',
    'nutrition',
    'workouts',
    'machines',
    'exercises',
    'trainers',
    'appointments',
    'sponsors',
    'profile',
  ]);
  if (role === 'MEMBER' && (!memberSections.has(section) || (params.dashboard[2] && !['machines', 'exercises'].includes(section)))) {
    notFound();
  }
  const permittedSections: Record<Exclude<UserRole, 'MEMBER'>, Set<string>> = {
    TRAINER: new Set(['clients', 'appointments', 'nutrition', 'availability', 'profile']),
    ADMIN: new Set(['users', 'memberships', 'machines', 'exercises', 'content', 'trials', 'sponsors', 'analytics', 'audit']),
    SPONSOR: new Set(['offers', 'analytics', 'profile']),
  };
  if (role !== 'MEMBER' && !permittedSections[role].has(section)) notFound();
  if (params.dashboard[2] && !dashboardDetailAllowed(role, section)) notFound();
  return <DashboardSectionPage role={role} section={section} detail={params.dashboard[2]} />;
}
