'use client';

import { createAccountSchema } from '@ironpulse/shared';
import { useLocale, useTranslations } from 'next-intl';
import { FormEvent, ReactNode, useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import {
  ApiError,
  apiDeleteParsed,
  apiGet,
  apiPatchParsed,
  apiPostParsed,
  apiPutParsed,
} from '@/lib/api-client';
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

const page = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    pagination: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }).passthrough(),
  }).passthrough();
const idSchema = z.object({ id: z.string() }).passthrough();
const userSchema = z.object({
  id: z.string(), email: z.string().email(), role: z.string(), status: z.string(),
  createdAt: z.coerce.date(), profile: z.object({ name: z.string().nullable() }).nullable(),
});
const paymentSchema = z.object({
  id: z.string(), status: z.string(), createdAt: z.coerce.date(),
  plan: z.object({ name: z.string(), priceMkd: z.number() }),
  user: z.object({ id: z.string(), email: z.string(), profile: z.object({ name: z.string().nullable() }).nullable() }).nullable(),
});
const planSchema = z.object({
  id: z.string(), name: z.string(), durationMonths: z.number(), priceMkd: z.number(), isActive: z.boolean(),
});
const muscleSchema = z.object({ muscleGroup: z.string(), primary: z.boolean() });
const machineSchema = z.object({
  id: z.string(), slug: z.string(), nameMk: z.string(), nameEn: z.string(), category: z.string(),
  descriptionMk: z.string().nullable().optional(), descriptionEn: z.string().nullable().optional(),
  difficulty: z.number(), animationKey: z.string().nullable(), imageUrl: z.string().nullable(),
  isPublic: z.boolean(), muscles: z.array(muscleSchema),
});
const exerciseSchema = z.object({
  id: z.string(), machineId: z.string(), nameMk: z.string(), nameEn: z.string(),
  stepsMk: z.unknown().nullable().optional(), stepsEn: z.unknown().nullable().optional(),
  commonMistakesMk: z.unknown().nullable().optional(), commonMistakesEn: z.unknown().nullable().optional(),
  safetyTipsMk: z.unknown().nullable().optional(), safetyTipsEn: z.unknown().nullable().optional(),
  recommendedSets: z.number().nullable(), recommendedReps: z.number().nullable(),
  videoId: z.string().nullable(), level: z.string(), machine: z.object({ slug: z.string(), nameEn: z.string() }).optional(),
});
const ruleSchema = z.object({
  id: z.string(), orderIndex: z.number(), titleMk: z.string(), titleEn: z.string(),
  bodyMk: z.string(), bodyEn: z.string(), icon: z.string().nullable(),
});
const trialSchema = z.object({
  id: z.string(), name: z.string(), email: z.string().email(), phone: z.string().nullable(),
  preferredDate: z.coerce.date().nullable(), status: z.enum(['NEW', 'CONTACTED', 'CONVERTED']),
  createdAt: z.coerce.date(),
});
const sponsorSchema = z.object({
  id: z.string(), userId: z.string().nullable(), companyName: z.string(), logoUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(), tier: z.string(), isActive: z.boolean(),
  user: z.object({ id: z.string(), email: z.string(), status: z.string(), profile: z.object({ name: z.string().nullable() }).nullable() }).nullable(),
  offers: z.array(z.object({ id: z.string(), title: z.string(), isActive: z.boolean() })).optional(),
});
const auditSchema = z.object({
  id: z.string(), action: z.string(), entity: z.string(), entityId: z.string().nullable(),
  createdAt: z.coerce.date(), actor: z.object({ id: z.string(), profile: z.object({ name: z.string().nullable() }).nullable() }).nullable(),
});
const settingsSchema = z.array(z.object({ key: z.string(), value: z.string() }));
const dashboardSchema = z.object({
  members: z.number(), activeMemberships: z.number(), monthlyRevenueMkd: z.number(), pendingPayments: z.number(),
  newMembersPerMonth: z.array(z.object({ month: z.string(), count: z.number() })),
  revenuePerMonth: z.array(z.object({ month: z.string(), amountMkd: z.number() })),
  popularMachines: z.array(z.object({ slug: z.string(), name: z.string(), workouts: z.number() })),
});
const userPageSchema = page(userSchema);
const paymentPageSchema = page(paymentSchema);
const planPageSchema = page(planSchema);
const machinePageSchema = page(machineSchema);
const exercisePageSchema = page(exerciseSchema);
const rulePageSchema = page(ruleSchema);
const trialPageSchema = page(trialSchema);
const sponsorPageSchema = page(sponsorSchema);
const auditPageSchema = page(auditSchema);

type User = z.infer<typeof userSchema>;
type Plan = z.infer<typeof planSchema>;
type Machine = z.infer<typeof machineSchema>;
type Exercise = z.infer<typeof exerciseSchema>;
type Rule = z.infer<typeof ruleSchema>;
type Trial = z.infer<typeof trialSchema>;
type Sponsor = z.infer<typeof sponsorSchema>;
type Audit = z.infer<typeof auditSchema>;

function useAdminNotice() {
  return useWorkspaceAction('Admin');
}

function formatDate(date: Date | null, locale: string): string {
  return date ? new Intl.DateTimeFormat(locale === 'mk' ? 'mk-MK' : 'en-GB', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Skopje',
  }).format(date) : '—';
}

function Pager({ pageIndex, total, pageSize, onChange }: {
  pageIndex: number; total: number; pageSize: number; onChange: (page: number) => void;
}): JSX.Element {
  const t = useTranslations('roleWorkspace');
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div aria-label={t('pagination')} className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-muted">{t('pageOf', { page: pageIndex, total: pages })}</span>
      <div className="flex gap-2">
        <Button disabled={pageIndex <= 1} onClick={() => onChange(pageIndex - 1)} size="sm" variant="outline">{t('previous')}</Button>
        <Button disabled={pageIndex >= pages} onClick={() => onChange(pageIndex + 1)} size="sm" variant="outline">{t('next')}</Button>
      </div>
    </div>
  );
}

