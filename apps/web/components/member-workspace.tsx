'use client';

import {
  appointmentRequestSchema,
  confirmPasswordSchema,
  memberProfileUpdateSchema,
  membershipRequestSchema,
  nutritionPlanSchema,
  nutritionQuestionnaireSchema,
  workoutLogSchema,
} from '@ironpulse/shared';
import { ApiError, apiDeleteParsed, apiGet, apiPatchParsed, apiPostParsed } from '@/lib/api-client';
import { apiEndpoints } from '@/lib/api-endpoints';
import { useCookieConsent } from '@/lib/cookie-consent';
import {
  isYouTubeVideoId,
  localDateTimeMinimum,
  machineAnimationKind,
  weeklyWorkoutCount,
} from '@/lib/member-helpers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import Image from 'next/image';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  LockKeyhole,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

const membershipSchema = z.object({
  membership: z
    .object({
      id: z.string(),
      status: z.string(),
      startsAt: z.coerce.date(),
      endsAt: z.coerce.date().nullable(),
      plan: z.object({
        id: z.string(),
        name: z.string(),
        durationMonths: z.number(),
        priceMkd: z.number(),
      }),
    })
    .nullable(),
  daysRemaining: z.number(),
});
const planListSchema = z
  .object({
    data: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        durationMonths: z.number(),
        priceMkd: z.number(),
      }),
    ),
    pagination: z.object({ total: z.number() }).passthrough(),
  })
  .passthrough();
const historySchema = z
  .object({
    data: z.array(
      z
        .object({
          id: z.string(),
          status: z.string(),
          startsAt: z.coerce.date(),
          endsAt: z.coerce.date().nullable(),
          createdAt: z.coerce.date(),
          plan: z.object({ name: z.string(), durationMonths: z.number(), priceMkd: z.number() }),
        })
        .passthrough(),
    ),
  })
  .passthrough();
const machineListSchema = z
  .object({
    data: z.array(
      z.object({
        id: z.string(),
        slug: z.string(),
        name: z.string(),
        category: z.string(),
        difficulty: z.number(),
        animationKey: z.string().nullable(),
        imageUrl: z.string().nullable(),
        muscles: z.array(z.object({ muscleGroup: z.string(), primary: z.boolean() })),
      }),
    ),
  })
  .passthrough();
const machineDetailSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  animationKey: z.string().nullable(),
  imageUrl: z.string().nullable(),
  muscles: z.array(z.object({ muscleGroup: z.string(), primary: z.boolean() })),
});
const exerciseSchema = z.object({
  id: z.string(),
  machineId: z.string(),
  name: z.string(),
  steps: z.array(z.string()),
  commonMistakes: z.array(z.string()),
  safetyTips: z.array(z.string()),
  recommendedSets: z.number().nullable(),
  recommendedReps: z.number().nullable(),
  videoId: z.string().nullable(),
  level: z.string(),
});
const exerciseListSchema = z.object({ data: z.array(exerciseSchema) }).passthrough();
const workoutListSchema = z
  .object({
    data: z.array(
      z.object({
        id: z.string(),
        performedAt: z.coerce.date(),
        exercise: z.object({ id: z.string(), name: z.string(), machineSlug: z.string() }),
        sets: z.array(z.object({ setNumber: z.number(), reps: z.number(), weightKg: z.number() })),
      }),
    ),
    pagination: z.object({ total: z.number() }).passthrough(),
  })
  .passthrough();
const progressSchema = z
  .object({
    data: z.array(
      z.object({
        id: z.string(),
        performedAt: z.coerce.date(),
        maxWeightKg: z.number(),
        totalVolumeKg: z.number(),
      }),
    ),
  })
  .passthrough();
const recordSchema = z
  .object({
    data: z.array(
      z.object({
        exerciseId: z.string(),
        exerciseName: z.string(),
        maxWeightKg: z.number(),
        maxVolumeKg: z.number(),
      }),
    ),
  })
  .passthrough();
const trainerListSchema = z
  .object({
    data: z.array(
      z.object({
        id: z.string(),
        name: z.string().nullable(),
        bio: z.string().nullable(),
        specialties: z.array(z.string()),
        photoUrl: z.string().nullable(),
      }),
    ),
  })
  .passthrough();
const appointmentsSchema = z
  .object({
    data: z.array(
      z.object({
        id: z.string(),
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date(),
        status: z.string(),
        trainerName: z.string().nullable().optional(),
      }),
    ),
  })
  .passthrough();
const nutritionListSchema = z
  .object({
    data: z.array(z.object({ id: z.string(), status: z.string(), createdAt: z.coerce.date() })),
    disclaimer: z.string(),
  })
  .passthrough();
const nutritionDetailSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    source: z.string(),
    createdAt: z.coerce.date(),
    planJson: nutritionPlanSchema,
    questionnaire: z.object({
      computedBmr: z.number(),
      computedTdee: z.number(),
      targetCalories: z.number(),
      macros: z.object({
        calories: z.number(),
        proteinG: z.number(),
        carbsG: z.number(),
        fatG: z.number(),
      }),
    }),
    disclaimer: z.string(),
  })
  .passthrough();
const memberProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  locale: z.enum(['mk', 'en']),
  profile: z
    .object({
      name: z.string().nullable(),
      phone: z.string().nullable(),
      birthDate: z.coerce.date().nullable(),
      gender: z.string().nullable(),
      heightCm: z.number().nullable(),
      weightKg: z.number().nullable(),
      avatarUrl: z.string().nullable(),
    })
    .nullable(),
});
const sponsorsSchema = z
  .object({
    data: z.array(
      z.object({
        id: z.string(),
        companyName: z.string(),
        logoUrl: z.string().nullable(),
        websiteUrl: z.string().nullable(),
        offers: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            discountCode: z.string().nullable(),
            validUntil: z.coerce.date().nullable(),
          }),
        ),
      }),
    ),
  })
  .passthrough();
const messageSchema = z.object({ message: z.string() });
const trackingSchema = z.object({ tracked: z.boolean() });
const deletedSchema = z.object({ id: z.string() });
const requestResultSchema = z.object({ id: z.string(), status: z.string() }).passthrough();
const createdSchema = z.object({ id: z.string() }).passthrough();
type Machine = z.infer<typeof machineListSchema>['data'][number];
type Exercise = z.infer<typeof exerciseSchema>;
type Trainer = z.infer<typeof trainerListSchema>['data'][number];

function formatDate(date: Date, locale: string, options?: Intl.DateTimeFormatOptions): string {
  if (locale !== 'mk') {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeZone: 'Europe/Skopje',
      ...options,
    }).format(date);
  }
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    ...(options?.dateStyle === 'full' ? { weekday: 'long' as const } : {}),
    ...(options?.timeStyle
      ? { hour: '2-digit' as const, minute: '2-digit' as const, hourCycle: 'h23' as const }
      : {}),
    timeZone: 'Europe/Skopje',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): string => {
    const part = parts.find((item) => item.type === type)?.value;
    if (!part) throw new Error(`Missing ${type} while formatting a member date.`);
    return part;
  };
  const day = Number(value('day'));
  const monthIndex = Number(value('month')) - 1;
  const year = Number(value('year'));
  const months = [
    'јануари',
    'февруари',
    'март',
    'април',
    'мај',
    'јуни',
    'јули',
    'август',
    'септември',
    'октомври',
    'ноември',
    'декември',
  ];
  const weekdays = ['недела', 'понеделник', 'вторник', 'среда', 'четврток', 'петок', 'сабота'];
  const month = months[monthIndex];
  const weekday = weekdays[new Date(Date.UTC(year, monthIndex, day)).getUTCDay()];
  if (!month || !weekday) throw new Error('Unable to format a Macedonian member date.');
  const dateLabel =
    options?.dateStyle === 'full'
      ? `${weekday}, ${day} ${month} ${year} г.`
      : `${day}. ${month} ${year} г.`;
  return options?.timeStyle ? `${dateLabel}, ${value('hour')}:${value('minute')}` : dateLabel;
}

function memberPlanName(
  plan: { name: string; durationMonths: number },
  t: ReturnType<typeof useTranslations<'memberArea'>>,
): string {
  if ([1, 3, 6, 12].includes(plan.durationMonths)) {
    return t(`duration_${plan.durationMonths}` as 'duration_1');
  }
  return plan.name;
}

function Failure({
  onRetry,
  error,
}: {
  onRetry: () => void;
  error?: ApiError | null;
}): JSX.Element {
  const t = useTranslations('memberArea');
  return (
    <div className="rounded-2xl border border-red-400/30 bg-red-500/[0.06] p-5" role="alert">
      <p className="font-medium text-foreground">{t('loadError')}</p>
      <ApiErrorDetails error={error} />
      <Button className="mt-4" onClick={onRetry} variant="outline">
        {t('retry')}
      </Button>
    </div>
  );
}

function ApiErrorDetails({ error }: { error?: ApiError | null }): JSX.Element | null {
  if (process.env.NODE_ENV !== 'development' || !error) return null;
  return (
    <p className="mt-2 break-all font-mono text-xs text-muted">
      HTTP {error.status} · {error.url}
    </p>
  );
}

