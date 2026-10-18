'use client';

import { ArrowUpRight, LayoutDashboard, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { Route } from 'next';
import { z } from 'zod';
import { UserRole } from '@ironpulse/shared';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, apiGet } from '@/lib/api-client';
import { MemberOverviewExtras, MemberWorkspace } from '@/components/member-workspace';
import { AdminWorkspace } from '@/components/admin-workspace';
import { SponsorWorkspace } from '@/components/sponsor-workspace';
import { TrainerWorkspace } from '@/components/trainer-workspace';

type NavEntry = { slug: string; key: string };
type DashboardCard = { label: string; value: string; detail: string; href?: string };
type DashboardRow = { title: string; detail: string; status?: string; href?: string };
type DashboardChart = { title: string; points: Array<{ label: string; value: number }> };
type DashboardData = {
  cards: DashboardCard[];
  listTitle: string;
  rows: DashboardRow[];
  charts?: DashboardChart[];
};

const membershipSchema = z.object({
  membership: z.object({
    status: z.string(),
    endsAt: z.coerce.date().nullable(),
    plan: z.object({ name: z.string(), durationMonths: z.number() }),
  }).nullable(),
  daysRemaining: z.number(),
});
const workoutsSchema = z.object({
  data: z.array(z.object({
    performedAt: z.coerce.date(),
    exercise: z.object({ name: z.string() }),
    sets: z.array(z.object({ reps: z.number(), weightKg: z.number() })),
  })),
  pagination: z.object({ total: z.number() }).passthrough(),
}).passthrough();
const nutritionSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    status: z.string(),
    source: z.string(),
    createdAt: z.coerce.date(),
  })),
  pagination: z.object({ total: z.number() }).passthrough(),
}).passthrough();
const memberAppointmentsSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    startsAt: z.coerce.date(),
    status: z.string(),
    trainerName: z.string().nullable(),
  })),
  pagination: z.object({ total: z.number() }).passthrough(),
}).passthrough();
const trainerClientsSchema = z.object({
  data: z.array(z.object({ id: z.string(), name: z.string().nullable(), email: z.string() })),
  pagination: z.object({ total: z.number() }).passthrough(),
}).passthrough();
const trainerAppointmentsSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    startsAt: z.coerce.date(),
    status: z.string(),
    member: z.object({ id: z.string(), name: z.string().nullable() }),
  })),
  pagination: z.object({ total: z.number() }).passthrough(),
}).passthrough();
const adminDashboardSchema = z.object({
  members: z.number(),
  activeMemberships: z.number(),
  monthlyRevenueMkd: z.number(),
  pendingPayments: z.number(),
  newMembersPerMonth: z.array(z.object({ month: z.string(), count: z.number() })),
  revenuePerMonth: z.array(z.object({ month: z.string(), amountMkd: z.number() })),
  popularMachines: z.array(z.object({ slug: z.string(), name: z.string(), workouts: z.number() })),
});
const pendingPaymentsSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    plan: z.object({ name: z.string(), priceMkd: z.number() }),
    user: z.object({ profile: z.object({ name: z.string().nullable() }).nullable() }).nullable(),
  })),
  pagination: z.object({ total: z.number() }).passthrough(),
}).passthrough();
const trialRequestsSchema = z.object({
  data: z.array(z.object({ id: z.string(), name: z.string(), status: z.string() })),
  pagination: z.object({ total: z.number() }).passthrough(),
}).passthrough();
const auditLogSchema = z.object({
  data: z.array(z.object({ id: z.string(), action: z.string(), createdAt: z.coerce.date() })),
  pagination: z.object({ total: z.number() }).passthrough(),
}).passthrough();
const sponsorSchema = z.object({
  companyName: z.string(),
  offers: z.array(z.object({
    id: z.string(),
    title: z.string(),
    validUntil: z.coerce.date().nullable(),
  })),
}).passthrough();
const sponsorStatsSchema = z.object({
  impressions: z.number(),
  clicks: z.number(),
  daily: z.array(z.object({ day: z.string(), impressions: z.number(), clicks: z.number() })),
});

type DashboardTranslate = ReturnType<typeof useTranslations<'dashboard'>>;