function AdminUsers(): JSX.Element {
  const t = useTranslations('roleWorkspace');
  const locale = useLocale();
  const { user: currentUser } = useAuth();
  const { notice, setNotice, run, pending } = useAdminNotice();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [newRole, setNewRole] = useState<'TRAINER' | 'SPONSOR'>('TRAINER');
  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    const params = new URLSearchParams({ page: String(pageNumber), pageSize: '20' });
    if (searchTerm) params.set('search', searchTerm);
    if (role) params.set('role', role);
    if (status) params.set('status', status);
    try {
      const response = await apiGet(`/admin/users?${params.toString()}`, userPageSchema);
      setUsers(response.data); setTotal(response.pagination.total);
    } catch (error) {
      console.error('Unable to load admin users.', error instanceof ApiError ? error.status : 'invalid response or network error');
      setFailed(true);
    } finally { setLoading(false); }
  }, [pageNumber, role, searchTerm, status]);
  useEffect(() => { void load(); }, [load]);
  async function createAccount(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const input = { email: email.trim(), name: name.trim(), role: newRole };
    const parsed = createAccountSchema.safeParse(input);
    if (!parsed.success) { setNotice({ kind: 'error', message: t('validationError') }); return; }
    const ok = await run(() => apiPostParsed('/admin/accounts', parsed.data, z.object({ message: z.string() })), t('invitationSent'));
    if (ok) { setEmail(''); setName(''); await load(); }
  }
  async function changeStatus(target: User): Promise<void> {
    const next = target.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    if (next === 'SUSPENDED' && !window.confirm(t('confirmDestructiveAction'))) return;
    const ok = await run(
      () => apiPatchParsed(`/admin/users/${target.id}/status`, { status: next }, z.object({ id: z.string(), status: z.string() })),
      t(next === 'ACTIVE' ? 'accountActivated' : 'accountSuspended'),
    );
    if (ok) await load();
  }
  const columns: TableColumn<User>[] = [
    { key: 'email', label: t('email'), render: (item) => <span className="break-all">{item.email}</span> },
    { key: 'userId', label: t('userId'), render: (item) => <code className="break-all text-xs">{item.id}</code> },
    { key: 'role', label: t('role'), render: (item) => item.role },
    { key: 'status', label: t('status'), render: (item) => t(`status${item.status}`) },
    { key: 'createdAt', label: t('createdAt'), render: (item) => formatDate(item.createdAt, locale) },
    { key: 'actions', label: t('actions'), render: (item) => ['ACTIVE', 'SUSPENDED'].includes(item.status) ? (
      <Button disabled={pending || item.id === currentUser?.id} onClick={() => void changeStatus(item)} size="sm" variant="outline">
        {t(item.status === 'SUSPENDED' ? 'activate' : 'suspend')}
      </Button>
    ) : <span>{t('noStatusAction')}</span> },
  ];
  return (
    <div className="space-y-5">
      <WorkspaceFeedback notice={notice} onDismiss={() => setNotice(null)} />
      <Card className="p-5">
        <h2 className="font-semibold text-foreground">{t('createPrivilegedAccount')}</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" onSubmit={(event) => void createAccount(event)}>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('name')}</span><Input autoComplete="name" maxLength={120} onChange={(event) => setName(event.target.value)} required value={name} /></label>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('email')}</span><Input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('role')}</span><select className="h-12 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-foreground" onChange={(event) => setNewRole(event.target.value as 'TRAINER' | 'SPONSOR')} value={newRole}><option value="TRAINER">{t('trainerRole')}</option><option value="SPONSOR">{t('sponsorRole')}</option></select></label>
          <div className="flex items-end"><Button className="w-full" disabled={pending} type="submit">{t('sendInvitation')}</Button></div>
        </form>
        <p className="mt-3 text-xs text-muted">{t('invitationDescription')}</p>
      </Card>
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold text-foreground">{t('users')}</h2>
        <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" onSubmit={(event) => { event.preventDefault(); setPageNumber(1); setSearchTerm(search.trim()); }}>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('search')}</span><Input onChange={(event) => setSearch(event.target.value)} value={search} /></label>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('role')}</span><select className="h-12 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-foreground" onChange={(event) => { setRole(event.target.value); setPageNumber(1); }} value={role}><option value="">{t('allRoles')}</option>{['MEMBER', 'TRAINER', 'ADMIN', 'SPONSOR'].map((value) => <option key={value} value={value}>{t(`role${value}`)}</option>)}</select></label>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('status')}</span><select className="h-12 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-foreground" onChange={(event) => { setStatus(event.target.value); setPageNumber(1); }} value={status}><option value="">{t('allStatuses')}</option>{['ACTIVE', 'SUSPENDED', 'PENDING', 'DELETED'].map((value) => <option key={value} value={value}>{t(`status${value}`)}</option>)}</select></label>
          <div className="flex items-end"><Button className="w-full" disabled={loading} type="submit">{t('applyFilters')}</Button></div>
        </form>
        {loading ? <WorkspaceLoading /> : failed ? <div className="space-y-3"><p className="text-sm text-muted">{t('loadError')}</p><Button onClick={() => void load()} variant="outline">{t('retry')}</Button></div> : (
          <>
            <ResponsiveTable columns={columns} emptyDescription={t('noUsersCopy')} emptyTitle={t('noUsers')} label={t('users')} rows={users} title={(item) => item.profile?.name ?? item.email} />
            <Pager onChange={setPageNumber} pageIndex={pageNumber} pageSize={20} total={total} />
          </>
        )}
      </Card>
    </div>
  );
}