function Toast({
  message,
  error = false,
  apiError,
}: {
  message: string;
  error?: boolean;
  apiError?: ApiError | null;
}): JSX.Element | null {
  if (!message) return null;
  return (
    <div
      aria-live="polite"
      className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-400/40 text-red-300' : 'border-brand-lime/40 text-brand-lime'}`}
      role={error ? 'alert' : 'status'}
    >
      <p>{message}</p>
      <ApiErrorDetails error={apiError} />
    </div>
  );
}

function Loader(): JSX.Element {
  const t = useTranslations('memberArea');
  return (
    <div aria-label={t('loading')} className="space-y-4" role="status">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}): JSX.Element {
  return (
    <div className="mb-7">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-lime">{eyebrow}</p>
      <h2 className="display-font mt-2 break-words text-3xl font-bold leading-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{copy}</p>
    </div>
  );
}

export function MemberWorkspace({
  section,
  detail,
}: {
  section: string;
  detail?: string;
}): JSX.Element {
  const t = useTranslations('memberArea');
  if (section === 'membership') return <MembershipPage />;
  if (section === 'workouts') return <WorkoutsPage />;
  if (section === 'machines' || section === 'exercises') return <MachinesPage slug={detail} />;
  if (section === 'nutrition') return <NutritionPage />;
  if (section === 'trainers') return <TrainersPage />;
  if (section === 'appointments') return <AppointmentsPage />;
  if (section === 'profile') return <ProfilePage />;
  if (section === 'sponsors') return <OffersPage />;
  return <EmptyState title={t('unsupportedPage')} description={t('unsupportedPageCopy')} />;
}

