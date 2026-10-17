import { notFound } from 'next/navigation';
import { UserRole } from '@ironpulse/shared';
import { DashboardSectionPage } from '@/components/role-dashboard';

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
  return <DashboardSectionPage role={role} section={section} />;
}