function statusLabel(status: string, t: DashboardTranslate): string {
  switch (status) {
    case 'ACTIVE': return t('statusActive');
    case 'PENDING': return t('statusPending');
    case 'EXPIRED': return t('statusExpired');
    case 'REQUESTED': return t('statusRequested');
    case 'CONFIRMED': return t('statusConfirmed');
    case 'CANCELLED': return t('statusCancelled');
    case 'COMPLETED': return t('statusCompleted');
    case 'APPROVED': return t('statusApproved');
    case 'DRAFT': return t('statusDraft');
    case 'NEW': return t('statusNew');
    case 'CONTACTED': return t('statusContacted');
    case 'CONVERTED': return t('statusConverted');
    default: return t('statusOther');
  }
}

function displayDate(date: Date, locale: string): string {
  const timeZone = 'Europe/Skopje';
  if (locale === 'mk') {
    const calendarParts = new Intl.DateTimeFormat('mk-MK', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone,
    }).formatToParts(date);
    const timeParts = new Intl.DateTimeFormat('mk-MK', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone,
    }).formatToParts(date);
    const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string => {
      const value = parts.find((item) => item.type === type)?.value;
      if (!value) throw new Error(`Missing ${type} while formatting a dashboard date.`);
      return value;
    };
    const weekdays = ['недела', 'понеделник', 'вторник', 'среда', 'четврток', 'петок', 'сабота'];
    const months = [
      'јануари', 'февруари', 'март', 'април', 'мај', 'јуни',
      'јули', 'август', 'септември', 'октомври', 'ноември', 'декември',
    ];
    const day = Number(part(calendarParts, 'day'));
    const monthIndex = Number(part(calendarParts, 'month')) - 1;
    const year = Number(part(calendarParts, 'year'));
    const weekdayIndex = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
    const weekday = weekdays[weekdayIndex];
    const month = months[monthIndex];
    if (!weekday || !month) throw new Error('Unable to localize a dashboard date for Macedonian.');
    return `${weekday}, ${day} ${month}, ${part(timeParts, 'hour')}:${part(timeParts, 'minute')}`;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(date);
}

function skopjeDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Skopje',
  }).format(date);
}

function membershipPlanName(
  plan: { name: string; durationMonths: number },
  t: DashboardTranslate,
): string {
  const plans: Record<number, {
    englishName: string;
    key: 'planOneMonth' | 'planThreeMonths' | 'planSixMonths' | 'planTwelveMonths';
  }> = {
    1: { englishName: '1 month', key: 'planOneMonth' },
    3: { englishName: '3 months', key: 'planThreeMonths' },
    6: { englishName: '6 months', key: 'planSixMonths' },
    12: { englishName: '12 months', key: 'planTwelveMonths' },
  };
  const seededPlan = plans[plan.durationMonths];
  return seededPlan?.englishName === plan.name ? t(seededPlan.key) : plan.name;
}