function MembershipPage(): JSX.Element {
  const t = useTranslations('memberArea');
  const locale = useLocale();
  const [plans, setPlans] = useState<z.infer<typeof planListSchema>['data']>([]);
  const [history, setHistory] = useState<z.infer<typeof historySchema>['data']>([]);
  const [current, setCurrent] = useState<z.infer<typeof membershipSchema> | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [pendingId, setPendingId] = useState('');
  const [toast, setToast] = useState('');
  const [toastError, setToastError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [available, items, active] = await Promise.all([
        apiGet('/memberships/plans?page=1&pageSize=20', planListSchema),
        apiGet('/memberships/me/history?page=1&pageSize=50', historySchema),
        apiGet('/memberships/me', membershipSchema),
      ]);
      setPlans(available.data);
      setHistory(items.data);
      setCurrent(active);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function request(planId: string): Promise<void> {
    setPendingId(planId);
    setToast('');
    try {
      membershipRequestSchema.parse({ planId });
      await apiPostParsed('/memberships/request', { planId }, requestResultSchema);
      setToast(t('membershipRequested'));
      setToastError(false);
      await load();
    } catch (error) {
      setToast(
        error instanceof ApiError && error.status === 409
          ? t('membershipPendingConflict')
          : t('actionError'),
      );
      setToastError(true);
    } finally {
      setPendingId('');
    }
  }
  if (loading) return <Loader />;
  if (failed) return <Failure onRetry={() => void load()} />;
  const membership = current?.membership;
  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow={t('membershipEyebrow')}
        title={t('membershipTitle')}
        copy={t('membershipCopy')}
      />
      <Toast message={toast} error={toastError} />
      <Card className="border-brand-lime/25">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted">{t('currentStatus')}</p>
            <h3 className="mt-2 text-2xl font-semibold text-foreground">
              {membership ? memberPlanName(membership.plan, t) : t('noActiveMembership')}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {membership
                ? t('activeUntil', {
                    date: membership.endsAt ? formatDate(membership.endsAt, locale) : '—',
                    days: current?.daysRemaining ?? 0,
                  })
                : t('membershipPrompt')}
            </p>
          </div>
          <Badge className={membership ? 'border-brand-lime/40 text-brand-lime' : ''}>
            {membership ? t(`status_${membership.status}` as 'status_ACTIVE') : t('inactive')}
          </Badge>
        </div>
      </Card>
      {membership?.status === 'PENDING' && (
        <p className="rounded-xl border border-amber-300/30 bg-amber-300/[0.06] p-4 text-sm text-amber-100">
          {t('mockPaymentWaiting')}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <Card className="flex min-w-0 flex-col" key={plan.id}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              {t('planOption')}
            </p>
            <h3 className="mt-3 text-xl font-semibold text-foreground">
              {memberPlanName(plan, t)}
            </h3>
            <p className="mt-2 text-2xl font-bold text-brand-lime">
              {new Intl.NumberFormat(locale === 'mk' ? 'mk-MK' : 'en-GB').format(plan.priceMkd)}{' '}
              <span className="text-sm">MKD</span>
            </p>
            <Button
              className="mt-6 w-full"
              disabled={Boolean(pendingId)}
              onClick={() => void request(plan.id)}
            >
              {pendingId === plan.id ? t('working') : t('requestRenew')}
            </Button>
          </Card>
        ))}
      </div>
      <section aria-labelledby="membership-history-title">
        <h3 className="mb-3 text-xl font-semibold text-foreground" id="membership-history-title">
          {t('history')}
        </h3>
        {history.length === 0 ? (
          <EmptyState title={t('historyEmpty')} description={t('historyEmptyCopy')} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="bg-raised text-muted">
                <tr>
                  <th className="p-4">{t('planOption')}</th>
                  <th className="p-4">{t('requestedAt')}</th>
                  <th className="p-4">{t('status')}</th>
                  <th className="p-4">{t('amount')}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr className="border-t border-line" key={item.id}>
                    <td className="p-4 font-medium text-foreground">
                      {memberPlanName(item.plan, t)}
                    </td>
                    <td className="p-4 text-muted">{formatDate(item.createdAt, locale)}</td>
                    <td className="p-4">
                      <Badge>{t(`status_${item.status}` as 'status_ACTIVE')}</Badge>
                    </td>
                    <td className="p-4 text-muted">{item.plan.priceMkd} MKD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function MembershipLock(): JSX.Element {
  const t = useTranslations('memberArea');
  return (
    <Card className="text-center">
      <LockKeyhole aria-hidden="true" className="mx-auto text-brand-lime" size={28} />
      <h3 className="mt-3 text-xl font-semibold text-foreground">{t('membershipRequired')}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted">
        {t('membershipRequiredCopy')}
      </p>
      <Button asChild className="mt-5">
        <Link href="/member/membership">{t('viewMembership')}</Link>
      </Button>
    </Card>
  );
}

function WorkoutsPage(): JSX.Element {
  const t = useTranslations('memberArea');
  const tCommon = useTranslations('roleWorkspace');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const requestedExercise = searchParams.get('exercise') ?? '';
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [exercises, setExercises] = useState<
    Array<Exercise & { machineName: string; machineSlug: string }>
  >([]);
  const [history, setHistory] = useState<z.infer<typeof workoutListSchema>['data']>([]);
  const [records, setRecords] = useState<z.infer<typeof recordSchema>['data']>([]);
  const [selected, setSelected] = useState('');
  const [sets, setSets] = useState([{ reps: 10, weightKg: 0 }]);
  const [progress, setProgress] = useState<z.infer<typeof progressSchema>['data']>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressFailed, setProgressFailed] = useState(false);
  const [progressError, setProgressError] = useState<ApiError | null>(null);
  const [progressRetry, setProgressRetry] = useState(0);
  const [working, setWorking] = useState(false);
  const workingRef = useRef(false);
  const [toast, setToast] = useState('');
  const [toastError, setToastError] = useState(false);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    setLoadError(null);
    try {
      const [membership, logged, personalRecords, library] = await Promise.all([
        apiGet(apiEndpoints.membership, membershipSchema),
        apiGet(
          `${apiEndpoints.workouts.collection}?page=1&pageSize=100&locale=${locale}`,
          workoutListSchema,
        ),
        apiGet(
          `${apiEndpoints.workouts.personalRecords}?page=1&pageSize=100&locale=${locale}`,
          recordSchema,
        ),
        apiGet(
          `${apiEndpoints.machines.list}?locale=${locale}&page=1&pageSize=100`,
          machineListSchema,
        ),
      ]);
      const hasMembership = membership.membership?.status === 'ACTIVE';
      setActive(hasMembership);
      setHistory(logged.data);
      setRecords(personalRecords.data);
      if (hasMembership) {
        const exercisePages = await Promise.all(
          library.data.map(async (machine) => {
            const data = await apiGet(
              `${apiEndpoints.machines.exercises(machine.slug)}?locale=${locale}&page=1&pageSize=100`,
              exerciseListSchema,
            );
            return data.data.map((exercise) => ({
              ...exercise,
              machineName: machine.name,
              machineSlug: machine.slug,
            }));
          }),
        );
        setExercises(exercisePages.flat());
      }
    } catch (error) {
      if (!(error instanceof ApiError)) console.error('Unable to load member workouts.', error);
      setLoadError(error instanceof ApiError ? error : null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [locale]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (requestedExercise && exercises.some((exercise) => exercise.id === requestedExercise)) {
      setSelected(requestedExercise);
    }
  }, [exercises, requestedExercise]);
  useEffect(() => {
    if (!selected) {
      setProgress([]);
      setProgressLoading(false);
      setProgressFailed(false);
      setProgressError(null);
      return;
    }
    let alive = true;
    setProgress([]);
    setProgressLoading(true);
    setProgressFailed(false);
    setProgressError(null);
    apiGet(`${apiEndpoints.workouts.progress(selected)}?page=1&pageSize=30`, progressSchema)
      .then((result) => {
        if (!alive) return;
        setProgress(result.data);
        setProgressLoading(false);
      })
      .catch((error: unknown) => {
        if (!alive) return;
        if (!(error instanceof ApiError)) console.error('Unable to load workout progress.', error);
        setProgressError(error instanceof ApiError ? error : null);
        setProgressFailed(true);
        setProgressLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [progressRetry, selected]);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (workingRef.current) return;
    workingRef.current = true;
    setWorking(true);
    setToast('');
    setActionError(null);
    const parsed = workoutLogSchema.safeParse({ exerciseId: selected, sets });
    if (!parsed.success) {
      setToast(t('workoutValidation'));
      setToastError(true);
      workingRef.current = false;
      setWorking(false);
      return;
    }
    try {
      await apiPostParsed(apiEndpoints.workouts.collection, parsed.data, createdSchema);
      setToast(t('workoutSaved'));
      setToastError(false);
      await load();
    } catch (error) {
      if (!(error instanceof ApiError)) console.error('Unable to save workout.', error);
      setActionError(error instanceof ApiError ? error : null);
      setToast(t('actionError'));
      setToastError(true);
    } finally {
      workingRef.current = false;
      setWorking(false);
    }
  }
  if (loading) return <Loader />;
  if (failed) return <Failure error={loadError} onRetry={() => void load()} />;
  if (!active)
    return (
      <div className="space-y-6">
        <SectionHeading
          eyebrow={t('trainingEyebrow')}
          title={t('trainingTitle')}
          copy={t('trainingCopy')}
        />
        <MembershipLock />
      </div>
    );
  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow={t('trainingEyebrow')}
        title={t('trainingTitle')}
        copy={t('trainingCopy')}
      />
      <Toast apiError={actionError} message={toast} error={toastError} />
      <Card>
        <h3 className="mb-4 text-xl font-semibold text-foreground">{t('logWorkout')}</h3>
        {exercises.length === 0 ? (
          <EmptyState title={t('noExercises')} description={t('noExercisesCopy')} />
        ) : (
          <form className="space-y-4" onSubmit={(event) => void submit(event)}>
            <label className="block text-sm font-medium text-foreground">
              {t('exercise')}
              <select
                className="mt-2 h-12 w-full rounded-xl border border-line bg-canvas px-4 text-foreground"
                disabled={working}
                onChange={(event) => setSelected(event.target.value)}
                required
                value={selected}
              >
                <option value="">{t('chooseExercise')}</option>
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name} · {exercise.machineName}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-3">
              {sets.map((set, index) => (
                <div className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2" key={index}>
                  <span className="pb-3 text-xs text-muted">{index + 1}</span>
                  <label className="min-w-0 text-xs text-muted">
                    {t('reps')}
                    <Input
                      className="mt-1"
                      disabled={working}
                      max={100}
                      min={1}
                      onChange={(event) =>
                        setSets((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, reps: Number(event.target.value) }
                              : item,
                          ),
                        )
                      }
                      required
                      type="number"
                      value={set.reps}
                    />
                  </label>
                  <label className="min-w-0 text-xs text-muted">
                    {t('weightKg')}
                    <Input
                      className="mt-1"
                      disabled={working}
                      max={500}
                      min={0}
                      onChange={(event) =>
                        setSets((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, weightKg: Number(event.target.value) }
                              : item,
                          ),
                        )
                      }
                      required
                      step="0.5"
                      type="number"
                      value={set.weightKg}
                    />
                  </label>
                  <Button
                    aria-label={t('removeSet')}
                    className="mb-0.5 px-3"
                    disabled={working || sets.length === 1}
                    onClick={() =>
                      setSets((current) => current.filter((_, itemIndex) => index !== itemIndex))
                    }
                    type="button"
                    variant="outline"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={working}
                onClick={() =>
                  setSets((current) =>
                    current.length < 20 ? [...current, { reps: 10, weightKg: 0 }] : current,
                  )
                }
                type="button"
                variant="outline"
              >
                {t('addSet')}
              </Button>
              <Button disabled={!selected || working} type="submit">
                {working ? t('working') : t('saveWorkout')}
              </Button>
            </div>
          </form>
        )}
      </Card>
      <Card>
        <h3 className="mb-2 text-xl font-semibold text-foreground">{t('progressByExercise')}</h3>
        <label className="mb-4 block text-sm text-muted">
          {t('exercise')}
          <select
            className="mt-2 h-12 w-full max-w-md rounded-xl border border-line bg-canvas px-4 text-foreground"
            onChange={(event) => setSelected(event.target.value)}
            value={selected}
          >
            <option value="">{t('chooseExercise')}</option>
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>
        </label>
        {progressFailed ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t('loadError')}</p>
            <ApiErrorDetails error={progressError} />
            <Button onClick={() => setProgressRetry((value) => value + 1)} variant="outline">
              {tCommon('retry')}
            </Button>
          </div>
        ) : progressLoading ? (
          <div aria-label={t('loadingProgress')} className="space-y-3" role="status">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : (
          <ProgressChart locale={locale} points={progress} />
        )}
      </Card>
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-xl font-semibold text-foreground">{t('personalRecords')}</h3>
          {records.length === 0 ? (
            <EmptyState title={t('noRecords')} description={t('noRecordsCopy')} />
          ) : (
            <ul className="divide-y divide-line">
              {records.map((record) => {
                const exercise = exercises.find((item) => item.id === record.exerciseId);
                return (
                  <li
                    className="flex items-center justify-between gap-3 py-3"
                    key={record.exerciseId}
                  >
                    <span className="min-w-0 text-sm font-medium text-foreground">
                      {exercise ? (
                        <Link
                          className="hover:text-brand-lime hover:underline"
                          href={`/member/machines/${encodeURIComponent(exercise.machineSlug)}`}
                        >
                          {record.exerciseName}
                        </Link>
                      ) : (
                        record.exerciseName
                      )}
                    </span>
                    <span className="shrink-0 text-sm text-brand-lime">
                      {record.maxWeightKg} kg ·{' '}
                      {t('volumeShort', { volume: Math.round(record.maxVolumeKg) })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card>
          <h3 className="mb-4 text-xl font-semibold text-foreground">{t('workoutHistory')}</h3>
          {history.length === 0 ? (
            <EmptyState title={t('noWorkouts')} description={t('noWorkoutsCopy')} />
          ) : (
            <ul className="space-y-3">
              {history.slice(0, 8).map((item) => (
                <li
                  className="flex items-start justify-between gap-3 border-b border-line pb-3"
                  key={item.id}
                >
                  <div>
                    <p className="font-medium text-foreground">
                      <Link
                        className="hover:text-brand-lime hover:underline"
                        href={`/member/machines/${encodeURIComponent(item.exercise.machineSlug)}`}
                      >
                        {item.exercise.name}
                      </Link>
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatDate(item.performedAt, locale)}
                    </p>
                  </div>
                  <Badge>
                    {item.sets.length} {t('sets')}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

function ProgressChart({
  points,
  locale,
}: {
  points: z.infer<typeof progressSchema>['data'];
  locale: string;
}): JSX.Element {
  const t = useTranslations('memberArea');
  if (!points.length)
    return <EmptyState title={t('noProgress')} description={t('noProgressCopy')} />;
  const max = Math.max(...points.map((point) => point.maxWeightKg), 1);
  const coords = points
    .map(
      (point, index) =>
        `${points.length === 1 ? 50 : 8 + index * (84 / (points.length - 1))},${92 - (point.maxWeightKg / max) * 76}`,
    )
    .join(' ');
  return (
    <div>
      <svg
        aria-label={t('weightProgressChart')}
        className="h-48 w-full overflow-visible"
        preserveAspectRatio="none"
        role="img"
        viewBox="0 0 100 100"
      >
        <polyline
          fill="none"
          points={coords}
          stroke="var(--accent)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        {points.map((point, index) => (
          <circle
            cx={points.length === 1 ? 50 : 8 + index * (84 / (points.length - 1))}
            cy={92 - (point.maxWeightKg / max) * 76}
            fill="var(--accent)"
            key={point.id}
            r="2.5"
          >
            <title>{`${formatDate(point.performedAt, locale)}: ${point.maxWeightKg} kg`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-xs text-muted">
        <span>{formatDate(points[0].performedAt, locale)}</span>
        <span>{formatDate(points[points.length - 1].performedAt, locale)}</span>
      </div>
    </div>
  );
}

function MachineAnimation({ animationKey }: { animationKey: string | null }): JSX.Element {
  const kind = machineAnimationKind(animationKey);
  return (
    <svg
      aria-hidden="true"
      className="machine-animation h-full w-full text-brand-lime"
      data-animation-key={animationKey ?? 'general'}
      data-motion={kind}
      fill="none"
      viewBox="0 0 220 130"
    >
      <path
        d="M20 108h180M45 108l22-60h76l31 60M81 48V27h35v21M54 89h111"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5"
      />
      {kind === 'cardio' ? (
        <g className="machine-animation__moving-part">
          <circle cx="79" cy="99" r="16" stroke="currentColor" strokeWidth="5" />
          <circle cx="158" cy="99" r="16" stroke="currentColor" strokeWidth="5" />
          <path
            d="m79 99 25-41 24 41h30m-54-41h30l12 17"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="5"
          />
        </g>
      ) : (
        <>
          <rect height="39" rx="5" stroke="currentColor" strokeWidth="5" width="34" x="92" y="52" />
          <g className="machine-animation__moving-part">
            <path
              d="M54 41v59m112-59v59M45 41h18m94 0h18"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="5"
            />
            <path
              d="M70 73h80"
              stroke="currentColor"
              strokeDasharray="3 5"
              strokeLinecap="round"
              strokeWidth="4"
            />
          </g>
        </>
      )}
    </svg>
  );
}

function MachinesPage({ slug }: { slug?: string }): JSX.Element {
  const t = useTranslations('memberArea');
  const locale = useLocale();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [detail, setDetail] = useState<z.infer<typeof machineDetailSchema> | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [active, setActive] = useState(false);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [missing, setMissing] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    setMissing(false);
    setLoadError(null);
    try {
      const results = await apiGet(
        `${apiEndpoints.machines.list}?locale=${locale}&page=1&pageSize=100${category ? `&category=${category}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`,
        machineListSchema,
      );
      setMachines(results.data);
      if (slug) {
        const [membership, machine] = await Promise.all([
          apiGet(apiEndpoints.membership, membershipSchema),
          apiGet(`${apiEndpoints.machines.detail(slug)}?locale=${locale}`, machineDetailSchema),
        ]);
        setActive(membership.membership?.status === 'ACTIVE');
        setDetail(machine);
        if (membership.membership?.status === 'ACTIVE') {
          const full = await apiGet(
            `${apiEndpoints.machines.exercises(slug)}?locale=${locale}&page=1&pageSize=100`,
            exerciseListSchema,
          );
          setExercises(full.data);
        }
      }
    } catch (error) {
      setMissing(Boolean(slug && error instanceof ApiError && error.status === 404));
      if (!(error instanceof ApiError)) console.error('Unable to load machine library.', error);
      setLoadError(error instanceof ApiError ? error : null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [category, locale, search, slug]);
  useEffect(() => {
    void load();
  }, [load]);
  const categories = ['LEGS', 'CHEST', 'BACK', 'SHOULDERS', 'ARMS', 'CORE', 'CARDIO'];
  if (loading) return <Loader />;
  if (failed) {
    if (missing) {
      return (
        <div className="space-y-5">
          <Link
            className="inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-brand-lime"
            href="/member/machines"
          >
            <ChevronLeft aria-hidden="true" size={18} />
            {t('backToMachines')}
          </Link>
          <EmptyState title={t('machineNotFound')} description={t('machineNotFoundCopy')} />
          <ApiErrorDetails error={loadError} />
        </div>
      );
    }
    return <Failure error={loadError} onRetry={() => void load()} />;
  }
  if (slug && detail)
    return (
      <div className="space-y-7">
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-brand-lime"
          href="/member/machines"
        >
          <ChevronLeft aria-hidden="true" size={18} />
          {t('backToMachines')}
        </Link>
        <SectionHeading
          eyebrow={t('machineEyebrow')}
          title={detail.name}
          copy={detail.description}
        />
        <Card className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-raised">
            <Image
              alt={detail.name}
              className="object-cover"
              fill
              sizes="(max-width: 768px) 90vw, 60vw"
              src={detail.imageUrl ?? `/machines/${detail.slug}.svg`}
              unoptimized
            />
          </div>
          <div>
            <div className="aspect-[16/9] rounded-xl bg-raised p-4">
              <MachineAnimation animationKey={detail.animationKey} />
            </div>
            <Badge className="mt-4">{t(`category_${detail.category}` as 'category_LEGS')}</Badge>
            <div className="mt-4 flex flex-wrap gap-2">
              {detail.muscles.map((muscle) => (
                <Badge
                  className={muscle.primary ? 'border-brand-lime/35 text-brand-lime' : ''}
                  key={muscle.muscleGroup}
                >
                  {t(`muscle_${muscle.muscleGroup.replace(/\s+/g, '_')}` as 'muscle_quadriceps')} ·{' '}
                  {muscle.primary ? t('primaryMuscle') : t('secondaryMuscle')}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
        {!active ? (
          <MembershipLock />
        ) : exercises.length === 0 ? (
          <EmptyState title={t('noExercises')} description={t('noExercisesCopy')} />
        ) : (
          exercises.map((exercise) => (
            <div className="space-y-3" key={exercise.id}>
              <ExerciseDetail exercise={exercise} />
              <Button asChild variant="outline">
                <Link href={`/member/workouts?exercise=${encodeURIComponent(exercise.id)}`}>
                  {t('logWorkoutWithMachine')}
                </Link>
              </Button>
            </div>
          ))
        )}
      </div>
    );
  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow={t('machineEyebrow')}
        title={t('machinesTitle')}
        copy={t('machinesCopy')}
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          aria-label={t('searchMachines')}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('searchMachines')}
          value={search}
        />
        <select
          aria-label={t('category')}
          className="h-12 rounded-xl border border-line bg-canvas px-4 text-foreground"
          onChange={(event) => setCategory(event.target.value)}
          value={category}
        >
          <option value="">{t('allCategories')}</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {t(`category_${item}` as 'category_LEGS')}
            </option>
          ))}
        </select>
      </div>
      {machines.length === 0 ? (
        <EmptyState title={t('noMachines')} description={t('noMachinesCopy')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {machines.map((machine) => (
            <MachineCard machine={machine} key={machine.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function MachineCard({ machine }: { machine: Machine }): JSX.Element {
  const t = useTranslations('memberArea');
  return (
    <Link
      className="group rounded-panel border border-line bg-surface p-4 transition hover:border-brand-lime/40"
      href={`/member/machines/${encodeURIComponent(machine.slug)}`}
    >
      <div className="relative mb-4 aspect-[16/9] rounded-xl bg-raised p-3">
        {machine.imageUrl ? (
          <Image
            alt=""
            className="rounded-lg object-cover"
            fill
            loading="lazy"
            sizes="(max-width: 640px) 90vw, (max-width: 1280px) 45vw, 30vw"
            src={machine.imageUrl}
            unoptimized
          />
        ) : (
          <MachineAnimation animationKey={machine.animationKey} />
        )}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{machine.name}</p>
          <p className="mt-1 text-xs text-muted">
            {t(`category_${machine.category}` as 'category_LEGS')}
          </p>
        </div>
        <ArrowRight
          aria-hidden="true"
          className="text-brand-lime transition-transform group-hover:translate-x-1"
          size={18}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {machine.muscles.slice(0, 3).map((muscle) => (
          <Badge key={muscle.muscleGroup}>
            {t(`muscle_${muscle.muscleGroup.replace(/\s+/g, '_')}` as 'muscle_quadriceps')}
          </Badge>
        ))}
      </div>
    </Link>
  );
}

function ExerciseDetail({ exercise }: { exercise: Exercise }): JSX.Element {
  const t = useTranslations('memberArea');
  const consent = useCookieConsent();
  const [videoLoaded, setVideoLoaded] = useState(false);
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-xl font-semibold text-foreground">{exercise.name}</h3>
        <Badge>
          {t('recommendedSetsReps', {
            sets: exercise.recommendedSets ?? '—',
            reps: exercise.recommendedReps ?? '—',
          })}
        </Badge>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div>
          <h4 className="font-semibold text-foreground">{t('steps')}</h4>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-sm leading-relaxed text-muted">
            {exercise.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>
        <div>
          <h4 className="font-semibold text-foreground">{t('commonMistakes')}</h4>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-relaxed text-muted">
            {exercise.commonMistakes.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-foreground">{t('safetyTips')}</h4>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-relaxed text-muted">
            {exercise.safetyTips.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      {exercise.videoId &&
        (!isYouTubeVideoId(exercise.videoId) ? (
          <p className="mt-5 text-sm text-muted">{t('videoPlaceholder')}</p>
        ) : consent !== 'accepted' ? (
          <p className="mt-5 text-sm text-muted">{t('videoConsentNotice')}</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl bg-raised">
            {videoLoaded ? (
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="aspect-video w-full"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(exercise.videoId)}`}
                title={exercise.name}
              />
            ) : (
              <button
                className="flex aspect-video w-full flex-col items-center justify-center gap-2 p-4 text-sm text-foreground hover:text-brand-lime"
                onClick={() => setVideoLoaded(true)}
                type="button"
              >
                <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-lime text-brand-950">
                  ▶
                </span>
                {t('loadVideo')}
              </button>
            )}
          </div>
        ))}
    </Card>
  );
}

function NutritionPage(): JSX.Element {
  const t = useTranslations('memberArea');
  const locale = useLocale();
  const [plans, setPlans] = useState<z.infer<typeof nutritionListSchema>['data']>([]);
  const [selected, setSelected] = useState<z.infer<typeof nutritionDetailSchema> | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<z.infer<typeof nutritionQuestionnaireSchema>>({
    age: 30,
    sex: 'FEMALE',
    heightCm: 165,
    weightKg: 65,
    goal: 'maintain',
    activityLevel: 'moderate',
    mealsPerDay: 3,
    dietType: 'omnivore',
    allergies: [],
    dislikedFoods: [],
    trainingDaysPerWeek: 3,
  });
  const [allergies, setAllergies] = useState('');
  const [dislikedFoods, setDislikedFoods] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(
    async (id?: string) => {
      setLoading(true);
      try {
        const result = await apiGet('/nutrition/plans?page=1&pageSize=30', nutritionListSchema);
        setPlans(result.data);
        const target = id ?? result.data[0]?.id;
        setSelected(
          target
            ? await apiGet(`/nutrition/plans/${encodeURIComponent(target)}`, nutritionDetailSchema)
            : null,
        );
        setError('');
      } catch {
        setError(t('loadError'));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );
  useEffect(() => {
    void load();
  }, [load]);
  function update<K extends keyof typeof answers>(key: K, value: (typeof answers)[K]): void {
    setAnswers((current) => ({ ...current, [key]: value }));
  }
  async function generate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setWorking(true);
    setError('');
    const input = nutritionQuestionnaireSchema.safeParse({
      ...answers,
      allergies: allergies
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      dislikedFoods: dislikedFoods
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });
    if (!input.success) {
      setError(t('nutritionValidation'));
      setWorking(false);
      return;
    }
    try {
      const created = await apiPostParsed('/nutrition/questionnaire', input.data, createdSchema);
      setStep(0);
      await load(created.id);
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 429 ? t('nutritionQuota') : t('actionError'),
      );
    } finally {
      setWorking(false);
    }
  }
  async function regenerate(): Promise<void> {
    if (!selected) return;
    setWorking(true);
    setError('');
    try {
      const created = await apiPostParsed(
        `/nutrition/plans/${encodeURIComponent(selected.id)}/regenerate`,
        {},
        createdSchema,
      );
      await load(created.id);
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 429 ? t('nutritionQuota') : t('actionError'),
      );
    } finally {
      setWorking(false);
    }
  }
  async function remove(): Promise<void> {
    if (!selected || !window.confirm(t('deletePlanConfirm'))) return;
    setWorking(true);
    try {
      await apiDeleteParsed(
        `/nutrition/plans/${encodeURIComponent(selected.id)}`,
        {},
        deletedSchema,
      );
      await load();
    } catch {
      setError(t('actionError'));
    } finally {
      setWorking(false);
    }
  }
  if (loading) return <Loader />;
  const dayNumber = step + 1;
  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow={t('nutritionEyebrow')}
        title={t('nutritionTitle')}
        copy={t('nutritionCopy')}
      />
      <Toast error={Boolean(error)} message={error} />
      {!selected && (
        <Card>
          <div
            aria-label={t('wizardProgress', { step: dayNumber, total: 3 })}
            className="mb-6"
            role="progressbar"
            aria-valuemax={3}
            aria-valuemin={1}
            aria-valuenow={dayNumber}
          >
            <div className="h-2 overflow-hidden rounded-full bg-raised">
              <div
                className="h-full rounded-full bg-brand-lime"
                style={{ width: `${(dayNumber / 3) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              {t('wizardStep', { step: dayNumber, total: 3 })}
            </p>
          </div>
          <form
            className="space-y-5"
            onSubmit={(event) =>
              void (step < 2
                ? (event.preventDefault(), setStep((current) => current + 1))
                : generate(event))
            }
          >
            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label={t('age')}
                  max={100}
                  min={18}
                  onChange={(value) => update('age', value)}
                  value={answers.age}
                />
                <SelectField
                  label={t('sex')}
                  onChange={(value) => update('sex', value as typeof answers.sex)}
                  options={['MALE', 'FEMALE']}
                  value={answers.sex}
                  t={t}
                />
                <NumberField
                  label={t('heightCm')}
                  max={250}
                  min={120}
                  onChange={(value) => update('heightCm', value)}
                  value={answers.heightCm}
                />
                <NumberField
                  label={t('weightKg')}
                  max={350}
                  min={35}
                  onChange={(value) => update('weightKg', value)}
                  value={answers.weightKg}
                />
                <SelectField
                  label={t('goal')}
                  onChange={(value) => update('goal', value as typeof answers.goal)}
                  options={['lose', 'maintain', 'gain']}
                  value={answers.goal}
                  t={t}
                />
                <SelectField
                  label={t('activityLevel')}
                  onChange={(value) =>
                    update('activityLevel', value as typeof answers.activityLevel)
                  }
                  options={['sedentary', 'light', 'moderate', 'high', 'very_high']}
                  value={answers.activityLevel}
                  t={t}
                />
              </div>
            )}
            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label={t('mealsPerDay')}
                  max={6}
                  min={1}
                  onChange={(value) => update('mealsPerDay', value)}
                  value={answers.mealsPerDay}
                />
                <SelectField
                  label={t('dietType')}
                  onChange={(value) => update('dietType', value as typeof answers.dietType)}
                  options={['omnivore', 'vegetarian', 'vegan', 'halal']}
                  value={answers.dietType}
                  t={t}
                />
                <NumberField
                  label={t('trainingDays')}
                  max={7}
                  min={0}
                  onChange={(value) => update('trainingDaysPerWeek', value)}
                  value={answers.trainingDaysPerWeek}
                />
                <TextField
                  label={t('allergies')}
                  onChange={setAllergies}
                  placeholder={t('commaSeparated')}
                  value={allergies}
                />
                <TextField
                  label={t('dislikedFoods')}
                  onChange={setDislikedFoods}
                  placeholder={t('commaSeparated')}
                  value={dislikedFoods}
                />
              </div>
            )}
            {step === 2 && (
              <div className="rounded-xl bg-raised p-4">
                <h3 className="font-semibold text-foreground">{t('reviewAnswers')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {t('reviewSummary', {
                    age: answers.age,
                    height: answers.heightCm,
                    weight: answers.weightKg,
                    diet: answers.dietType,
                  })}
                </p>
                <p className="mt-2 text-sm text-muted">{t('notMedicalAdvice')}</p>
              </div>
            )}
            <div className="flex flex-wrap justify-between gap-3">
              {step > 0 ? (
                <Button
                  disabled={working}
                  onClick={() => setStep((current) => current - 1)}
                  type="button"
                  variant="outline"
                >
                  <ChevronLeft aria-hidden="true" size={16} />
                  {t('back')}
                </Button>
              ) : (
                <span />
              )}
              {step < 2 ? (
                <Button disabled={working} type="submit">
                  {t('continue')}
                  <ChevronRight aria-hidden="true" size={16} />
                </Button>
              ) : (
                <Button disabled={working} type="submit">
                  {working ? t('working') : t('generatePlan')}
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}
      {selected && (
        <div className="space-y-4">
          <Button
            disabled={working}
            onClick={() => {
              setSelected(null);
              setStep(0);
              setError('');
            }}
            variant="outline"
          >
            {t('newQuestionnaire')}
          </Button>
          <div className="member-print-area">
            <NutritionResults
              detail={selected}
              onRegenerate={() => void regenerate()}
              onDelete={() => void remove()}
              working={working}
            />
          </div>
        </div>
      )}
      {plans.length > 1 && (
        <div className="flex flex-wrap gap-2" aria-label={t('previousPlans')}>
          {plans.map((plan) => (
            <Button
              disabled={working}
              key={plan.id}
              onClick={() => void load(plan.id)}
              variant={plan.id === selected?.id ? 'default' : 'outline'}
            >
              {formatDate(plan.createdAt, locale)} · {t(`status_${plan.status}` as 'status_DRAFT')}
            </Button>
          ))}
        </div>
      )}
      <p className="text-xs leading-relaxed text-muted">{t('notMedicalAdvice')}</p>
    </div>
  );
}

function NutritionResults({
  detail,
  onRegenerate,
  onDelete,
  working,
}: {
  detail: z.infer<typeof nutritionDetailSchema>;
  onRegenerate: () => void;
  onDelete: () => void;
  working: boolean;
}): JSX.Element {
  const t = useTranslations('memberArea');
  const [day, setDay] = useState(1);
  const selectedDay =
    detail.planJson.days.find((item) => item.day === day) ?? detail.planJson.days[0];
  const macros = detail.questionnaire.macros;
  const total = Math.max(1, macros.proteinG * 4 + macros.carbsG * 4 + macros.fatG * 9);
  const segments = [macros.proteinG * 4, macros.carbsG * 4, macros.fatG * 9];
  const colors = ['var(--accent)', '#64cbb5', '#e8b766'];
  let offset = 0;
  return (
    <section className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{t('planStatus')}</p>
          <h3 className="mt-1 text-xl font-semibold text-foreground">
            {detail.status === 'APPROVED' ? t('approvedByTrainer') : t('draftPlan')}
          </h3>
          <p className="mt-1 text-xs text-muted">
            {t('generatedWith', { source: t(`option_${detail.source}` as 'option_AI') })}
          </p>
        </div>
        <Badge>{t(`status_${detail.status}` as 'status_DRAFT')}</Badge>
      </Card>
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <h3 className="text-xl font-semibold text-foreground">{t('dailyTargets')}</h3>
          <p className="mt-3 text-4xl font-bold text-brand-lime">
            {detail.questionnaire.targetCalories} <span className="text-sm font-medium">kcal</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            {t('bmrTdee', {
              bmr: detail.questionnaire.computedBmr,
              tdee: detail.questionnaire.computedTdee,
            })}
          </p>
          <div className="mt-5 flex items-center gap-5">
            <svg
              aria-label={t('macrosChart')}
              className="h-32 w-32 shrink-0 -rotate-90"
              role="img"
              viewBox="0 0 100 100"
            >
              <circle cx="50" cy="50" fill="none" r="38" stroke="var(--line)" strokeWidth="15" />
              {segments.map((segment, index) => {
                const length = (segment / total) * 238.76;
                const currentOffset = offset;
                offset += length;
                return (
                  <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    key={index}
                    r="38"
                    stroke={colors[index]}
                    strokeDasharray={`${length} 238.76`}
                    strokeDashoffset={-currentOffset}
                    strokeWidth="15"
                  />
                );
              })}
            </svg>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                {t('protein')}: {macros.proteinG} g
              </li>
              <li>
                {t('carbohydrates')}: {macros.carbsG} g
              </li>
              <li>
                {t('fat')}: {macros.fatG} g
              </li>
            </ul>
          </div>
        </Card>
        <Card className="min-w-0">
          <div className="flex items-center gap-2">
            <Flame aria-hidden="true" className="text-brand-lime" size={19} />
            <h3 className="text-xl font-semibold text-foreground">{t('mealPlan')}</h3>
          </div>
          <div className="mt-4 flex min-w-0 flex-wrap gap-2 pb-2">
            {detail.planJson.days.map((item) => (
              <Button
                className="shrink-0"
                key={item.day}
                onClick={() => setDay(item.day)}
                variant={day === item.day ? 'default' : 'outline'}
              >
                {t('day', { day: item.day })}
              </Button>
            ))}
          </div>
          <div className="space-y-3">
            {selectedDay?.meals.map((meal, index) => (
              <article className="rounded-xl border border-line p-4" key={`${meal.name}-${index}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="font-semibold text-foreground">{meal.name}</h4>
                  <Badge>{meal.calories} kcal</Badge>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  {meal.ingredients.join(' · ')}
                </p>
                <p className="mt-2 text-xs text-muted">
                  {meal.proteinG}g {t('proteinShort')} · {meal.carbsG}g {t('carbsShort')} ·{' '}
                  {meal.fatG}g {t('fatShort')}
                </p>
              </article>
            ))}
          </div>
        </Card>
      </div>
      <div className="flex flex-wrap gap-3 print:hidden">
        <Button disabled={working} onClick={onRegenerate}>
          <Sparkles aria-hidden="true" size={16} />
          {t('regenerate')}
        </Button>
        <Button disabled={working} onClick={onDelete} variant="outline">
          <Trash2 aria-hidden="true" size={16} />
          {t('deletePlan')}
        </Button>
        <Button onClick={() => window.print()} variant="outline">
          {t('printPlan')}
        </Button>
      </div>
      <p className="text-sm leading-relaxed text-muted">{t('notMedicalAdvice')}</p>
    </section>
  );
}

function NumberField({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}): JSX.Element {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <Input
        className="mt-2"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        required
        type="number"
        value={value}
      />
    </label>
  );
}
function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <Input
        className="mt-2"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}
function SelectField({
  label,
  value,
  options,
  onChange,
  t,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  t: ReturnType<typeof useTranslations<'memberArea'>>;
}): JSX.Element {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <select
        className="mt-2 h-12 w-full rounded-xl border border-line bg-canvas px-4 text-foreground"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {t(`option_${option}` as 'option_MALE')}
          </option>
        ))}
      </select>
    </label>
  );
}

function TrainersPage(): JSX.Element {
  const t = useTranslations('memberArea');
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setTrainers((await apiGet('/trainers?page=1&pageSize=100', trainerListSchema)).data);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  if (loading) return <Loader />;
  if (failed) return <Failure onRetry={() => void load()} />;
  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow={t('trainersEyebrow')}
        title={t('trainersTitle')}
        copy={t('trainersCopy')}
      />
      {trainers.length === 0 ? (
        <EmptyState title={t('noTrainers')} description={t('noTrainersCopy')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {trainers.map((trainer) => (
            <TrainerCard key={trainer.id} trainer={trainer} />
          ))}
        </div>
      )}
    </div>
  );
}

function TrainerCard({ trainer }: { trainer: Trainer }): JSX.Element {
  const t = useTranslations('memberArea');
  const profile = useTranslations('trainerProfile');
  return (
    <Card>
      <div className="flex items-start gap-4">
        {trainer.photoUrl ? (
          <Image
            alt=""
            className="h-16 w-16 rounded-full object-cover"
            height={64}
            src={trainer.photoUrl}
            unoptimized
            width={64}
          />
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-raised text-brand-lime">
            <Activity aria-hidden="true" size={25} />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground">
            {trainer.name ?? t('trainerName')}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {trainer.bio ?? t('trainerBio')}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {trainer.specialties.map((specialty) => (
          <Badge key={specialty}>{specialty}</Badge>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button asChild className="w-full" variant="outline">
          <Link href={`/trainers/${encodeURIComponent(trainer.id)}`}>{profile('viewProfile')}</Link>
        </Button>
        <Button asChild className="w-full" variant="secondary">
          <Link href={`/member/appointments?trainer=${encodeURIComponent(trainer.id)}`}>
            {t('requestAppointment')}
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

function AppointmentsPage(): JSX.Element {
  const t = useTranslations('memberArea');
  const tCommon = useTranslations('roleWorkspace');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const trainerQuery = searchParams.get('trainer') ?? '';
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [appointments, setAppointments] = useState<z.infer<typeof appointmentsSchema>['data']>([]);
  const [trainerId, setTrainerId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState('');
  const [toastError, setToastError] = useState(false);
  const [working, setWorking] = useState(false);
  const workingRef = useRef(false);
  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [trainerResult, appointmentResult] = await Promise.all([
        apiGet('/trainers?page=1&pageSize=100', trainerListSchema),
        apiGet('/appointments/me?page=1&pageSize=100', appointmentsSchema),
      ]);
      setTrainers(trainerResult.data);
      setAppointments(appointmentResult.data);
      const requestedTrainer = trainerResult.data.find(({ id }) => id === trainerQuery);
      setTrainerId((current) => current || requestedTrainer?.id || trainerResult.data[0]?.id || '');
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [trainerQuery]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (workingRef.current) return;
    workingRef.current = true;
    setWorking(true);
    setToast('');
    const start = new Date(startsAt);
    const input = appointmentRequestSchema.safeParse({
      trainerId,
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 60 * 60_000).toISOString(),
    });
    if (!input.success || start <= new Date()) {
      setToast(t('appointmentValidation'));
      setToastError(true);
      workingRef.current = false;
      setWorking(false);
      return;
    }
    try {
      await apiPostParsed('/appointments', input.data, requestResultSchema);
      setToast(t('appointmentRequested'));
      setToastError(false);
      setStartsAt('');
      await load();
    } catch (error) {
      console.error(
        'Unable to request appointment.',
        error instanceof ApiError ? error.status : 'invalid response or network error',
      );
      setToast(
        error instanceof ApiError && error.status === 409
          ? t('appointmentConflict')
          : t('appointmentFailed'),
      );
      setToastError(true);
    } finally {
      workingRef.current = false;
      setWorking(false);
    }
  }
  async function cancel(id: string): Promise<void> {
    if (workingRef.current || !window.confirm(tCommon('confirmDestructiveAction'))) return;
    workingRef.current = true;
    setWorking(true);
    try {
      await apiPatchParsed(
        `/appointments/${encodeURIComponent(id)}/cancel`,
        {},
        requestResultSchema,
      );
      setToast(t('appointmentCancelled'));
      setToastError(false);
      await load();
    } catch (error) {
      console.error(
        'Unable to cancel appointment.',
        error instanceof ApiError ? error.status : 'invalid response or network error',
      );
      setToast(
        error instanceof ApiError && error.status === 409
          ? t('appointmentConflict')
          : t('actionError'),
      );
      setToastError(true);
    } finally {
      workingRef.current = false;
      setWorking(false);
    }
  }
  if (loading) return <Loader />;
  if (failed) return <Failure onRetry={() => void load()} />;
  const now = new Date();
  const sorted = [...appointments].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const upcoming = sorted.filter((item) => item.startsAt >= now && item.status !== 'CANCELLED');
  const previous = sorted.filter((item) => item.startsAt < now || item.status === 'CANCELLED');
  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow={t('appointmentsEyebrow')}
        title={t('appointmentsTitle')}
        copy={t('appointmentsCopy')}
      />
      <Toast error={toastError} message={toast} />
      <Card>
        <h3 className="mb-4 text-xl font-semibold text-foreground">{t('requestAppointment')}</h3>
        {trainers.length === 0 ? (
          <EmptyState title={t('noTrainers')} description={t('noTrainersCopy')} />
        ) : (
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void submit(event)}>
            <label className="text-sm font-medium text-foreground">
              {t('trainer')}
              <select
                className="mt-2 h-12 w-full rounded-xl border border-line bg-canvas px-4 text-foreground"
                disabled={working}
                onChange={(event) => setTrainerId(event.target.value)}
                value={trainerId}
              >
                {trainers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name ?? t('trainerName')}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-foreground">
              {t('dateAndTime')}
              <Input
                className="mt-2"
                disabled={working}
                min={localDateTimeMinimum()}
                onChange={(event) => setStartsAt(event.target.value)}
                required
                type="datetime-local"
                value={startsAt}
              />
            </label>
            <div className="sm:col-span-2">
              <Button disabled={working || !startsAt || !trainerId} type="submit">
                {working ? t('working') : t('sendRequest')}
              </Button>
            </div>
          </form>
        )}
      </Card>
      <AppointmentList
        items={upcoming}
        locale={locale}
        onCancel={(id) => void cancel(id)}
        title={t('upcomingAppointments')}
        working={working}
      />
      <AppointmentList
        items={previous}
        locale={locale}
        onCancel={(id) => void cancel(id)}
        title={t('pastAppointments')}
        working={working}
      />
    </div>
  );
}

function AppointmentList({
  items,
  locale,
  onCancel,
  title,
  working,
}: {
  items: z.infer<typeof appointmentsSchema>['data'];
  locale: string;
  onCancel: (id: string) => void;
  title: string;
  working: boolean;
}): JSX.Element {
  const t = useTranslations('memberArea');
  return (
    <section>
      <h3 className="mb-3 text-xl font-semibold text-foreground">{title}</h3>
      {items.length === 0 ? (
        <EmptyState title={t('noAppointments')} description={t('noAppointmentsCopy')} />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4" key={item.id}>
              <div className="flex items-start gap-3">
                <CalendarDays aria-hidden="true" className="mt-1 text-brand-lime" size={19} />
                <div>
                  <p className="font-medium text-foreground">
                    {formatDate(item.startsAt, locale, { dateStyle: 'full', timeStyle: 'short' })}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(item.endsAt, locale, { timeStyle: 'short' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge>{t(`status_${item.status}` as 'status_REQUESTED')}</Badge>
                {['REQUESTED', 'CONFIRMED'].includes(item.status) && item.startsAt > new Date() && (
                  <Button disabled={working} onClick={() => onCancel(item.id)} variant="outline">
                    {t('cancelAppointment')}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function ProfilePage(): JSX.Element {
  const t = useTranslations('memberArea');
  const router = useRouter();
  const [profile, setProfile] = useState<z.infer<typeof memberProfileSchema> | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    birthDate: '',
    gender: '',
    heightCm: '',
    weightKg: '',
    locale: 'mk' as 'mk' | 'en',
  });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [working, setWorking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [toastError, setToastError] = useState(false);
  const downloadUrl = useRef<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const value = await apiGet(apiEndpoints.memberProfile, memberProfileSchema);
      setProfile(value);
      setForm({
        name: value.profile?.name ?? '',
        phone: value.profile?.phone ?? '',
        birthDate: value.profile?.birthDate
          ? value.profile.birthDate.toISOString().slice(0, 10)
          : '',
        gender: value.profile?.gender ?? '',
        heightCm: value.profile?.heightCm?.toString() ?? '',
        weightKg: value.profile?.weightKg?.toString() ?? '',
        locale: value.locale,
      });
    } catch (cause) {
      if (!(cause instanceof ApiError)) console.error('Unable to load member profile.', cause);
      setLoadError(cause instanceof ApiError ? cause : null);
      setError(t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    void load();
  }, [load]);
  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setWorking(true);
    setError('');
    setToast('');
    const data = {
      name: form.name.trim() || null,
      phone: form.phone.trim() || null,
      birthDate: form.birthDate || null,
      gender: form.gender || null,
      heightCm: form.heightCm ? Number(form.heightCm) : null,
      weightKg: form.weightKg ? Number(form.weightKg) : null,
      locale: form.locale,
    };
    const parsed = memberProfileUpdateSchema.safeParse(data);
    if (!parsed.success) {
      setError(t('profileValidation'));
      setWorking(false);
      return;
    }
    try {
      const result = await apiPatchParsed(
        apiEndpoints.memberProfile,
        parsed.data,
        memberProfileSchema,
      );
      document.cookie = `ip_locale=${result.locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
      setToast(t('profileSaved'));
      setToastError(false);
      window.dispatchEvent(new CustomEvent('ironpulse-locale-change', { detail: result.locale }));
      router.refresh();
      await load();
    } catch {
      setError(t('actionError'));
    } finally {
      setWorking(false);
    }
  }
  async function exportData(): Promise<void> {
    if (exporting) return;
    setExporting(true);
    setError('');
    try {
      const payload = await apiGet('/me/export', z.record(z.unknown()));
      const file = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(file);
      downloadUrl.current = url;
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ironpulse-personal-data.json';
      link.click();
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
        if (downloadUrl.current === url) downloadUrl.current = null;
      }, 1000);
    } catch (cause) {
      console.error(
        'Unable to export member data.',
        cause instanceof ApiError ? cause.status : 'invalid response or network error',
      );
      setError(t('exportFailed'));
    } finally {
      setExporting(false);
    }
  }
  async function deleteAccount(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const parsed = confirmPasswordSchema.safeParse({ password });
    if (!parsed.success) {
      setError(t('passwordRequired'));
      return;
    }
    if (!window.confirm(t('deleteAccountWarning'))) return;
    setWorking(true);
    setError('');
    try {
      await apiDeleteParsed('/me', parsed.data, messageSchema);
      setToast(t('accountDeleted'));
      setToastError(false);
      window.location.assign('/login');
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 401 ? t('wrongPassword') : t('actionError'),
      );
    } finally {
      setWorking(false);
    }
  }
  if (loading) return <Loader />;
  if (!profile) return <Failure error={loadError} onRetry={() => void load()} />;
  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow={t('profileEyebrow')}
        title={t('profileTitle')}
        copy={t('profileCopy')}
      />
      <Toast error={toastError} message={toast} />
      {error && <Toast error message={error} />}
      <Card>
        <h3 className="mb-4 text-xl font-semibold text-foreground">{t('personalInformation')}</h3>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void save(event)}>
          <label className="text-sm text-muted">
            {t('email')}
            <Input className="mt-2" disabled value={profile.email} />
          </label>
          <TextField
            label={t('name')}
            onChange={(name) => setForm((current) => ({ ...current, name }))}
            placeholder={t('name')}
            value={form.name}
          />
          <TextField
            label={t('phone')}
            onChange={(phone) => setForm((current) => ({ ...current, phone }))}
            placeholder={t('phone')}
            value={form.phone}
          />
          <label className="text-sm text-muted">
            {t('birthDate')}
            <Input
              className="mt-2"
              onChange={(event) =>
                setForm((current) => ({ ...current, birthDate: event.target.value }))
              }
              type="date"
              value={form.birthDate}
            />
          </label>
          <SelectField
            label={t('gender')}
            onChange={(gender) => setForm((current) => ({ ...current, gender }))}
            options={['', 'MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']}
            value={form.gender}
            t={t}
          />
          <label className="text-sm text-muted">
            {t('heightCm')}
            <Input
              className="mt-2"
              max={250}
              min={120}
              onChange={(event) =>
                setForm((current) => ({ ...current, heightCm: event.target.value }))
              }
              type="number"
              value={form.heightCm}
            />
          </label>
          <label className="text-sm text-muted">
            {t('weightKg')}
            <Input
              className="mt-2"
              max={350}
              min={35}
              onChange={(event) =>
                setForm((current) => ({ ...current, weightKg: event.target.value }))
              }
              step="0.1"
              type="number"
              value={form.weightKg}
            />
          </label>
          <SelectField
            label={t('language')}
            onChange={(locale) =>
              setForm((current) => ({ ...current, locale: locale as 'mk' | 'en' }))
            }
            options={['mk', 'en']}
            value={form.locale}
            t={t}
          />
          <div className="sm:col-span-2">
            <Button disabled={working} type="submit">
              {t('saveProfile')}
            </Button>
          </div>
        </form>
      </Card>
      <Card>
        <h3 className="text-xl font-semibold text-foreground">{t('privacyTools')}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t('exportCopy')}</p>
        <Button
          className="mt-4"
          disabled={exporting}
          onClick={() => void exportData()}
          variant="outline"
        >
          {exporting ? t('working') : t('downloadData')}
        </Button>
      </Card>
      <Card className="border-red-400/30">
        <div className="flex items-start gap-3">
          <ShieldAlert aria-hidden="true" className="mt-1 text-red-300" size={20} />
          <div>
            <h3 className="text-xl font-semibold text-foreground">{t('deleteAccount')}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t('deleteAccountWarning')}</p>
          </div>
        </div>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => void deleteAccount(event)}
        >
          <Input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t('password')}
            required
            type="password"
            value={password}
          />
          <Button className="shrink-0" disabled={working} type="submit" variant="outline">
            {t('deleteAccount')}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function OffersPage(): JSX.Element {
  const t = useTranslations('memberArea');
  const locale = useLocale();
  const [sponsors, setSponsors] = useState<z.infer<typeof sponsorsSchema>['data']>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const tracked = useRef(new Set<string>());
  const offersContainer = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setSponsors((await apiGet('/sponsors?page=1&pageSize=100', sponsorsSchema)).data);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (loading || !offersContainer.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = (entry.target as HTMLElement).dataset.sponsorId;
          if (!id || tracked.current.has(id)) return;
          tracked.current.add(id);
          void apiPostParsed(
            `/sponsors/${encodeURIComponent(id)}/impressions`,
            {},
            trackingSchema,
          ).catch(() => console.error('Unable to record sponsor impression.'));
        });
      },
      { threshold: 0.25 },
    );
    offersContainer.current
      .querySelectorAll<HTMLElement>('[data-sponsor-id]')
      .forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [loading, sponsors]);
  if (loading) return <Loader />;
  if (failed) return <Failure onRetry={() => void load()} />;
  function recordOfferClick(offerId: string): void {
    void apiPostParsed(
      `/sponsors/offers/${encodeURIComponent(offerId)}/click`,
      {},
      trackingSchema,
    ).catch(() => console.error('Unable to record sponsor offer click.'));
  }
  const offers = sponsors.flatMap((sponsor) =>
    sponsor.offers.map((offer) => ({ ...offer, sponsor })),
  );
  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow={t('offersEyebrow')}
        title={t('offersTitle')}
        copy={t('offersCopy')}
      />
      {offers.length === 0 ? (
        <EmptyState title={t('noOffers')} description={t('noOffersCopy')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2" ref={offersContainer}>
          {offers.map(({ sponsor, ...offer }) => (
            <article
              className="rounded-panel border border-line bg-surface p-5"
              data-sponsor-id={sponsor.id}
              key={offer.id}
            >
              <div className="flex items-center gap-3">
                {sponsor.logoUrl ? (
                  <Image
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover"
                    height={48}
                    src={sponsor.logoUrl}
                    unoptimized
                    width={48}
                  />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-raised text-brand-lime">
                    <Dumbbell aria-hidden="true" size={20} />
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted">
                    {sponsor.companyName}
                  </p>
                  <h3 className="mt-1 font-semibold text-foreground">{offer.title}</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted">{offer.description}</p>
              {offer.discountCode && (
                <p className="mt-3 inline-flex rounded-lg border border-brand-lime/30 px-3 py-2 font-mono text-sm text-brand-lime">
                  {offer.discountCode}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs text-muted">
                  {offer.validUntil
                    ? t('validUntil', { date: formatDate(offer.validUntil, locale) })
                    : t('noExpiry')}
                </span>
                {sponsor.websiteUrl && (
                  <a
                    className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-lime hover:underline"
                    href={sponsor.websiteUrl}
                    onClick={() => recordOfferClick(offer.id)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {t('visitOffer')}
                    <ArrowRight aria-hidden="true" size={15} />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function MemberOverviewExtras(): JSX.Element {
  const t = useTranslations('memberArea');
  const locale = useLocale();
  const [membership, setMembership] = useState<z.infer<typeof membershipSchema> | null>(null);
  const [workouts, setWorkouts] = useState<z.infer<typeof workoutListSchema>['data']>([]);
  const [appointments, setAppointments] = useState<z.infer<typeof appointmentsSchema>['data']>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [membershipResult, workoutResult, appointmentResult] = await Promise.all([
        apiGet('/memberships/me', membershipSchema),
        apiGet(`/workouts?page=1&pageSize=100&locale=${locale}`, workoutListSchema),
        apiGet('/appointments/me?page=1&pageSize=100', appointmentsSchema),
      ]);
      setMembership(membershipResult);
      setWorkouts(workoutResult.data);
      setAppointments(appointmentResult.data);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [locale]);
  useEffect(() => {
    void load();
  }, [load]);
  if (loading)
    return (
      <div className="mt-6 space-y-4">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  if (failed)
    return (
      <div className="mt-6">
        <Failure onRetry={() => void load()} />
      </div>
    );
  const next = appointments
    .filter((item) => item.startsAt >= new Date() && item.status !== 'CANCELLED')
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
  const lastWorkout = workouts[0];
  const current = membership?.membership;
  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted">{t('memberStatus')}</p>
              <h3 className="mt-2 text-xl font-semibold text-foreground">
                {current ? memberPlanName(current.plan, t) : t('noActiveMembership')}
              </h3>
              <p className="mt-2 text-sm text-muted">
                {current?.endsAt
                  ? t('membershipEnds', { date: formatDate(current.endsAt, locale) })
                  : t('chooseMembership')}
              </p>
            </div>
            <Badge>
              {current ? t(`status_${current.status}` as 'status_ACTIVE') : t('inactive')}
            </Badge>
          </div>
          {current && (membership?.daysRemaining ?? 0) <= 7 && (
            <p className="mt-4 rounded-lg bg-amber-300/10 p-3 text-sm text-amber-100">
              {t('expiringSoon', { days: membership?.daysRemaining ?? 0 })}
            </p>
          )}
          <Button asChild className="mt-4" size="sm" variant="outline">
            <Link href="/member/membership">{t('manageMembership')}</Link>
          </Button>
        </Card>
        <Card>
          <h3 className="text-xs uppercase tracking-widest text-muted">{t('weeklySummary')}</h3>
          <p className="mt-3 text-3xl font-bold text-brand-lime">
            {weeklyWorkoutCount(workouts.map((item) => item.performedAt))}
          </p>
          <p className="text-sm text-muted">{t('workoutsThisWeek')}</p>
          <p className="mt-4 text-sm text-foreground">
            {t('latestWorkout')}:{' '}
            {lastWorkout ? (
              <Link
                className="font-medium hover:text-brand-lime hover:underline"
                href="/member/workouts"
              >
                {lastWorkout.exercise.name}
              </Link>
            ) : (
              t('nothingYet')
            )}
          </p>
          <p className="mt-1 text-xs text-muted">
            {lastWorkout ? formatDate(lastWorkout.performedAt, locale) : t('recordWorkoutPrompt')}
          </p>
          {lastWorkout && (
            <Link
              className="mt-3 inline-flex min-h-11 items-center text-sm text-brand-lime hover:underline"
              href={`/member/machines/${encodeURIComponent(lastWorkout.exercise.machineSlug)}`}
            >
              {t('viewMachineGuide')}
            </Link>
          )}
        </Card>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h3 className="font-semibold text-foreground">{t('nextAppointment')}</h3>
          {next ? (
            <>
              <p className="mt-2 text-sm text-brand-lime">
                {formatDate(next.startsAt, locale, { dateStyle: 'full', timeStyle: 'short' })}
              </p>
              {next.trainerName && <p className="mt-1 text-sm text-muted">{next.trainerName}</p>}
              <Badge className="mt-3">{t(`status_${next.status}` as 'status_REQUESTED')}</Badge>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">{t('noAppointmentsCopy')}</p>
          )}
          <Button asChild className="mt-4" size="sm" variant="outline">
            <Link href="/member/appointments">{t('appointmentsTitle')}</Link>
          </Button>
        </Card>
        <Card>
          <h3 className="font-semibold text-foreground">{t('quickActions')}</h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ['membership', t('manageMembership')],
              ['workouts', t('trainingTitle')],
              ['nutrition', t('nutritionTitle')],
              ['machines', t('machinesTitle')],
              ['trainers', t('trainersTitle')],
              ['profile', t('profileTitle')],
            ].map(([path, label]) => (
              <Link
                className="flex min-h-11 items-center justify-between rounded-xl border border-line px-3 text-sm text-foreground hover:border-brand-lime/40"
                href={`/member/${path}`}
                key={path}
              >
                {label}
                <ArrowRight aria-hidden="true" className="text-brand-lime" size={15} />
              </Link>
            ))}
          </div>
        </Card>
      </div>
      <div>
        <h3 className="mb-3 text-xl font-semibold text-foreground">{t('offersEyebrow')}</h3>
        <OffersPreview />
      </div>
    </div>
  );
}

function OffersPreview(): JSX.Element {
  const t = useTranslations('memberArea');
  const [sponsors, setSponsors] = useState<z.infer<typeof sponsorsSchema>['data']>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    apiGet('/sponsors?page=1&pageSize=10', sponsorsSchema)
      .then((result) => {
        if (active) setSponsors(result.data);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const offers = sponsors
    .flatMap((sponsor) => sponsor.offers.map((offer) => ({ sponsor, offer })))
    .slice(0, 4);
  if (failed) return <p className="text-sm text-muted">{t('offersUnavailable')}</p>;
  if (!offers.length) return <p className="text-sm text-muted">{t('noOffersCopy')}</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {offers.map(({ sponsor, offer }) => (
        <OfferPreviewCard key={offer.id} offer={offer} sponsor={sponsor} />
      ))}
      <Link
        className="flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-lime hover:underline"
        href="/member/sponsors"
      >
        {t('allOffers')}
        <ArrowRight aria-hidden="true" size={15} />
      </Link>
    </div>
  );
}

function OfferPreviewCard({
  sponsor,
  offer,
}: {
  sponsor: z.infer<typeof sponsorsSchema>['data'][number];
  offer: z.infer<typeof sponsorsSchema>['data'][number]['offers'][number];
}): JSX.Element {
  const t = useTranslations('memberArea');
  const tracked = useRef(false);
  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!cardRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true;
          void apiPostParsed(
            `/sponsors/${encodeURIComponent(sponsor.id)}/impressions`,
            {},
            trackingSchema,
          ).catch(() => console.error('Unable to record sponsor impression.'));
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [sponsor.id]);
  const recordClick = (): void => {
    void apiPostParsed(
      `/sponsors/offers/${encodeURIComponent(offer.id)}/click`,
      {},
      trackingSchema,
    ).catch(() => console.error('Unable to record sponsor offer click.'));
  };
  return (
    <article className="rounded-xl border border-line bg-surface p-4" ref={cardRef}>
      <p className="text-xs uppercase tracking-widest text-muted">{sponsor.companyName}</p>
      <h4 className="mt-2 font-semibold text-foreground">{offer.title}</h4>
      {sponsor.websiteUrl && (
        <a
          className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm text-brand-lime hover:underline"
          href={sponsor.websiteUrl}
          onClick={recordClick}
          rel="noreferrer"
          target="_blank"
        >
          {t('visitOffer')}
          <ArrowRight aria-hidden="true" size={14} />
        </a>
      )}
    </article>
  );
}