function AdminMemberships(): JSX.Element {
  const t = useTranslations('roleWorkspace');
  const locale = useLocale();
  const { notice, setNotice, run, pending } = useAdminNotice();
  const [mode, setMode] = useState<'payments' | 'plans'>('payments');
  const [payments, setPayments] = useState<z.infer<typeof paymentSchema>[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMonths, setNewMonths] = useState('1');
  const [newPrice, setNewPrice] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      if (mode === 'payments') {
        setPayments((await apiGet('/memberships/admin/pending?page=1&pageSize=100', paymentPageSchema)).data);
      } else {
        setPlans((await apiGet('/memberships/admin/plans?page=1&pageSize=100', planPageSchema)).data);
      }
    } catch (error) {
      console.error('Unable to load admin memberships.', error instanceof ApiError ? error.status : 'invalid response or network error');
      setFailed(true);
    } finally { setLoading(false); }
  }, [mode]);
  useEffect(() => { void load(); }, [load]);
  async function paymentAction(id: string, action: 'confirm' | 'cancel'): Promise<void> {
    if (action === 'cancel' && !window.confirm(t('confirmDestructiveAction'))) return;
    const ok = await run(() => apiPostParsed(`/memberships/admin/${id}/${action}`, {}, idSchema), t(action === 'confirm' ? 'paymentConfirmed' : 'paymentRejected'));
    if (ok) await load();
  }
  async function createPlan(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const months = Number(newMonths); const priceMkd = Number(newPrice);
    if (!newName.trim() || !Number.isInteger(months) || months < 1 || !Number.isInteger(priceMkd) || priceMkd < 0) {
      setNotice({ kind: 'error', message: t('validationError') }); return;
    }
    const ok = await run(() => apiPostParsed('/memberships/admin/plans', { name: newName.trim(), durationMonths: months, priceMkd, isActive: true }, planSchema));
    if (ok) { setNewName(''); setNewPrice(''); await load(); }
  }
  async function updatePlan(plan: Plan, changes: Partial<Plan>): Promise<void> {
    const ok = await run(() => apiPatchParsed(`/memberships/admin/plans/${plan.id}`, changes, planSchema));
    if (ok) await load();
  }
  const paymentColumns: TableColumn<z.infer<typeof paymentSchema>>[] = [
    { key: 'email', label: t('member'), render: (item) => <span className="break-all">{item.user?.profile?.name ?? item.user?.email ?? '—'}</span> },
    { key: 'plan', label: t('plan'), render: (item) => `${item.plan.name} · ${item.plan.priceMkd} MKD` },
    { key: 'requested', label: t('requestedAt'), render: (item) => formatDate(item.createdAt, locale) },
    { key: 'actions', label: t('actions'), render: (item) => <div className="flex flex-wrap gap-2"><Button disabled={pending} onClick={() => void paymentAction(item.id, 'confirm')} size="sm">{t('confirm')}</Button><Button disabled={pending} onClick={() => void paymentAction(item.id, 'cancel')} size="sm" variant="outline">{t('reject')}</Button></div> },
  ];
  const planColumns: TableColumn<Plan>[] = [
    { key: 'name', label: t('plan'), render: (item) => <Input aria-label={t('planName')} defaultValue={item.name} disabled={pending} key={`${item.id}-name`} onBlur={(event) => { if (event.target.value !== item.name) void updatePlan(item, { name: event.target.value }); }} /> },
    { key: 'duration', label: t('durationMonths'), render: (item) => <Input aria-label={t('durationMonths')} defaultValue={String(item.durationMonths)} disabled={pending} key={`${item.id}-duration`} min={1} onBlur={(event) => { const value = Number(event.target.value); if (value !== item.durationMonths) void updatePlan(item, { durationMonths: value }); }} type="number" /> },
    { key: 'price', label: t('priceMkd'), render: (item) => <Input aria-label={t('priceMkd')} defaultValue={String(item.priceMkd)} disabled={pending} key={`${item.id}-price`} min={0} onBlur={(event) => { const value = Number(event.target.value); if (value !== item.priceMkd) void updatePlan(item, { priceMkd: value }); }} type="number" /> },
    { key: 'active', label: t('status'), render: (item) => item.isActive ? t('active') : t('inactive') },
    { key: 'actions', label: t('actions'), render: (item) => <Button disabled={pending} onClick={() => void updatePlan(item, { isActive: !item.isActive })} size="sm" variant="outline">{t(item.isActive ? 'deactivate' : 'activate')}</Button> },
  ];
  return (
    <div className="space-y-4">
      <WorkspaceFeedback notice={notice} onDismiss={() => setNotice(null)} />
      <div aria-label={t('membershipManagement')} className="flex flex-wrap gap-2" role="group">
        <Button aria-pressed={mode === 'payments'} disabled={loading || pending} onClick={() => setMode('payments')} variant={mode === 'payments' ? 'default' : 'outline'}>{t('pendingPayments')}</Button>
        <Button aria-pressed={mode === 'plans'} disabled={loading || pending} onClick={() => setMode('plans')} variant={mode === 'plans' ? 'default' : 'outline'}>{t('membershipPlans')}</Button>
      </div>
      {loading ? <WorkspaceLoading /> : failed ? <div className="space-y-3"><p className="text-sm text-muted">{t('loadError')}</p><Button onClick={() => void load()} variant="outline">{t('retry')}</Button></div> : mode === 'payments' ? (
        <ResponsiveTable columns={paymentColumns} emptyDescription={t('noPaymentsCopy')} emptyTitle={t('noPayments')} label={t('pendingPayments')} rows={payments} title={(item) => item.user?.profile?.name ?? item.user?.email ?? t('member')} />
      ) : (
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-semibold text-foreground">{t('createPlan')}</h2>
            <form className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" onSubmit={(event) => void createPlan(event)}>
              <label className="block"><span className="mb-2 block text-sm text-foreground">{t('planName')}</span><Input onChange={(event) => setNewName(event.target.value)} required value={newName} /></label>
              <label className="block"><span className="mb-2 block text-sm text-foreground">{t('durationMonths')}</span><Input max={60} min={1} onChange={(event) => setNewMonths(event.target.value)} required type="number" value={newMonths} /></label>
              <label className="block"><span className="mb-2 block text-sm text-foreground">{t('priceMkd')}</span><Input min={0} onChange={(event) => setNewPrice(event.target.value)} required type="number" value={newPrice} /></label>
              <div className="flex items-end"><Button className="w-full" disabled={pending} type="submit">{t('create')}</Button></div>
            </form>
          </Card>
          <ResponsiveTable columns={planColumns} emptyDescription={t('noPlansCopy')} emptyTitle={t('noPlans')} label={t('membershipPlans')} rows={plans} title={(item) => item.name} />
        </div>
      )}
    </div>
  );
}

const categories = ['LEGS', 'CHEST', 'BACK', 'SHOULDERS', 'ARMS', 'CORE', 'CARDIO'] as const;
const levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;

