'use client';

import { nutritionPlanSchema } from '@ironpulse/shared';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { ApiError, apiGet, apiPatchParsed, apiPostParsed, apiPutParsed } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ResponsiveTable,
  TableColumn,
  useWorkspaceAction,
  WorkspaceFeedback,
  WorkspaceLoading,
} from '@/components/role-workspace-common';

const pageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    pagination: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }).passthrough(),
  }).passthrough();
const clientSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email(),
  assignedAt: z.coerce.date().optional(),
});
const profileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  createdAt: z.coerce.date(),
  profile: z.object({
    name: z.string().nullable(),
    phone: z.string().nullable(),
    birthDate: z.coerce.date().nullable(),
    gender: z.string().nullable(),
    heightCm: z.number().nullable(),
    weightKg: z.number().nullable(),
    avatarUrl: z.string().nullable(),
  }).nullable(),
});
const workoutSchema = z.object({
  id: z.string(),
  performedAt: z.coerce.date(),
  exercise: z.object({ nameEn: z.string(), machine: z.object({ nameEn: z.string() }) }),
  sets: z.array(z.object({ setNumber: z.number(), reps: z.number(), weightKg: z.number() })),
});
const appointmentSchema = z.object({
  id: z.string(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  status: z.enum(['REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
  notes: z.string().nullable(),
  member: z.object({ id: z.string(), name: z.string().nullable() }),
});
const availabilitySchema = z.array(z.object({
  id: z.string(),
  weekday: z.number().int(),
  startsAt: z.number().int(),
  endsAt: z.number().int(),
}));
const planSchema = z.object({
  id: z.string(),
  status: z.enum(['DRAFT', 'APPROVED']),
  source: z.string(),
  createdAt: z.coerce.date(),
  planJson: z.unknown(),
});
const trainerPublicSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    name: z.string().nullable(),
    bio: z.string().nullable(),
    specialties: z.array(z.string()),
    photoUrl: z.string().nullable(),
  })),
}).passthrough();
const ownTrainerProfileSchema = z.object({ id: z.string() }).passthrough();
const clientsResponseSchema = pageSchema(clientSchema);
const workoutsResponseSchema = pageSchema(workoutSchema);
const plansResponseSchema = pageSchema(planSchema);
const appointmentsResponseSchema = pageSchema(appointmentSchema);

type Client = z.infer<typeof clientSchema>;
type Appointment = z.infer<typeof appointmentSchema>;
type Plan = z.infer<typeof planSchema>;
function useTrainerNotice() {
  return useWorkspaceAction('Trainer');
}

function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'mk' ? 'mk-MK' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Skopje',
  }).format(date);
}

function dateOnly(date: Date | null, locale: string): string {
  return date
    ? new Intl.DateTimeFormat(locale === 'mk' ? 'mk-MK' : 'en-GB', {
        dateStyle: 'medium',
        timeZone: 'Europe/Skopje',
      }).format(date)
    : '—';
}

