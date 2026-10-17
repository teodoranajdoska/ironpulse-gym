'use client';

import { ArrowUpRight, LayoutDashboard, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Route } from 'next';
import { UserRole } from '@ironpulse/shared';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type NavEntry = { slug: string; key: string };

const roleNavigation: Record<UserRole, NavEntry[]> = {
  MEMBER: [
    { slug: '', key: 'overview' },
    { slug: 'membership', key: 'memberMembership' },
    { slug: 'nutrition', key: 'memberNutrition' },
    { slug: 'workouts', key: 'memberWorkouts' },
    { slug: 'exercises', key: 'memberExercises' },
    { slug: 'trainers', key: 'memberTrainers' },
    { slug: 'sponsors', key: 'memberSponsors' },
  ],
  TRAINER: [
    { slug: '', key: 'overview' },
    { slug: 'clients', key: 'trainerClients' },
    { slug: 'appointments', key: 'trainerAppointments' },
    { slug: 'nutrition', key: 'trainerNutrition' },
  ],
  ADMIN: [
    { slug: '', key: 'overview' },
    { slug: 'users', key: 'adminUsers' },
    { slug: 'memberships', key: 'adminMemberships' },
    { slug: 'machines', key: 'adminMachines' },
    { slug: 'exercises', key: 'adminExercises' },
    { slug: 'content', key: 'adminContent' },
    { slug: 'analytics', key: 'adminAnalytics' },
    { slug: 'audit', key: 'adminAudit' },
  ],
  SPONSOR: [
    { slug: '', key: 'overview' },
    { slug: 'offers', key: 'sponsorOffers' },
    { slug: 'analytics', key: 'sponsorAnalytics' },
    { slug: 'profile', key: 'sponsorProfile' },
  ],
};

export function RoleDashboard({ role }: { role: UserRole }): JSX.Element {
  const t = useTranslations('dashboard');
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (loading || !user) {
    return <main className="page-width min-h-[60vh] py-16" aria-live="polite">{t('loading')}</main>;
  }

  const base = `/${role.toLowerCase()}`;
  const name = user.profile?.name ?? user.email;
  const title = t(`${role.toLowerCase()}Title` as 'memberTitle');
  const roleLabel = t(`role${role}` as 'roleMEMBER');

  return (
    <main className="page-width dashboard-shell min-h-[70vh] py-8 md:py-12">
      <div className="mb-6 flex items-center justify-between lg:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{t('navigation')}</p>
          <p className="mt-1 font-semibold text-foreground">{title}</p>
        </div>
        <button
          aria-expanded={mobileNavOpen}
          aria-label={t('menu')}
          className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          type="button"
        >
          {mobileNavOpen ? <X aria-hidden="true" size={19} /> : <Menu aria-hidden="true" size={19} />}
        </button>
      </div>
      <div className="grid gap-7 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className={`${mobileNavOpen ? 'block' : 'hidden'} rounded-panel border border-line bg-surface p-4 lg:block`}>
          <div className="mb-5 flex items-center gap-3 border-b border-line px-2 pb-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-lime/10 text-brand-lime">
              <LayoutDashboard aria-hidden="true" size={19} />
            </span>
            <div>
              <p className="font-semibold text-foreground">{title}</p>
              <p className="text-xs uppercase tracking-widest text-muted">{roleLabel}</p>
            </div>
          </div>
          <nav aria-label={t('navigation')} className="space-y-1">
            {roleNavigation[role].map((entry) => {
              const href = entry.slug ? `${base}/${entry.slug}` : base;
              const active = pathname === href;
              return (
                <Link
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm transition ${active ? 'bg-brand-lime/10 font-semibold text-brand-lime' : 'text-muted hover:bg-raised hover:text-foreground'}`}
                  href={href as Route}
                  key={entry.key}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {t(entry.key)}
                  {active && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-lime" />}
                </Link>
              );
            })}
          </nav>
          <Button className="mt-6 w-full" onClick={() => void logout()} variant="outline">
            {t('logout')}
          </Button>
        </aside>

        <section className="min-w-0">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge className="border-brand-lime/30 text-brand-lime">{roleLabel}</Badge>
              <h1 className="display-font mt-4 text-5xl font-bold leading-none tracking-tightest text-foreground md:text-6xl">
                {title}
              </h1>
              <p className="mt-3 text-muted">{t('welcomeBack', { name })}</p>
            </div>
            <Link className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-brand-lime" href="/">
              {t('homeLink')}<ArrowUpRight aria-hidden="true" size={16} />
            </Link>
          </div>
          <div className="rounded-panel border border-line bg-surface p-6 md:p-9">
            <h2 className="text-lg font-semibold text-foreground">{t('overview')}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{t('overviewDescription')}</p>
          </div>
        </section>
      </div>
    </main>
  );
}

export function DashboardSectionPage({
  role,
  section,
}: {
  role: UserRole;
  section: string;
}): JSX.Element {
  const t = useTranslations('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navEntry = roleNavigation[role].find((entry) => entry.slug === section);
  const sectionTitle = navEntry ? t(navEntry.key) : t('overview');
  const roleLabel = t(`role${role}` as 'roleMEMBER');
  return (
    <main className="page-width dashboard-shell min-h-[70vh] py-8 md:py-12">
      <div className="mb-6 flex items-center justify-between lg:hidden">
        <p className="text-sm font-semibold text-foreground">{sectionTitle}</p>
        <button
          aria-expanded={mobileNavOpen}
          aria-label={t('menu')}
          className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          type="button"
        >
          {mobileNavOpen ? <X aria-hidden="true" size={19} /> : <Menu aria-hidden="true" size={19} />}
        </button>
      </div>
      <div className="grid gap-7 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className={`${mobileNavOpen ? 'block' : 'hidden'} rounded-panel border border-line bg-surface p-4 lg:block`}>
          <p className="mb-4 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">{t('navigation')}</p>
          <nav aria-label={t('navigation')} className="space-y-1">
            {roleNavigation[role].map((entry) => (
              <Link
                className={`block rounded-xl px-3 py-3 text-sm transition ${entry.slug === section ? 'bg-brand-lime/10 font-semibold text-brand-lime' : 'text-muted hover:bg-raised hover:text-foreground'}`}
                href={(entry.slug ? `/${role.toLowerCase()}/${entry.slug}` : `/${role.toLowerCase()}`) as Route}
                key={entry.key}
                onClick={() => setMobileNavOpen(false)}
              >
                {t(entry.key)}
              </Link>
            ))}
          </nav>
        </aside>
        <section>
          <Badge className="border-brand-lime/30 text-brand-lime">{roleLabel}</Badge>
          <h1 className="display-font mt-4 text-5xl font-bold leading-none tracking-tightest text-foreground md:text-6xl">{sectionTitle}</h1>
          <div className="mt-8">
            <div className="rounded-panel border border-line bg-surface p-6 md:p-9">
              <p className="font-semibold text-foreground">{sectionTitle}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t('comingSoon')}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