function AdminMachines({ exercisesOnly = false }: { exercisesOnly?: boolean }): JSX.Element {
  const t = useTranslations('roleWorkspace');
  const { notice, setNotice, run, pending } = useAdminNotice();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [slug, setSlug] = useState('');
  const [nameMk, setNameMk] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('LEGS');
  const [difficulty, setDifficulty] = useState('1');
  const [animationKey, setAnimationKey] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [descriptionMk, setDescriptionMk] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [musclesJson, setMusclesJson] = useState('[]');
  const [machineId, setMachineId] = useState('');
  const [exerciseNameMk, setExerciseNameMk] = useState('');
  const [exerciseNameEn, setExerciseNameEn] = useState('');
  const [stepsMk, setStepsMk] = useState('');
  const [stepsEn, setStepsEn] = useState('');
  const [mistakesMk, setMistakesMk] = useState('');
  const [mistakesEn, setMistakesEn] = useState('');
  const [safetyMk, setSafetyMk] = useState('');
  const [safetyEn, setSafetyEn] = useState('');
  const [videoId, setVideoId] = useState('');
  const [level, setLevel] = useState<(typeof levels)[number]>('BEGINNER');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const [machineList, exerciseList] = await Promise.all([
        apiGet('/machines/admin?page=1&pageSize=100', machinePageSchema),
        apiGet('/exercises/admin?page=1&pageSize=100', exercisePageSchema),
      ]);
      setMachines(machineList.data); setExercises(exerciseList.data);
      setMachineId((current) => current || machineList.data[0]?.id || '');
    } catch (error) {
      console.error('Unable to load admin machine library.', error instanceof ApiError ? error.status : 'invalid response or network error');
      setFailed(true);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  function selectMachine(item: Machine): void {
    setSelectedMachine(item); setSlug(item.slug); setNameMk(item.nameMk); setNameEn(item.nameEn);
    setCategory(item.category as (typeof categories)[number]); setDifficulty(String(item.difficulty));
    setAnimationKey(item.animationKey ?? ''); setImageUrl(item.imageUrl ?? '');
    setDescriptionMk(item.descriptionMk ?? ''); setDescriptionEn(item.descriptionEn ?? '');
    setMusclesJson(JSON.stringify(item.muscles, null, 2));
  }
  function selectExercise(item: Exercise): void {
    setSelectedExercise(item); setMachineId(item.machineId); setExerciseNameMk(item.nameMk); setExerciseNameEn(item.nameEn);
    const lines = (value: unknown): string => Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string').join('\n') : '';
    setStepsMk(lines(item.stepsMk)); setStepsEn(lines(item.stepsEn)); setMistakesMk(lines(item.commonMistakesMk));
    setMistakesEn(lines(item.commonMistakesEn)); setSafetyMk(lines(item.safetyTipsMk)); setSafetyEn(lines(item.safetyTipsEn));
    setVideoId(item.videoId ?? ''); setLevel(item.level as (typeof levels)[number]);
    setSets(item.recommendedSets ? String(item.recommendedSets) : '');
    setReps(item.recommendedReps ? String(item.recommendedReps) : '');
  }
  async function saveMachine(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    let muscles: unknown;
    try { muscles = JSON.parse(musclesJson); }
    catch { setNotice({ kind: 'error', message: t('validationError') }); return; }
    const input = {
      slug: slug.trim(), nameMk: nameMk.trim(), nameEn: nameEn.trim(), category, difficulty: Number(difficulty),
      animationKey: animationKey.trim() || undefined, imageUrl: imageUrl.trim() || undefined,
      descriptionMk: descriptionMk.trim(), descriptionEn: descriptionEn.trim(), isPublic: true, muscles,
    };
    const ok = await run(
      () => selectedMachine
        ? apiPatchParsed(`/machines/admin/${selectedMachine.id}`, input, machineSchema)
        : apiPostParsed('/machines/admin', input, machineSchema),
      t(selectedMachine ? 'machineUpdated' : 'machineCreated'),
    );
    if (ok) { setSelectedMachine(null); await load(); }
  }
  async function hideMachine(item: Machine): Promise<void> {
    if (!window.confirm(t('confirmDestructiveAction'))) return;
    const ok = await run(() => apiDeleteParsed(`/machines/admin/${item.id}`, {}, idSchema), t('machineHidden'));
    if (ok) await load();
  }
  async function saveExercise(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!videoId.trim() || !/^[a-zA-Z0-9_-]{11}$/.test(videoId.trim())) {
      setNotice({ kind: 'error', message: t('videoIdInvalid') }); return;
    }
    const lines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);
    const input = {
      machineId, nameMk: exerciseNameMk.trim(), nameEn: exerciseNameEn.trim(),
      stepsMk: lines(stepsMk), stepsEn: lines(stepsEn),
      commonMistakesMk: lines(mistakesMk), commonMistakesEn: lines(mistakesEn),
      safetyTipsMk: lines(safetyMk), safetyTipsEn: lines(safetyEn),
      videoId: videoId.trim(), level,
      ...(sets ? { recommendedSets: Number(sets) } : {}),
      ...(reps ? { recommendedReps: Number(reps) } : {}),
    };
    const ok = await run(
      () => selectedExercise
        ? apiPatchParsed(`/exercises/admin/${selectedExercise.id}`, input, exerciseSchema)
        : apiPostParsed('/exercises/admin', input, exerciseSchema),
      t(selectedExercise ? 'exerciseUpdated' : 'exerciseCreated'),
    );
    if (ok) { setSelectedExercise(null); await load(); }
  }
  async function deleteExercise(item: Exercise): Promise<void> {
    if (!window.confirm(t('confirmDestructiveAction'))) return;
    const ok = await run(() => apiDeleteParsed(`/exercises/admin/${item.id}`, {}, idSchema), t('exerciseDeleted'));
    if (ok) await load();
  }
  const machineColumns: TableColumn<Machine>[] = [
    { key: 'category', label: t('category'), render: (item) => item.category },
    { key: 'slug', label: t('slug'), render: (item) => item.slug },
    { key: 'animation', label: t('animationKey'), render: (item) => item.animationKey ?? '—' },
    { key: 'actions', label: t('actions'), render: (item) => <div className="flex flex-wrap gap-2"><Button disabled={pending} onClick={() => selectMachine(item)} size="sm" variant="outline">{t('edit')}</Button>{item.isPublic && <Button disabled={pending} onClick={() => void hideMachine(item)} size="sm" variant="outline">{t('hide')}</Button>}</div> },
  ];
  const exerciseColumns: TableColumn<Exercise>[] = [
    { key: 'machine', label: t('machine'), render: (item) => item.machine?.nameEn ?? machines.find((machine) => machine.id === item.machineId)?.nameEn ?? '—' },
    { key: 'video', label: t('youtubeVideoId'), render: (item) => item.videoId ?? '—' },
    { key: 'level', label: t('level'), render: (item) => item.level },
    { key: 'actions', label: t('actions'), render: (item) => <div className="flex flex-wrap gap-2"><Button disabled={pending} onClick={() => selectExercise(item)} size="sm" variant="outline">{t('edit')}</Button><Button disabled={pending} onClick={() => void deleteExercise(item)} size="sm" variant="outline">{t('delete')}</Button></div> },
  ];
  if (loading) return <WorkspaceLoading />;
  if (failed) return <div className="space-y-3"><WorkspaceFeedback notice={{ kind: 'error', message: t('loadError') }} onDismiss={() => setNotice(null)} /><Button onClick={() => void load()} variant="outline">{t('retry')}</Button></div>;
  const field = (label: string, value: string, setValue: (value: string) => void, props: { required?: boolean; type?: string; maxLength?: number } = {}): ReactNode => (
    <label className="block" key={label}><span className="mb-2 block text-sm text-foreground">{label}</span><Input maxLength={props.maxLength} onChange={(event) => setValue(event.target.value)} required={props.required} type={props.type ?? 'text'} value={value} /></label>
  );
  const textarea = (label: string, value: string, setValue: (value: string) => void): ReactNode => (
    <label className="block" key={label}><span className="mb-2 block text-sm text-foreground">{label}</span><textarea className="min-h-24 w-full rounded-xl border border-line bg-canvas p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime" onChange={(event) => setValue(event.target.value)} value={value} /></label>
  );
  return (
    <div className="space-y-5">
      <WorkspaceFeedback notice={notice} onDismiss={() => setNotice(null)} />
      {!exercisesOnly ? (
        <>
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="font-semibold text-foreground">{t(selectedMachine ? 'editMachine' : 'createMachine')}</h2>{selectedMachine && <Button disabled={pending} onClick={() => setSelectedMachine(null)} size="sm" variant="outline">{t('newItem')}</Button>}</div>
            <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(event) => void saveMachine(event)}>
              {field(t('slug'), slug, setSlug, { required: true })}
              {field(`${t('name')} (${t('macedonian')})`, nameMk, setNameMk, { required: true })}
              {field(`${t('name')} (English)`, nameEn, setNameEn, { required: true })}
              <label className="block"><span className="mb-2 block text-sm text-foreground">{t('category')}</span><select className="h-12 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-foreground" onChange={(event) => setCategory(event.target.value as (typeof categories)[number])} value={category}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
              {field(t('difficulty'), difficulty, setDifficulty, { required: true, type: 'number' })}
              {field(t('animationKey'), animationKey, setAnimationKey)}
              {field(t('imageUrl'), imageUrl, setImageUrl, { type: 'url' })}
              {textarea(t('descriptionMk'), descriptionMk, setDescriptionMk)}
              {textarea(t('descriptionEn'), descriptionEn, setDescriptionEn)}
              {textarea(t('musclesJson'), musclesJson, setMusclesJson)}
              <div className="flex items-end"><Button disabled={pending} type="submit">{t(selectedMachine ? 'saveChanges' : 'create')}</Button></div>
            </form>
          </Card>
          <ResponsiveTable columns={machineColumns} emptyDescription={t('noMachinesCopy')} emptyTitle={t('noMachines')} label={t('machines')} rows={machines} title={(item) => `${item.nameEn} / ${item.nameMk}`} />
        </>
      ) : (
        <>
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="font-semibold text-foreground">{t(selectedExercise ? 'editExercise' : 'createExercise')}</h2>{selectedExercise && <Button disabled={pending} onClick={() => setSelectedExercise(null)} size="sm" variant="outline">{t('newItem')}</Button>}</div>
            <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(event) => void saveExercise(event)}>
              <label className="block"><span className="mb-2 block text-sm text-foreground">{t('machine')}</span><select className="h-12 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-foreground" onChange={(event) => setMachineId(event.target.value)} required value={machineId}>{machines.map((item) => <option key={item.id} value={item.id}>{item.nameEn}</option>)}</select></label>
              {field(`${t('name')} (${t('macedonian')})`, exerciseNameMk, setExerciseNameMk, { required: true })}
              {field(`${t('name')} (English)`, exerciseNameEn, setExerciseNameEn, { required: true })}
              {field(t('youtubeVideoId'), videoId, setVideoId, { required: true })}
              {field(t('recommendedSets'), sets, setSets, { type: 'number' })}
              {field(t('recommendedReps'), reps, setReps, { type: 'number' })}
              <label className="block"><span className="mb-2 block text-sm text-foreground">{t('level')}</span><select className="h-12 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-foreground" onChange={(event) => setLevel(event.target.value as (typeof levels)[number])} value={level}>{levels.map((item) => <option key={item}>{item}</option>)}</select></label>
              {textarea(t('stepsMk'), stepsMk, setStepsMk)}
              {textarea(t('stepsEn'), stepsEn, setStepsEn)}
              {textarea(t('mistakesMk'), mistakesMk, setMistakesMk)}
              {textarea(t('mistakesEn'), mistakesEn, setMistakesEn)}
              {textarea(t('safetyMk'), safetyMk, setSafetyMk)}
              {textarea(t('safetyEn'), safetyEn, setSafetyEn)}
              <div className="flex items-end"><Button disabled={pending} type="submit">{t(selectedExercise ? 'saveChanges' : 'create')}</Button></div>
            </form>
          </Card>
          <ResponsiveTable columns={exerciseColumns} emptyDescription={t('noExercisesCopy')} emptyTitle={t('noExercises')} label={t('exercises')} rows={exercises} title={(item) => `${item.nameEn} / ${item.nameMk}`} />
        </>
      )}
    </div>
  );
}