function formatMinute(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

function parseMinute(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function TrainerClients({ detail, reviewMode = false }: { detail?: string; reviewMode?: boolean }): JSX.Element {
  const t = useTranslations('roleWorkspace');
  const locale = useLocale();
  const { notice, setNotice, run, pending } = useTrainerNotice();
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [profile, setProfile] = useState<z.infer<typeof profileSchema> | null>(null);
  const [workouts, setWorkouts] = useState<z.infer<typeof workoutSchema>[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planJson, setPlanJson] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      if (detail) {
        const [client, progress, clientPlans] = await Promise.all([
          apiGet(`/trainers/me/clients/${detail}`, profileSchema),
          apiGet(`/trainers/me/clients/${detail}/workouts?page=1&pageSize=100`, workoutsResponseSchema),
          apiGet(`/nutrition/clients/${detail}/plans?page=1&pageSize=50`, plansResponseSchema),
        ]);
        setProfile(client);
        setWorkouts(progress.data);
        setPlans(clientPlans.data);
        const firstPlan = clientPlans.data[0];
        setSelectedPlanId(firstPlan?.id ?? '');
        setPlanJson(firstPlan ? JSON.stringify(firstPlan.planJson, null, 2) : '');
      } else {
        const result = await apiGet('/trainers/me/clients?page=1&pageSize=100', clientsResponseSchema);
        setClients(result.data);
      }
    } catch (error) {
      console.error('Unable to load trainer clients.', error instanceof ApiError ? error.status : 'invalid response or network error');
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [detail]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return clients.filter((client) =>
      !needle || `${client.name ?? ''} ${client.email}`.toLocaleLowerCase().includes(needle),
    );
  }, [clients, query]);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const chart = useMemo(() => {
    const totals = new Map<string, number>();
    for (const workout of workouts) {
      const amount = workout.sets.reduce((sum, set) => sum + set.reps * set.weightKg, 0);
      totals.set(workout.exercise.nameEn, (totals.get(workout.exercise.nameEn) ?? 0) + amount);
    }
    return [...totals].slice(0, 8);
  }, [workouts]);
  const maxVolume = Math.max(1, ...chart.map(([, volume]) => volume));

  async function savePlan(approve: boolean): Promise<void> {
    if (!selectedPlan || !detail) return;
    try {
      const parsed: unknown = JSON.parse(planJson);
      const result = nutritionPlanSchema.safeParse(parsed);
      if (!result.success) {
        setNotice({ kind: 'error', message: t('validationError') });
        return;
      }
      const saved = await run(
        () => apiPatchParsed(
          `/nutrition/clients/${detail}/plans/${selectedPlan.id}`,
          { plan: result.data },
          planSchema,
        ),
        t('planSaved'),
      );
      if (saved && approve) {
        const approved = await run(
          () => apiPostParsed(`/nutrition/clients/${detail}/plans/${selectedPlan.id}/approve`, {}, planSchema),
          t('planApproved'),
        );
        if (approved) await load();
      } else if (saved) {
        await load();
      }
    } catch {
      setNotice({ kind: 'error', message: t('validationError') });
    }
  }

  if (loading) return <WorkspaceLoading />;
  if (failed) {
    return (
      <section className="space-y-4">
        <WorkspaceFeedback notice={{ kind: 'error', message: t('loadError') }} onDismiss={() => setNotice(null)} />
        <Button onClick={() => void load()} variant="outline">{t('retry')}</Button>
      </section>
    );
  }
  if (!detail) {
    const columns: TableColumn<Client>[] = [
      { key: 'email', label: t('email'), render: (client) => <span className="break-all">{client.email}</span> },
      { key: 'assigned', label: t('assignedAt'), render: (client) => client.assignedAt ? dateOnly(client.assignedAt, locale) : '—' },
      {
        key: 'details',
        label: t('details'),
        render: (client) => <Link className="inline-flex min-h-11 items-center text-brand-lime underline-offset-4 hover:underline" href={reviewMode ? `/trainer/nutrition/${client.id}` : `/trainer/clients/${client.id}`}>{reviewMode ? t('review') : t('view')}</Link>,
      },
    ];
    return (
      <div className="space-y-5">
        <WorkspaceFeedback notice={notice} onDismiss={() => setNotice(null)} />
        <label className="block max-w-lg">
          <span className="mb-2 block text-sm font-medium text-foreground">{t('searchClients')}</span>
          <Input onChange={(event) => setQuery(event.target.value)} placeholder={t('search')} value={query} />
        </label>
        <ResponsiveTable
          columns={columns}
          emptyDescription={t('noClientsCopy')}
          emptyTitle={t('noClients')}
          label={t('clients')}
          rows={filtered}
          title={(client) => client.name ?? client.email}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <WorkspaceFeedback notice={notice} onDismiss={() => setNotice(null)} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{profile?.profile?.name ?? profile?.email}</h2>
          <p className="mt-1 break-all text-sm text-muted">{profile?.email}</p>
        </div>
        <Link className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm text-foreground" href="/trainer/clients">{t('backToClients')}</Link>
      </div>
      {profile?.profile && (
        <Card className="grid gap-3 p-5 sm:grid-cols-2">
          <p><span className="text-muted">{t('phone')}: </span>{profile.profile.phone || '—'}</p>
          <p><span className="text-muted">{t('birthDate')}: </span>{dateOnly(profile.profile.birthDate, locale)}</p>
          <p><span className="text-muted">{t('gender')}: </span>{profile.profile.gender || '—'}</p>
          <p><span className="text-muted">{t('heightWeight')}: </span>{profile.profile.heightCm ?? '—'} cm / {profile.profile.weightKg ?? '—'} kg</p>
        </Card>
      )}
      <Card className="p-5">
        <h3 className="font-semibold text-foreground">{t('workoutProgress')}</h3>
        {chart.length ? (
          <div className="mt-5 space-y-3">
            {chart.map(([name, volume]) => (
              <div className="grid gap-2 sm:grid-cols-[minmax(8rem,12rem)_1fr_auto] sm:items-center" key={name}>
                <span className="break-words text-sm text-muted">{name}</span>
                <div aria-label={`${name}: ${Math.round(volume)} kg`} className="h-3 overflow-hidden rounded-full bg-raised" role="img">
                  <span className="block h-full rounded-full bg-brand-lime" style={{ width: `${Math.max(2, volume / maxVolume * 100)}%` }} />
                </div>
                <span className="text-sm text-foreground">{Math.round(volume)} kg</span>
              </div>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-muted">{t('noWorkouts')}</p>}
      </Card>
      <ResponsiveTable
        columns={[
          { key: 'machine', label: t('machine'), render: (workout) => workout.exercise.machine.nameEn },
          { key: 'date', label: t('date'), render: (workout) => formatDate(workout.performedAt, locale) },
          { key: 'sets', label: t('sets'), render: (workout) => workout.sets.length },
        ]}
        emptyDescription={t('noWorkouts')}
        emptyTitle={t('noWorkoutHistory')}
        label={t('workoutHistory')}
        rows={workouts}
        title={(workout) => workout.exercise.nameEn}
      />
      <Card className="space-y-4 p-5">
        <h3 className="font-semibold text-foreground">{t('nutritionReview')}</h3>
        {plans.length === 0 ? <p className="text-sm text-muted">{t('noNutritionPlans')}</p> : (
          <>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">{t('nutritionPlan')}</span>
              <select
                className="h-12 w-full rounded-xl border border-line bg-canvas px-4 text-sm text-foreground"
                disabled={pending}
                onChange={(event) => {
                  const next = plans.find((plan) => plan.id === event.target.value);
                  setSelectedPlanId(event.target.value);
                  setPlanJson(next ? JSON.stringify(next.planJson, null, 2) : '');
                }}
                value={selectedPlanId}
              >
                {plans.map((plan) => <option key={plan.id} value={plan.id}>{formatDate(plan.createdAt, locale)} · {plan.status}</option>)}
              </select>
            </label>
            {selectedPlan && (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-foreground">{t('planJson')}</span>
                  <textarea
                    aria-describedby="trainer-plan-help"
                    className="min-h-64 w-full rounded-xl border border-line bg-canvas p-4 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
                    disabled={pending}
                    onChange={(event) => setPlanJson(event.target.value)}
                    spellCheck={false}
                    value={planJson}
                  />
                  <span className="mt-2 block text-xs text-muted" id="trainer-plan-help">{t('planJsonHelp')}</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  <Button disabled={pending} onClick={() => void savePlan(false)} type="button">{t('saveChanges')}</Button>
                  <Button disabled={pending} onClick={() => void savePlan(true)} type="button" variant="outline">{t('saveAndApprove')}</Button>
                </div>
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function TrainerAppointments(): JSX.Element {
  const t = useTranslations('roleWorkspace');
  const locale = useLocale();
  const { notice, setNotice, run, pending } = useTrainerNotice();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await apiGet('/appointments/trainer?page=1&pageSize=100', appointmentsResponseSchema);
      setAppointments(response.data);
      setNotes(Object.fromEntries(response.data.map((item) => [item.id, item.notes ?? ''])));
    } catch (error) {
      console.error('Unable to load trainer appointments.', error instanceof ApiError ? error.status : 'invalid response or network error');
      setFailed(true);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function update(appointment: Appointment, status: Appointment['status']): Promise<void> {
    if (status === 'CANCELLED' && !window.confirm(t('confirmDestructiveAction'))) return;
    const saved = await run(
      () => apiPatchParsed(`/appointments/trainer/${appointment.id}`, {
        status,
        notes: notes[appointment.id]?.trim() || null,
      }, appointmentSchema),
      t('appointmentUpdated'),
    );
    if (saved) await load();
  }

  const columns: TableColumn<Appointment>[] = [
    { key: 'date', label: t('date'), render: (item) => formatDate(item.startsAt, locale) },
    { key: 'status', label: t('status'), render: (item) => t(`appointment${item.status}`) },
    {
      key: 'notes',
      label: t('notes'),
      render: (item) => (
        <label className="block min-w-40">
          <span className="sr-only">{t('notesFor', { name: item.member.name ?? t('member') })}</span>
          <Input maxLength={2000} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} value={notes[item.id] ?? ''} />
        </label>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (item) => (
        <div className="flex min-w-56 flex-wrap gap-2">
          {item.status === 'REQUESTED' && <Button disabled={pending} onClick={() => void update(item, 'CONFIRMED')} size="sm">{t('confirm')}</Button>}
          {item.status === 'CONFIRMED' && <Button disabled={pending} onClick={() => void update(item, 'COMPLETED')} size="sm">{t('complete')}</Button>}
          {['REQUESTED', 'CONFIRMED'].includes(item.status) && <Button disabled={pending} onClick={() => void update(item, 'CANCELLED')} size="sm" variant="outline">{t('cancel')}</Button>}
        </div>
      ),
    },
  ];
  if (loading) return <WorkspaceLoading />;
  if (failed) return <div className="space-y-4"><WorkspaceFeedback notice={{ kind: 'error', message: t('loadError') }} onDismiss={() => setNotice(null)} /><Button onClick={() => void load()} variant="outline">{t('retry')}</Button></div>;
  return (
    <div className="space-y-4">
      <WorkspaceFeedback notice={notice} onDismiss={() => setNotice(null)} />
      <ResponsiveTable
        columns={columns}
        emptyDescription={t('noAppointmentsCopy')}
        emptyTitle={t('noAppointments')}
        label={t('appointments')}
        rows={appointments}
        title={(item) => item.member.name ?? t('member')}
      />
    </div>
  );
}

function TrainerAvailability(): JSX.Element {
  const t = useTranslations('roleWorkspace');
  const { notice, setNotice, run, pending } = useTrainerNotice();
  const [slots, setSlots] = useState<z.infer<typeof availabilitySchema>>([]);
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try { setSlots(await apiGet('/trainers/me/availability', availabilitySchema)); }
    catch (error) {
      console.error('Unable to load trainer availability.', error instanceof ApiError ? error.status : 'invalid response or network error');
      setNotice({ kind: 'error', message: t('loadError') });
      setFailed(true);
    } finally { setLoading(false); }
  }, [setNotice, t]);
  useEffect(() => { void load(); }, [load]);
  const dayNames = [t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday')];
  function addSlot(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const startMinute = parseMinute(start);
    const endMinute = parseMinute(end);
    if (!Number.isInteger(weekday) || endMinute <= startMinute ||
      slots.some((slot) => slot.weekday === weekday && startMinute < slot.endsAt && endMinute > slot.startsAt)) {
      setNotice({ kind: 'error', message: t('availabilityInvalid') });
      return;
    }
    setSlots((current) => [...current, { id: `new-${Date.now()}`, weekday, startsAt: startMinute, endsAt: endMinute }]);
    setNotice(null);
  }
  async function save(): Promise<void> {
    const payload = slots.map(({ weekday: day, startsAt, endsAt }) => ({ weekday: day, startsAt, endsAt }));
    const saved = await run(() => apiPutParsed('/trainers/me/availability', { availability: payload }, availabilitySchema));
    if (saved) await load();
  }
  if (loading) return <WorkspaceLoading />;
  if (failed) return <div className="space-y-4"><WorkspaceFeedback notice={notice} onDismiss={() => setNotice(null)} /><Button onClick={() => void load()} variant="outline">{t('retry')}</Button></div>;
  return (
    <div className="space-y-5">
      <WorkspaceFeedback notice={notice} onDismiss={() => setNotice(null)} />
      <Card className="p-5">
        <h2 className="font-semibold text-foreground">{t('availabilityTitle')}</h2>
        <p className="mt-2 text-sm text-muted">{t('availabilityTimezone')}</p>
        <form className="mt-5 grid gap-3 sm:grid-cols-4" onSubmit={addSlot}>
          <label className="block">
            <span className="mb-2 block text-sm text-foreground">{t('weekday')}</span>
            <select className="h-12 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-foreground" onChange={(event) => setWeekday(Number(event.target.value))} value={weekday}>
              {dayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-foreground">{t('startTime')}</span>
            <Input onChange={(event) => setStart(event.target.value)} required type="time" value={start} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-foreground">{t('endTime')}</span>
            <Input onChange={(event) => setEnd(event.target.value)} required type="time" value={end} />
          </label>
          <div className="flex items-end"><Button className="w-full" disabled={pending} type="submit">{t('addSlot')}</Button></div>
        </form>
      </Card>
      <Card className="space-y-3 p-5">
        <h3 className="font-semibold text-foreground">{t('weeklyAvailability')}</h3>
        {slots.length ? slots
          .slice()
          .sort((a, b) => a.weekday - b.weekday || a.startsAt - b.startsAt)
          .map((slot) => (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3" key={slot.id}>
              <span className="text-sm text-foreground">{dayNames[slot.weekday]} · {formatMinute(slot.startsAt)}–{formatMinute(slot.endsAt)}</span>
              <Button disabled={pending} onClick={() => setSlots((current) => current.filter((item) => item.id !== slot.id))} size="sm" type="button" variant="outline">{t('remove')}</Button>
            </div>
          )) : <p className="text-sm text-muted">{t('noAvailability')}</p>}
        <Button disabled={pending} onClick={() => void save()} type="button">{t('saveChanges')}</Button>
      </Card>
    </div>
  );
}

function TrainerProfile(): JSX.Element {
  const t = useTranslations('roleWorkspace');
  const { user } = useAuth();
  const { notice, setNotice, run, pending } = useTrainerNotice();
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retryIndex, setRetryIndex] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    apiGet('/trainers?page=1&pageSize=100', trainerPublicSchema).then((result) => {
      const own = result.data.find((trainer) => trainer.id === user?.id);
      if (active && own) {
        setBio(own.bio ?? '');
        setSpecialties(own.specialties.join(', '));
        setPhotoUrl(own.photoUrl ?? '');
      } else if (active) {
        console.error('Unable to locate the current trainer profile.');
        setNotice({ kind: 'error', message: t('recordNotFound') });
        setFailed(true);
      }
    }).catch((error: unknown) => {
      console.error('Unable to load trainer profile.', error instanceof ApiError ? error.status : 'invalid response or network error');
      if (active) {
        setNotice({ kind: 'error', message: t('loadError') });
        setFailed(true);
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retryIndex, setNotice, t, user?.id]);
  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const specialtiesList = specialties.split(',').map((value) => value.trim()).filter(Boolean);
    if (photoUrl && !z.string().url().safeParse(photoUrl).success) {
      setNotice({ kind: 'error', message: t('validationError') });
      return;
    }
    await run(() => apiPutParsed('/trainers/me/profile', {
      bio: bio.trim() || null,
      specialties: specialtiesList,
      photoUrl: photoUrl.trim() || null,
    }, ownTrainerProfileSchema));
  }
  if (loading) return <WorkspaceLoading />;
  if (failed) return <div className="space-y-4"><WorkspaceFeedback notice={notice} onDismiss={() => setNotice(null)} /><Button onClick={() => setRetryIndex((value) => value + 1)} variant="outline">{t('retry')}</Button></div>;
  return (
    <div className="space-y-4">
      <WorkspaceFeedback notice={notice} onDismiss={() => setNotice(null)} />
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-foreground">{t('trainerProfile')}</h2>
        <form className="mt-5 space-y-4" onSubmit={(event) => void save(event)}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">{t('bio')}</span>
            <textarea className="min-h-32 w-full rounded-xl border border-line bg-canvas p-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime" maxLength={2000} onChange={(event) => setBio(event.target.value)} value={bio} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">{t('specialties')}</span>
            <Input onChange={(event) => setSpecialties(event.target.value)} placeholder={t('specialtiesHelp')} value={specialties} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">{t('photoUrl')}</span>
            <Input onChange={(event) => setPhotoUrl(event.target.value)} type="url" value={photoUrl} />
          </label>
          <Button disabled={pending} type="submit">{t('saveChanges')}</Button>
        </form>
      </Card>
    </div>
  );
}

export function TrainerWorkspace({ section, detail }: { section: string; detail?: string }): JSX.Element {
  const t = useTranslations('roleWorkspace');
  if (section === 'clients') return <TrainerClients detail={detail} />;
  if (section === 'appointments') return <TrainerAppointments />;
  if (section === 'availability') return <TrainerAvailability />;
  if (section === 'nutrition') return <TrainerClients detail={detail} reviewMode />;
  if (section === 'profile') return <TrainerProfile />;
  return <p className="text-sm text-muted">{t('notFound')}</p>;
}