const roleNavigation: Record<UserRole, NavEntry[]> = {
  MEMBER: [
    { slug: '', key: 'overview' },
    { slug: 'membership', key: 'memberMembership' },
    { slug: 'nutrition', key: 'memberNutrition' },
    { slug: 'workouts', key: 'memberWorkouts' },
    { slug: 'machines', key: 'memberExercises' },
    { slug: 'trainers', key: 'memberTrainers' },
    { slug: 'appointments', key: 'memberAppointments' },
    { slug: 'sponsors', key: 'memberSponsors' },
    { slug: 'profile', key: 'memberProfile' },
  ],
  TRAINER: [
    { slug: '', key: 'overview' },
    { slug: 'clients', key: 'trainerClients' },
    { slug: 'appointments', key: 'trainerAppointments' },
    { slug: 'nutrition', key: 'trainerNutrition' },
    { slug: 'availability', key: 'trainerAvailability' },
    { slug: 'profile', key: 'trainerProfile' },
  ],
  ADMIN: [
    { slug: '', key: 'overview' },
    { slug: 'users', key: 'adminUsers' },
    { slug: 'memberships', key: 'adminMemberships' },
    { slug: 'machines', key: 'adminMachines' },
    { slug: 'exercises', key: 'adminExercises' },
    { slug: 'content', key: 'adminContent' },
    { slug: 'trials', key: 'adminTrials' },
    { slug: 'sponsors', key: 'adminSponsors' },
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
  const mobileNavButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const menu = document.getElementById('role-dashboard-navigation');
    const previousOverflow = document.body.style.overflow;
    const handleMenuKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
        mobileNavButton.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !menu) return;
      const controls = Array.from(
        menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select'),
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleMenuKey);
    menu?.querySelector<HTMLElement>('button, a[href], select')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleMenuKey);
    };
  }, [mobileNavOpen]);

  if (loading || !user) {
    return <main className="page-width min-h-[60vh] py-16" aria-live="polite">{t('loading')}</main>;
  }
  if (user.role !== role) {
    return <main className="page-width min-h-[60vh] py-16" role="alert">{t('dataUnavailable')}</main>;
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
          aria-controls="role-dashboard-navigation"
          aria-label={t('menu')}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          ref={mobileNavButton}
          type="button"
        >
          {mobileNavOpen ? <X aria-hidden="true" size={19} /> : <Menu aria-hidden="true" size={19} />}
        </button>
      </div>
      <div className="grid gap-7 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside
          aria-labelledby="role-dashboard-navigation-title"
          aria-modal={mobileNavOpen ? true : undefined}
          className={`${mobileNavOpen ? 'fixed inset-0 z-50 h-dvh min-h-0 overflow-y-auto overscroll-contain touch-pan-y rounded-none bg-background px-[max(1.25rem,env(safe-area-inset-left))] pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] lg:static lg:h-auto lg:min-h-0 lg:overflow-visible lg:rounded-panel lg:bg-surface lg:p-4' : 'hidden rounded-panel border border-line bg-surface p-4 lg:block'}`}
          id="role-dashboard-navigation"
          role="dialog"
        >
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-line px-2 pb-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-lime/10 text-brand-lime">
              <LayoutDashboard aria-hidden="true" size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{title}</p>
              <p className="text-xs uppercase tracking-widest text-muted">{roleLabel}</p>
            </div>
            <button
              aria-label={t('closeMenu')}
              className="grid h-11 w-11 place-items-center rounded-xl border border-line text-foreground lg:hidden"
              onClick={() => setMobileNavOpen(false)}
              type="button"
            >
              <X aria-hidden="true" size={19} />
            </button>
          </div>
          <nav aria-label={t('navigation')} className="space-y-1">
            {roleNavigation[role].map((entry) => {
              const href = entry.slug ? `${base}/${entry.slug}` : base;
              const active = pathname === href;
              return (
                <Link
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-11 items-center justify-between rounded-xl px-3 py-3 text-sm transition ${active ? 'bg-brand-lime/10 font-semibold text-brand-lime' : 'text-muted hover:bg-raised hover:text-foreground'}`}
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
              <h1 className="display-font mt-4 break-words text-[clamp(2.25rem,7vw,3.75rem)] font-bold leading-none tracking-tightest text-foreground">
                {title}
              </h1>
              <p className="mt-3 text-muted">{t('welcomeBack', { name })}</p>
            </div>
            <Link className="inline-flex min-h-11 items-center gap-2 text-sm text-muted transition hover:text-brand-lime" href="/">
              {t('homeLink')}<ArrowUpRight aria-hidden="true" size={16} />
            </Link>
          </div>
          <DashboardOverview role={role} />
          {role === 'MEMBER' && <MemberOverviewExtras />}
        </section>
      </div>
    </main>
  );
}

function DashboardOverview({ role }: { role: UserRole }): JSX.Element {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const [data, setData] = useState<DashboardData | null>(null);
  const [failed, setFailed] = useState(false);
  const [retryIndex, setRetryIndex] = useState(0);

  useEffect(() => {
    let active = true;
    async function load(): Promise<void> {
      try {
        let summary: DashboardData;
        if (role === 'MEMBER') {
          const [membership, workouts, nutrition, appointments] = await Promise.all([
            apiGet('/memberships/me', membershipSchema),
            apiGet(`/workouts?page=1&pageSize=100&locale=${locale === 'mk' ? 'mk' : 'en'}`, workoutsSchema),
            apiGet('/nutrition/plans?page=1&pageSize=10', nutritionSchema),
            apiGet('/appointments/me?page=1&pageSize=20', memberAppointmentsSchema),
          ]);
          const nextAppointment = appointments.data
            .filter((item) => item.startsAt >= new Date() && item.status !== 'CANCELLED')
            .sort((first, second) => first.startsAt.getTime() - second.startsAt.getTime())[0];
          const latestPlan = nutrition.data[0];
          const lastWorkout = workouts.data[0];
          summary = {
            cards: [
              {
                label: t('memberMembership'),
                value: membership.membership
                  ? membershipPlanName(membership.membership.plan, t)
                  : t('noMembership'),
                detail: membership.membership
                  ? membership.daysRemaining === 1
                    ? t('oneDayRemaining')
                    : t('daysRemaining', { days: membership.daysRemaining })
                  : t('membershipRequestPrompt'),
              },
              {
                label: t('memberWorkouts'),
                value: String(workouts.pagination.total),
                detail: t('workoutSessionsSaved'),
              },
              {
                label: t('memberNutrition'),
                value: String(nutrition.pagination.total),
                detail: latestPlan ? statusLabel(latestPlan.status, t) : t('noPlanYet'),
              },
              {
                label: t('upcomingAppointments'),
                value: nextAppointment ? displayDate(nextAppointment.startsAt, locale) : '—',
                detail: nextAppointment?.trainerName ?? t('noUpcomingAppointment'),
              },
            ],
            listTitle: t('recentActivity'),
            rows: [
              ...(nextAppointment
                ? [{
                    title: nextAppointment.trainerName ?? t('trainerAppointment'),
                    detail: displayDate(nextAppointment.startsAt, locale),
                    status: statusLabel(nextAppointment.status, t),
                  }]
                : []),
              ...(lastWorkout
                ? [{
                    title: lastWorkout.exercise.name,
                    detail: displayDate(lastWorkout.performedAt, locale),
                    status: t('workoutSets', { count: lastWorkout.sets.length }),
                  }]
                : []),
              ...(latestPlan
                ? [{
                    title: t('memberNutrition'),
                    detail: displayDate(latestPlan.createdAt, locale),
                    status: statusLabel(latestPlan.status, t),
                  }]
                : []),
            ],
          };
        } else if (role === 'TRAINER') {
          const [clients, appointments] = await Promise.all([
            apiGet('/trainers/me/clients?page=1&pageSize=20', trainerClientsSchema),
            apiGet('/appointments/trainer?page=1&pageSize=100', trainerAppointmentsSchema),
          ]);
          const now = new Date();
          const todayAppointments = appointments.data.filter((item) =>
            skopjeDateKey(item.startsAt) === skopjeDateKey(now) && item.status !== 'CANCELLED',
          );
          const pendingCount = appointments.data.filter((item) => item.status === 'REQUESTED').length;
          const upcoming = appointments.data
            .filter((item) => item.startsAt >= now && item.status !== 'CANCELLED')
            .sort((first, second) => first.startsAt.getTime() - second.startsAt.getTime())
            .slice(0, 5);
          summary = {
            cards: [
              { label: t('trainerClients'), value: String(clients.pagination.total), detail: t('assignedClients'), href: '/trainer/clients' },
              { label: t('todayAppointments'), value: String(todayAppointments.length), detail: t('appointmentsToday'), href: '/trainer/appointments' },
              { label: t('pendingRequests'), value: String(pendingCount), detail: t('awaitingConfirmation'), href: '/trainer/appointments' },
              {
                label: t('trainerAppointments'),
                value: String(appointments.pagination.total),
                detail: t('appointmentsScheduled'),
                href: '/trainer/appointments',
              },
            ],
            listTitle: t('upcomingAppointments'),
            rows: [
              ...upcoming.map((item) => ({
                title: item.member.name ?? t('memberAccount'),
                detail: displayDate(item.startsAt, locale),
                status: statusLabel(item.status, t),
                href: '/trainer/appointments',
              })),
              ...clients.data.slice(0, Math.max(0, 5 - upcoming.length)).map((client) => ({
                title: client.name ?? client.email,
                detail: client.email,
                status: t('assignedClient'),
                href: `/trainer/clients/${encodeURIComponent(client.id)}`,
              })),
            ],
          };
        } else if (role === 'ADMIN') {
          const [dashboard, pending, trials, audit] = await Promise.all([
            apiGet('/admin/dashboard', adminDashboardSchema),
            apiGet('/memberships/admin/pending?page=1&pageSize=10', pendingPaymentsSchema),
            apiGet('/content/admin/trial-requests?page=1&pageSize=10', trialRequestsSchema),
            apiGet('/admin/audit-log?page=1&pageSize=5', auditLogSchema),
          ]);
          summary = {
            cards: [
              { label: t('memberAccounts'), value: String(dashboard.members), detail: t('registeredMembers') },
              { label: t('activeMemberships'), value: String(dashboard.activeMemberships), detail: t('currentlyActive') },
              {
                label: t('monthlyRevenue'),
                value: `${new Intl.NumberFormat(locale === 'mk' ? 'mk-MK' : 'en-GB').format(dashboard.monthlyRevenueMkd)} MKD`,
                detail: t('confirmedPayments'),
              },
              { label: t('pendingPayments'), value: String(dashboard.pendingPayments), detail: t('needsReview') },
            ],
            listTitle: t('adminQueues'),
            rows: [
              ...pending.data.slice(0, 3).map((payment) => ({
                title: payment.user?.profile?.name ?? t('memberAccount'),
                detail: `${payment.plan.name} · ${payment.plan.priceMkd} MKD`,
                status: t('statusPending'),
              })),
              ...trials.data.slice(0, 2).map((request) => ({
                title: request.name,
                detail: t('freeTrialRequest'),
                status: statusLabel(request.status, t),
              })),
              ...audit.data.slice(0, 2).map((entry) => ({
                title: entry.action,
                detail: displayDate(entry.createdAt, locale),
                status: t('auditEntry'),
              })),
              ...dashboard.popularMachines.slice(0, 2).map((machine) => ({
                title: machine.name,
                detail: t('machineWorkoutCount', { count: machine.workouts }),
                status: t('popularMachine'),
              })),
            ],
            charts: [
              {
                title: t('newMembersTrend'),
                points: dashboard.newMembersPerMonth.map((point) => ({
                  label: point.month,
                  value: point.count,
                })),
              },
              {
                title: t('monthlyPaymentRevenue'),
                points: dashboard.revenuePerMonth.map((point) => ({
                  label: point.month,
                  value: point.amountMkd,
                })),
              },
            ],
          };
        } else {
          const [sponsor, stats] = await Promise.all([
            apiGet('/sponsors/me', sponsorSchema),
            apiGet('/sponsors/me/stats', sponsorStatsSchema),
          ]);
          const activeOffers = sponsor.offers.filter((offer) =>
            offer.validUntil === null || offer.validUntil >= new Date(),
          );
          summary = {
            cards: [
              { label: t('sponsorOffers'), value: String(activeOffers.length), detail: t('activeOffers') },
              {
                label: t('sponsorImpressions'),
                value: new Intl.NumberFormat(locale === 'mk' ? 'mk-MK' : 'en-GB').format(stats.impressions),
                detail: t('last30Days'),
              },
              {
                label: t('sponsorClicks'),
                value: new Intl.NumberFormat(locale === 'mk' ? 'mk-MK' : 'en-GB').format(stats.clicks),
                detail: t('last30Days'),
              },
              { label: t('sponsorProfile'), value: sponsor.companyName, detail: t('profileVisibility') },
            ],
            listTitle: t('activeOffers'),
            rows: activeOffers.slice(0, 5).map((offer) => ({
              title: offer.title,
              detail: offer.validUntil
                ? t('offerExpires', { date: displayDate(offer.validUntil, locale) })
                : t('noExpiry'),
            })),
            charts: [{
              title: t('dailySponsorActivity'),
              points: stats.daily.slice(-30).map((point) => ({
                label: point.day,
                value: point.impressions,
              })),
            }],
          };
        }
        if (active) setData(summary);
      } catch (error) {
        if (error instanceof ApiError || error instanceof z.ZodError || error instanceof TypeError) {
          console.error(`Unable to load ${role.toLowerCase()} dashboard data.`, error instanceof ApiError ? error.status : 'invalid response or network error');
        } else {
          console.error(`Unexpected ${role.toLowerCase()} dashboard error.`, error instanceof Error ? error.name : 'unknown error');
        }
        if (active) setFailed(true);
      }
    }
    void load();
    return () => { active = false; };
  }, [role, t, locale, retryIndex]);

  if (failed) {
    return (
      <div className="rounded-panel border border-line bg-surface p-6 md:p-9" role="alert">
        <h2 className="text-lg font-semibold text-foreground">{t('overview')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t('dataUnavailable')}</p>
        <Button className="mt-4" onClick={() => { setFailed(false); setData(null); setRetryIndex((index) => index + 1); }} variant="outline">
          {t('retry')}
        </Button>
      </div>
    );
  }
  if (!data) {
    return (
      <div aria-label={t('loading')} aria-live="polite" className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <Skeleton className="h-28 rounded-panel" key={index} />)}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-56 rounded-panel" />
          <Skeleton className="h-56 rounded-panel" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section aria-label={t('overview')} className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.cards.map((card) => (
          <article className="min-w-0 rounded-panel border border-line bg-surface p-4 md:p-5" key={card.label}>
            {card.href ? (
              <Link className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime" href={card.href as Route}>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{card.label}</h2>
                <p className="mt-3 break-words text-2xl font-semibold text-foreground">{card.value}</p>
                <p className="mt-2 break-words text-sm leading-relaxed text-muted">{card.detail}</p>
              </Link>
            ) : (
              <>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{card.label}</h2>
                <p className="mt-3 break-words text-2xl font-semibold text-foreground">{card.value}</p>
                <p className="mt-2 break-words text-sm leading-relaxed text-muted">{card.detail}</p>
              </>
            )}
          </article>
        ))}
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <section className="min-w-0 rounded-panel border border-line bg-surface p-5 md:p-7">
          <h2 className="text-lg font-semibold text-foreground">{data.listTitle}</h2>
          {data.rows.length ? (
            <ul className="mt-4 divide-y divide-line">
              {data.rows.map((row, index) => (
                <li className="flex min-w-0 flex-wrap items-start justify-between gap-3 py-3" key={`${row.title}-${index}`}>
                  {row.href ? (
                    <Link className="group flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime" href={row.href as Route}>
                      <div className="min-w-0">
                        <p className="break-words font-medium text-foreground">{row.title}</p>
                        <p className="mt-1 break-words text-sm text-muted">{row.detail}</p>
                      </div>
                      {row.status && <Badge className="max-w-full break-words whitespace-normal border-line text-muted">{row.status}</Badge>}
                    </Link>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <p className="break-words font-medium text-foreground">{row.title}</p>
                        <p className="mt-1 break-words text-sm text-muted">{row.detail}</p>
                      </div>
                      {row.status && <Badge className="max-w-full break-words whitespace-normal border-line text-muted">{row.status}</Badge>}
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted">{t('noRecentActivity')}</p>
          )}
        </section>

        {data.charts?.map((chart) => {
          const maxPoint = Math.max(1, ...chart.points.map((point) => point.value));
          return (
            <section className="min-w-0 rounded-panel border border-line bg-surface p-5 md:p-7" key={chart.title}>
              <h2 className="text-lg font-semibold text-foreground">{chart.title}</h2>
              <div aria-label={chart.title} className="mt-5 flex h-32 items-end gap-1" role="img">
                {chart.points.map((point) => (
                  <span
                    className="min-w-0 flex-1 rounded-t-sm bg-brand-lime/80"
                    key={point.label}
                    style={{ height: `${Math.max(4, point.value / maxPoint * 100)}%` }}
                    title={`${point.label}: ${point.value}`}
                  />
                ))}
              </div>
              <ul className="sr-only">
                {chart.points.map((point) => (
                  <li key={point.label}>{t('chartDataPoint', { label: point.label, value: point.value })}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">{t('chartAxisDescription')}</p>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardSectionPage({
  role,
  section,
  detail,
}: {
  role: UserRole;
  section: string;
  detail?: string;
}): JSX.Element {
  const t = useTranslations('dashboard');
  const { user, loading, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const menu = document.getElementById('role-dashboard-section-navigation');
    const previousOverflow = document.body.style.overflow;
    const handleMenuKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
        mobileNavButton.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !menu) return;
      const controls = Array.from(
        menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select'),
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleMenuKey);
    menu?.querySelector<HTMLElement>('button, a[href], select')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleMenuKey);
    };
  }, [mobileNavOpen]);
  if (loading || !user) {
    return <main className="page-width min-h-[60vh] py-16" aria-live="polite">{t('loading')}</main>;
  }
  if (user.role !== role) {
    return <main className="page-width min-h-[60vh] py-16" role="alert">{t('dataUnavailable')}</main>;
  }
  const navEntry = roleNavigation[role].find((entry) => entry.slug === section);
  const sectionTitle = navEntry ? t(navEntry.key) : t('overview');
  const roleLabel = t(`role${role}` as 'roleMEMBER');
  return (
    <main className="page-width dashboard-shell min-h-[70vh] py-8 md:py-12">
      <div className="mb-6 flex min-w-0 items-start justify-between gap-3 lg:hidden">
        <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-foreground">{sectionTitle}</p>
        <button
          aria-expanded={mobileNavOpen}
          aria-controls="role-dashboard-section-navigation"
          aria-label={t('menu')}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          ref={mobileNavButton}
          type="button"
        >
          {mobileNavOpen ? <X aria-hidden="true" size={19} /> : <Menu aria-hidden="true" size={19} />}
        </button>
      </div>
      <div className="grid gap-7 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside
          aria-labelledby="role-dashboard-section-navigation-title"
          aria-modal={mobileNavOpen ? true : undefined}
          className={`${mobileNavOpen ? 'fixed inset-0 z-50 h-dvh min-h-0 overflow-y-auto overscroll-contain touch-pan-y rounded-none border-0 bg-background px-[max(1.25rem,env(safe-area-inset-left))] pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] lg:static lg:h-auto lg:min-h-0 lg:overflow-visible lg:rounded-panel lg:border lg:bg-surface lg:p-4' : 'hidden rounded-panel border border-line bg-surface p-4 lg:block'}`}
          id="role-dashboard-section-navigation"
          role="dialog"
        >
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-line px-2 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted" id="role-dashboard-section-navigation-title">{t('navigation')}</p>
            <button
              aria-label={t('closeMenu')}
              className="grid h-11 w-11 place-items-center rounded-xl border border-line text-foreground lg:hidden"
              onClick={() => setMobileNavOpen(false)}
              type="button"
            >
              <X aria-hidden="true" size={19} />
            </button>
          </div>
          <nav aria-label={t('navigation')} className="space-y-1">
            {roleNavigation[role].map((entry) => (
              <Link
                className={`block min-h-11 rounded-xl px-3 py-3 text-sm transition ${entry.slug === section ? 'bg-brand-lime/10 font-semibold text-brand-lime' : 'text-muted hover:bg-raised hover:text-foreground'}`}
                href={(entry.slug ? `/${role.toLowerCase()}/${entry.slug}` : `/${role.toLowerCase()}`) as Route}
                key={entry.key}
                onClick={() => setMobileNavOpen(false)}
              >
                {t(entry.key)}
              </Link>
            ))}
          </nav>
          <Button className="mt-6 w-full" onClick={() => void logout()} variant="outline">
            {t('logout')}
          </Button>
        </aside>
        <section className="min-w-0">
          <Badge className="border-brand-lime/30 text-brand-lime">{roleLabel}</Badge>
          <h1 className="display-font mt-4 break-words text-[clamp(2.25rem,8vw,3.75rem)] font-bold leading-none tracking-tightest text-foreground">{sectionTitle}</h1>
          <div className="mt-8">
            {role === 'MEMBER' ? <MemberWorkspace detail={detail} section={section} /> :
              role === 'TRAINER' ? <TrainerWorkspace detail={detail} section={section} /> :
                role === 'ADMIN' ? <AdminWorkspace section={section} /> :
                  <SponsorWorkspace section={section} />}
          </div>
        </section>
      </div>
    </main>
  );
}