function AdminContent(): JSX.Element {
  const t = useTranslations('roleWorkspace');
  const { notice, setNotice, run, pending } = useAdminNotice();
  const [rules, setRules] = useState<Rule[]>([]);
  const [settings, setSettings] = useState<z.infer<typeof settingsSchema>>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [order, setOrder] = useState('');
  const [titleMk, setTitleMk] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [bodyMk, setBodyMk] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [icon, setIcon] = useState('');
  const [settingValues, setSettingValues] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const [ruleResult, settingResult] = await Promise.all([
        apiGet('/content/admin/rules?page=1&pageSize=100', rulePageSchema),
        apiGet('/content/settings', settingsSchema),
      ]);
      setRules(ruleResult.data); setSettings(settingResult);
      setSettingValues(Object.fromEntries(settingResult.map(({ key, value }) => [key, value])));
    } catch (error) {
      console.error('Unable to load admin content.', error instanceof ApiError ? error.status : 'invalid response or network error');
      setFailed(true);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  function selectRule(rule: Rule): void {
    setEditing(rule); setOrder(String(rule.orderIndex)); setTitleMk(rule.titleMk); setTitleEn(rule.titleEn);
    setBodyMk(rule.bodyMk); setBodyEn(rule.bodyEn); setIcon(rule.icon ?? '');
  }
  async function saveRule(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const input = { orderIndex: Number(order), titleMk, titleEn, bodyMk, bodyEn, icon: icon.trim() || null };
    if (!Number.isInteger(input.orderIndex) || input.orderIndex < 0 || !titleMk.trim() || !titleEn.trim() || !bodyMk.trim() || !bodyEn.trim()) {
      setNotice({ kind: 'error', message: t('validationError') }); return;
    }
    const ok = await run(() => editing
      ? apiPatchParsed(`/content/admin/rules/${editing.id}`, input, ruleSchema)
      : apiPostParsed('/content/admin/rules', input, ruleSchema));
    if (ok) { setEditing(null); setOrder(''); setTitleMk(''); setTitleEn(''); setBodyMk(''); setBodyEn(''); setIcon(''); await load(); }
  }
  async function deleteRule(rule: Rule): Promise<void> {
    if (!window.confirm(t('confirmDestructiveAction'))) return;
    const ok = await run(() => apiDeleteParsed(`/content/admin/rules/${rule.id}`, {}, idSchema), t('ruleDeleted'));
    if (ok) await load();
  }
  async function saveSetting(key: string): Promise<void> {
    await run(() => apiPutParsed('/content/admin/settings', { key, value: settingValues[key] ?? '' }, idSchema), t('saved'));
  }
  const columns: TableColumn<Rule>[] = [
    { key: 'order', label: t('order'), render: (item) => item.orderIndex },
    { key: 'title', label: t('ruleTitle'), render: (item) => `${item.titleMk} / ${item.titleEn}` },
    { key: 'actions', label: t('actions'), render: (item) => <div className="flex flex-wrap gap-2"><Button disabled={pending} onClick={() => selectRule(item)} size="sm" variant="outline">{t('edit')}</Button><Button disabled={pending} onClick={() => void deleteRule(item)} size="sm" variant="outline">{t('delete')}</Button></div> },
  ];
  if (loading) return <WorkspaceLoading />;
  if (failed) return <div className="space-y-3"><WorkspaceFeedback notice={{ kind: 'error', message: t('loadError') }} onDismiss={() => setNotice(null)} /><Button onClick={() => void load()} variant="outline">{t('retry')}</Button></div>;
  return (
    <div className="space-y-5">
      <WorkspaceFeedback notice={notice} onDismiss={() => setNotice(null)} />
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-foreground">{t(editing ? 'editRule' : 'createRule')}</h2>{editing && <Button disabled={pending} onClick={() => setEditing(null)} size="sm" variant="outline">{t('newItem')}</Button>}</div>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(event) => void saveRule(event)}>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('order')}</span><Input min={0} onChange={(event) => setOrder(event.target.value)} required type="number" value={order} /></label>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('icon')}</span><Input onChange={(event) => setIcon(event.target.value)} value={icon} /></label>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('titleMk')}</span><Input onChange={(event) => setTitleMk(event.target.value)} required value={titleMk} /></label>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('titleEn')}</span><Input onChange={(event) => setTitleEn(event.target.value)} required value={titleEn} /></label>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('bodyMk')}</span><textarea className="min-h-28 w-full rounded-xl border border-line bg-canvas p-3 text-sm text-foreground" onChange={(event) => setBodyMk(event.target.value)} required value={bodyMk} /></label>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('bodyEn')}</span><textarea className="min-h-28 w-full rounded-xl border border-line bg-canvas p-3 text-sm text-foreground" onChange={(event) => setBodyEn(event.target.value)} required value={bodyEn} /></label>
          <div><Button disabled={pending} type="submit">{t(editing ? 'saveChanges' : 'create')}</Button></div>
        </form>
      </Card>
      <ResponsiveTable columns={columns} emptyDescription={t('noRulesCopy')} emptyTitle={t('noRules')} label={t('rules')} rows={rules} title={(item) => item.titleEn} />
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold text-foreground">{t('gymSettings')}</h2>
        {['opening_hours', 'address', 'phone', 'email'].map((key) => (
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" key={key}>
            <label className="block"><span className="mb-2 block text-sm text-foreground">{t(`setting_${key}`)}</span><Input onChange={(event) => setSettingValues((current) => ({ ...current, [key]: event.target.value }))} value={settingValues[key] ?? ''} /></label>
            <Button disabled={pending} onClick={() => void saveSetting(key)} variant="outline">{t('saveChanges')}</Button>
          </div>
        ))}
        {settings.length === 0 && <p className="text-sm text-muted">{t('settingsDefaultHint')}</p>}
      </Card>
    </div>
  );
}

