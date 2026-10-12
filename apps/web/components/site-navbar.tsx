'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { dashboardPaths } from '@/lib/dashboard';
import { APP_NAME } from '@ironpulse/shared';

export function SiteNavbar(): JSX.Element {
  const t = useTranslations('nav');
  const { user, loading, logout } = useAuth();
  return (
    <header className="mx-auto flex w-[min(1200px,calc(100vw-2rem))] items-center justify-between py-5">
      <Link className="text-xl font-bold text-brand-lime" href="/">
        {APP_NAME}
      </Link>
      <nav aria-label={t('label')} className="flex items-center gap-4 text-sm text-slate-300">
        {!loading && user ? (
          <>
            <Link href={dashboardPaths[user.role]}>{user.profile?.name ?? user.email}</Link>
            <button className="rounded-md border border-slate-700 px-3 py-2" onClick={() => void logout()}>
              {t('logout')}
            </button>
          </>
        ) : (
          <>
            <Link href="/login">{t('login')}</Link>
            <Link href="/register">{t('register')}</Link>
          </>
        )}
      </nav>
    </header>
  );
}
