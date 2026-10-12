'use client';

import { useTranslations } from 'next-intl';
import { UserRole } from '@ironpulse/shared';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export function RoleDashboard({ role }: { role: UserRole }): JSX.Element {
  const t = useTranslations('dashboard');
  const { user, loading, logout } = useAuth();
  if (loading || !user) {
    return <main className="py-10" aria-live="polite">{t('loading')}</main>;
  }
  return (
    <main className="py-10">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>{t(`${role.toLowerCase()}Title` as const)}</CardTitle>
        </CardHeader>
        <p className="text-slate-300">{t('welcome', { name: user.profile?.name ?? user.email })}</p>
        <p className="mt-2 text-slate-400">{t('role', { role: user.role })}</p>
        <Button className="mt-6" onClick={() => void logout()}>{t('logout')}</Button>
      </Card>
    </main>
  );
}