function AdminTrials(): JSX.Element {
  const t = useTranslations('roleWorkspace');
  const locale = useLocale();
  const { notice, setNotice, run, pending } = useAdminNotice();
  const [items, setItems] = useState<Trial[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const query = status ? `&status=${status}` : '';
      setItems((await apiGet(`/content/admin/trial-requests?page=1&pageSize=100${query}`, trialPageSchema)).data);
    } catch (error) {
      console.error('Unable to load trial requests.', error instanceof ApiError ? error.status : 'invalid response or network error');
      setFailed(true);
    } finally { setLoading(false); }
  }, [status]);
  useEffect(() => { void load(); }, [load]);
  async function update(item: Trial, nextStatus: Trial['status']): Promise<void> {
    const ok = await run(() => apiPatchParsed(`/content/admin/trial-requests/${item.id}`, { status: nextStatus }, trialSchema));
    if (ok) await load();
  }
  const columns: TableColumn<Trial>[] = [
    { key: 'email', label: t('email'), render: (item) => <a className="break-all underline" href={`mailto:${item.email}`}>{item.email}</a> },
    { key: 'phone', label: t('phone'), render: (item) => item.phone ?? '—' },
    { key: 'preferredDate', label: t('preferredDate'), render: (item) => formatDate(item.preferredDate, locale) },
    { key: 'status', label: t('status'), render: (item) => <select aria-label={t('trialStatusFor', { name: item.name })} className="h-11 rounded-lg border border-line bg-canvas px-2 text-foreground" disabled={pending} onChange={(event) => void update(item, event.target.value as Trial['status'])} value={item.status}>{['NEW', 'CONTACTED', 'CONVERTED'].map((value) => <option key={value} value={value}>{t(`status${value}`)}</option>)}</select> },
  ];
  return (
    <div className="space-y-4">
      <WorkspaceFeedback notice={notice} onDismiss={() => setNotice(null)} />
      <label className="block max-w-xs"><span className="mb-2 block text-sm text-foreground">{t('filterStatus')}</span><select className="h-12 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-foreground" onChange={(event) => setStatus(event.target.value)} value={status}><option value="">{t('allStatuses')}</option>{['NEW', 'CONTACTED', 'CONVERTED'].map((value) => <option key={value} value={value}>{t(`status${value}`)}</option>)}</select></label>
      {loading ? <WorkspaceLoading /> : failed ? <div className="space-y-3"><p className="text-sm text-muted">{t('loadError')}</p><Button onClick={() => void load()} variant="outline">{t('retry')}</Button></div> : (
        <ResponsiveTable columns={columns} emptyDescription={t('noTrialsCopy')} emptyTitle={t('noTrials')} label={t('trialRequests')} rows={items} title={(item) => item.name} />
      )}
    </div>
  );
}

function AdminSponsors(): JSX.Element {
  const t = useTranslations('roleWorkspace');
  const { notice, setNotice, run, pending } = useAdminNotice();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [userId, setUserId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [tier, setTier] = useState('BRONZE');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try { setSponsors((await apiGet('/sponsors/admin?page=1&pageSize=100', sponsorPageSchema)).data); }
    catch (error) {
      console.error('Unable to load admin sponsors.', error instanceof ApiError ? error.status : 'invalid response or network error');
      setFailed(true);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function createProfile(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!userId.trim() || companyName.trim().length < 2 ||
      (logoUrl && !z.string().url().safeParse(logoUrl).success) ||
      (websiteUrl && !z.string().url().safeParse(websiteUrl).success)) {
      setNotice({ kind: 'error', message: t('validationError') }); return;
    }
    const ok = await run(() => apiPostParsed('/sponsors/admin', {
      userId: userId.trim(), companyName: companyName.trim(), logoUrl: logoUrl || null,
      websiteUrl: websiteUrl || null, tier,
    }, idSchema), t('sponsorCreated'));
    if (ok) { setUserId(''); setCompanyName(''); setLogoUrl(''); setWebsiteUrl(''); await load(); }
  }
  async function toggle(sponsor: Sponsor): Promise<void> {
    const ok = await run(() => apiPatchParsed(`/sponsors/admin/${sponsor.id}/status`, { isActive: !sponsor.isActive }, idSchema), t('sponsorStatusUpdated'));
    if (ok) await load();
  }
  const columns: TableColumn<Sponsor>[] = [
    { key: 'owner', label: t('account'), render: (item) => <span className="break-all">{item.user?.email ?? t('unlinkedAccount')}</span> },
    { key: 'tier', label: t('tier'), render: (item) => item.tier },
    { key: 'status', label: t('status'), render: (item) => t(item.isActive ? 'active' : 'inactive') },
    { key: 'offers', label: t('offers'), render: (item) => item.offers?.length ?? 0 },
    { key: 'actions', label: t('actions'), render: (item) => <Button disabled={pending} onClick={() => void toggle(item)} size="sm" variant="outline">{t(item.isActive ? 'deactivate' : 'activate')}</Button> },
  ];
  return (
    <div className="space-y-5">
      <WorkspaceFeedback notice={notice} onDismiss={() => setNotice(null)} />
      <Card className="p-5">
        <h2 className="font-semibold text-foreground">{t('createSponsorProfile')}</h2>
        <p className="mt-2 text-sm text-muted">{t('sponsorProfileAccountHint')}</p>
        <form className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" onSubmit={(event) => void createProfile(event)}>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('userId')}</span><Input onChange={(event) => setUserId(event.target.value)} required value={userId} /></label>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('companyName')}</span><Input maxLength={160} onChange={(event) => setCompanyName(event.target.value)} required value={companyName} /></label>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('tier')}</span><select className="h-12 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-foreground" onChange={(event) => setTier(event.target.value)} value={tier}>{['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('logoUrl')}</span><Input onChange={(event) => setLogoUrl(event.target.value)} type="url" value={logoUrl} /></label>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('websiteUrl')}</span><Input onChange={(event) => setWebsiteUrl(event.target.value)} type="url" value={websiteUrl} /></label>
          <div className="flex items-end"><Button className="w-full" disabled={pending} type="submit">{t('create')}</Button></div>
        </form>
      </Card>
      {loading ? <WorkspaceLoading /> : failed ? <div className="space-y-3"><p className="text-sm text-muted">{t('loadError')}</p><Button onClick={() => void load()} variant="outline">{t('retry')}</Button></div> : <ResponsiveTable columns={columns} emptyDescription={t('noSponsorsCopy')} emptyTitle={t('noSponsors')} label={t('sponsors')} rows={sponsors} title={(item) => item.companyName} />}
    </div>
  );
}

function AdminAnalytics(): JSX.Element {
  const t = useTranslations('roleWorkspace');
  const locale = useLocale();
  const [stats, setStats] = useState<z.infer<typeof dashboardSchema> | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setFailed(false);
    try { setStats(await apiGet('/admin/dashboard', dashboardSchema)); }
    catch (error) {
      console.error('Unable to load admin analytics.', error instanceof ApiError ? error.status : 'invalid response or network error');
      setFailed(true);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (failed) return <div className="space-y-3"><p role="alert" className="text-sm text-muted">{t('loadError')}</p><Button onClick={() => void load()} variant="outline">{t('retry')}</Button></div>;
  if (!stats) return <WorkspaceLoading />;
  const months = stats.newMembersPerMonth.map((item) => ({
    label: item.month, members: item.count,
    revenue: stats.revenuePerMonth.find((entry) => entry.month === item.month)?.amountMkd ?? 0,
  }));
  const chart = (title: string, value: (item: typeof months[number]) => number, formatter: (value: number) => string) => {
    const max = Math.max(1, ...months.map(value));
    return <Card className="p-5" key={title}><h2 className="font-semibold text-foreground">{title}</h2><ul aria-label={title} className="mt-5 space-y-3">{months.map((item) => <li className="grid gap-2 sm:grid-cols-[5rem_minmax(0,1fr)_5rem] sm:items-center" key={item.label}><span className="text-xs text-muted">{item.label}</span><span aria-label={`${item.label}: ${formatter(value(item))}`} className="h-3 overflow-hidden rounded-full bg-raised" role="img"><span className="block h-full rounded-full bg-brand-lime" style={{ width: `${Math.max(2, value(item) / max * 100)}%` }} /></span><span className="text-sm text-foreground">{formatter(value(item))}</span></li>)}</ul></Card>;
  };
  const number = (amount: number) => new Intl.NumberFormat(locale === 'mk' ? 'mk-MK' : 'en-GB').format(amount);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [t('members'), number(stats.members)],
          [t('activeMemberships'), number(stats.activeMemberships)],
          [t('monthlyRevenue'), `${number(stats.monthlyRevenueMkd)} MKD`],
          [t('pendingPayments'), number(stats.pendingPayments)],
        ].map(([label, value]) => <Card className="p-5" key={label}><p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p><p className="mt-3 break-words text-2xl font-semibold text-foreground">{value}</p></Card>)}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {chart(t('newMembersTrend'), (item) => item.members, number)}
        {chart(t('monthlyPaymentRevenue'), (item) => item.revenue, (value) => `${number(value)} MKD`)}
      </div>
      <ResponsiveTable
        columns={[{ key: 'count', label: t('workouts'), render: (item) => number(item.workouts) }]}
        emptyDescription={t('noPopularMachinesCopy')}
        emptyTitle={t('noPopularMachines')}
        label={t('popularMachines')}
        rows={stats.popularMachines.map((item) => ({ id: item.slug, ...item }))}
        title={(item) => item.name}
      />
    </div>
  );
}

function AdminAudit(): JSX.Element {
  const t = useTranslations('roleWorkspace');
  const locale = useLocale();
  const { notice, setNotice } = useAdminNotice();
  const [items, setItems] = useState<Audit[]>([]);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    const params = new URLSearchParams({ page: String(pageNumber), pageSize: '30' });
    if (actionFilter) params.set('action', actionFilter);
    if (entityFilter) params.set('entity', entityFilter);
    try {
      const result = await apiGet(`/admin/audit-log?${params.toString()}`, auditPageSchema);
      setItems(result.data); setTotal(result.pagination.total);
    } catch (error) {
      console.error('Unable to load admin audit log.', error instanceof ApiError ? error.status : 'invalid response or network error');
      setFailed(true);
    } finally { setLoading(false); }
  }, [actionFilter, entityFilter, pageNumber]);
  useEffect(() => { void load(); }, [load]);
  const columns: TableColumn<Audit>[] = [
    { key: 'actor', label: t('actor'), render: (item) => item.actor?.profile?.name ?? item.actor?.id ?? '—' },
    { key: 'entity', label: t('entity'), render: (item) => `${item.entity}${item.entityId ? ` · ${item.entityId}` : ''}` },
    { key: 'timestamp', label: t('createdAt'), render: (item) => formatDate(item.createdAt, locale) },
  ];
  return (
    <div className="space-y-4">
      <WorkspaceFeedback notice={notice} onDismiss={() => setNotice(null)} />
      <form className="grid gap-3 sm:grid-cols-3" onSubmit={(event) => { event.preventDefault(); setPageNumber(1); setActionFilter(action.trim()); setEntityFilter(entity.trim()); }}>
        <label className="block"><span className="mb-2 block text-sm text-foreground">{t('filterAction')}</span><Input onChange={(event) => setAction(event.target.value)} value={action} /></label>
        <label className="block"><span className="mb-2 block text-sm text-foreground">{t('filterEntity')}</span><Input onChange={(event) => setEntity(event.target.value)} value={entity} /></label>
        <div className="flex items-end"><Button className="w-full" type="submit">{t('applyFilters')}</Button></div>
      </form>
      {loading ? <WorkspaceLoading /> : failed ? <div className="space-y-3"><p className="text-sm text-muted">{t('loadError')}</p><Button onClick={() => void load()} variant="outline">{t('retry')}</Button></div> : (
        <>
          <ResponsiveTable columns={columns} emptyDescription={t('noAuditCopy')} emptyTitle={t('noAudit')} label={t('auditLog')} rows={items} title={(item) => item.action} />
          <Pager onChange={setPageNumber} pageIndex={pageNumber} pageSize={30} total={total} />
        </>
      )}
    </div>
  );
}

export function AdminWorkspace({ section }: { section: string }): JSX.Element {
  const t = useTranslations('roleWorkspace');
  if (section === 'users') return <AdminUsers />;
  if (section === 'memberships') return <AdminMemberships />;
  if (section === 'machines') return <AdminMachines />;
  if (section === 'exercises') return <AdminMachines exercisesOnly />;
  if (section === 'content') return <AdminContent />;
  if (section === 'trials') return <AdminTrials />;
  if (section === 'sponsors') return <AdminSponsors />;
  if (section === 'analytics') return <AdminAnalytics />;
  if (section === 'audit') return <AdminAudit />;
  return <p className="text-sm text-muted">{t('notFound')}</p>;
}
