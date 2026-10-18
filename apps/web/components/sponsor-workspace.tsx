'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { z } from 'zod';
import { ApiError, apiDeleteParsed, apiGet, apiPatchParsed, apiPostParsed } from '@/lib/api-client';
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

const offerSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  discountCode: z.string().nullable(),
  validUntil: z.coerce.date().nullable(),
  isActive: z.boolean(),
});
const sponsorSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  logoUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  tier: z.string(),
  isActive: z.boolean(),
  offers: z.array(offerSchema),
});
const statsSchema = z.object({
  impressions: z.number(),
  clicks: z.number(),
  daily: z.array(z.object({
    day: z.string(),
    impressions: z.number(),
    clicks: z.number(),
  })),
});
const idSchema = z.object({ id: z.string() }).passthrough();
type Offer = z.infer<typeof offerSchema>;
type Sponsor = z.infer<typeof sponsorSchema>;
function formatDate(date: Date | null, locale: string): string {
  return date ? new Intl.DateTimeFormat(locale === 'mk' ? 'mk-MK' : 'en-GB', {
    dateStyle: 'medium', timeZone: 'Europe/Skopje',
  }).format(date) : '—';
}

function useSponsorNotice() {
  return useWorkspaceAction('Sponsor');
}

function SponsorProfile(): JSX.Element {
  const t = useTranslations('roleWorkspace');
  const { notice, setNotice, run, pending } = useSponsorNotice();
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const result = await apiGet('/sponsors/me', sponsorSchema);
      setSponsor(result); setCompanyName(result.companyName); setLogoUrl(result.logoUrl ?? ''); setWebsiteUrl(result.websiteUrl ?? '');
    } catch (error) {
      console.error('Unable to load sponsor profile.', error instanceof ApiError ? error.status : 'invalid response or network error');
      setFailed(true);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (companyName.trim().length < 2 ||
      (logoUrl && !z.string().url().safeParse(logoUrl).success) ||
      (websiteUrl && !z.string().url().safeParse(websiteUrl).success)) {
      setNotice({ kind: 'error', message: t('validationError') }); return;
    }
    const ok = await run(() => apiPatchParsed('/sponsors/me', {
      companyName: companyName.trim(),
      logoUrl: logoUrl.trim() || null,
      websiteUrl: websiteUrl.trim() || null,
    }, z.object({ id: z.string() }).passthrough()), t('profileSaved'));
    if (ok) await load();
  }
  if (loading) return <WorkspaceLoading />;
  if (failed || !sponsor) return <div className="space-y-3"><WorkspaceFeedback notice={{ kind: 'error', message: t('loadError') }} onDismiss={() => setNotice(null)} /><Button onClick={() => void load()} variant="outline">{t('retry')}</Button></div>;
  return (
    <div className="space-y-4">
      <WorkspaceFeedback notice={notice} onDismiss={() => setNotice(null)} />
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-foreground">{t('sponsorProfile')}</h2>
        <p className="mt-2 text-sm text-muted">{t('tier')}: {sponsor.tier} · {t(sponsor.isActive ? 'active' : 'inactive')}</p>
        <form className="mt-5 space-y-4" onSubmit={(event) => void save(event)}>
          <label className="block"><span className="mb-2 block text-sm font-medium text-foreground">{t('companyName')}</span><Input maxLength={160} minLength={2} onChange={(event) => setCompanyName(event.target.value)} required value={companyName} /></label>
          <label className="block"><span className="mb-2 block text-sm font-medium text-foreground">{t('logoUrl')}</span><Input onChange={(event) => setLogoUrl(event.target.value)} type="url" value={logoUrl} /></label>
          <label className="block"><span className="mb-2 block text-sm font-medium text-foreground">{t('websiteUrl')}</span><Input onChange={(event) => setWebsiteUrl(event.target.value)} type="url" value={websiteUrl} /></label>
          <Button disabled={pending} type="submit">{t('saveChanges')}</Button>
        </form>
      </Card>
    </div>
  );
}

function SponsorOffers(): JSX.Element {
  const t = useTranslations('roleWorkspace');
  const locale = useLocale();
  const { notice, setNotice, run, pending } = useSponsorNotice();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try { setOffers((await apiGet('/sponsors/me', sponsorSchema)).offers); }
    catch (error) {
      console.error('Unable to load sponsor offers.', error instanceof ApiError ? error.status : 'invalid response or network error');
      setFailed(true);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  function select(offer: Offer): void {
    setEditing(offer); setTitle(offer.title); setDescription(offer.description);
    setDiscountCode(offer.discountCode ?? '');
    setValidUntil(offer.validUntil ? offer.validUntil.toISOString().slice(0, 10) : '');
  }
  function clear(): void { setEditing(null); setTitle(''); setDescription(''); setDiscountCode(''); setValidUntil(''); }
  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (title.trim().length < 2 || description.trim().length < 1) {
      setNotice({ kind: 'error', message: t('validationError') }); return;
    }
    const input = {
      title: title.trim(), description: description.trim(),
      discountCode: discountCode.trim() || null,
      validUntil: validUntil ? new Date(`${validUntil}T23:59:59.999Z`).toISOString() : null,
      ...(editing ? {} : { isActive: true }),
    };
    const ok = await run(() => editing
      ? apiPatchParsed(`/sponsors/me/offers/${editing.id}`, input, offerSchema)
      : apiPostParsed('/sponsors/me/offers', input, offerSchema),
    t(editing ? 'offerUpdated' : 'offerCreated'));
    if (ok) { clear(); await load(); }
  }
  async function toggle(offer: Offer): Promise<void> {
    const ok = await run(() => apiPatchParsed(`/sponsors/me/offers/${offer.id}`, { isActive: !offer.isActive }, offerSchema), t('offerStatusUpdated'));
    if (ok) await load();
  }
  async function remove(offer: Offer): Promise<void> {
    if (!window.confirm(t('confirmDestructiveAction'))) return;
    const ok = await run(() => apiDeleteParsed(`/sponsors/me/offers/${offer.id}`, {}, idSchema), t('offerDeleted'));
    if (ok) await load();
  }
  const columns: TableColumn<Offer>[] = [
    { key: 'description', label: t('description'), render: (item) => <span className="line-clamp-3">{item.description}</span> },
    { key: 'code', label: t('discountCode'), render: (item) => item.discountCode ?? '—' },
    { key: 'valid', label: t('validUntil'), render: (item) => formatDate(item.validUntil, locale) },
    { key: 'status', label: t('status'), render: (item) => t(item.isActive ? 'active' : 'inactive') },
    { key: 'actions', label: t('actions'), render: (item) => <div className="flex flex-wrap gap-2"><Button disabled={pending} onClick={() => select(item)} size="sm" variant="outline">{t('edit')}</Button><Button disabled={pending} onClick={() => void toggle(item)} size="sm" variant="outline">{t(item.isActive ? 'deactivate' : 'activate')}</Button><Button disabled={pending} onClick={() => void remove(item)} size="sm" variant="outline">{t('delete')}</Button></div> },
  ];
  if (loading) return <WorkspaceLoading />;
  if (failed) return <div className="space-y-3"><WorkspaceFeedback notice={{ kind: 'error', message: t('loadError') }} onDismiss={() => setNotice(null)} /><Button onClick={() => void load()} variant="outline">{t('retry')}</Button></div>;
  return (
    <div className="space-y-5">
      <WorkspaceFeedback notice={notice} onDismiss={() => setNotice(null)} />
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-foreground">{t(editing ? 'editOffer' : 'createOffer')}</h2>{editing && <Button disabled={pending} onClick={clear} size="sm" variant="outline">{t('newItem')}</Button>}</div>
        <form className="mt-4 space-y-4" onSubmit={(event) => void save(event)}>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('offerTitle')}</span><Input maxLength={160} minLength={2} onChange={(event) => setTitle(event.target.value)} required value={title} /></label>
          <label className="block"><span className="mb-2 block text-sm text-foreground">{t('description')}</span><textarea className="min-h-28 w-full rounded-xl border border-line bg-canvas p-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime" maxLength={2000} onChange={(event) => setDescription(event.target.value)} required value={description} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="mb-2 block text-sm text-foreground">{t('discountCode')}</span><Input maxLength={80} onChange={(event) => setDiscountCode(event.target.value)} value={discountCode} /></label>
            <label className="block"><span className="mb-2 block text-sm text-foreground">{t('validUntil')}</span><Input onChange={(event) => setValidUntil(event.target.value)} type="date" value={validUntil} /></label>
          </div>
          <Button disabled={pending} type="submit">{t(editing ? 'saveChanges' : 'create')}</Button>
        </form>
      </Card>
      <ResponsiveTable columns={columns} emptyDescription={t('noOffersCopy')} emptyTitle={t('noOffers')} label={t('offers')} rows={offers} title={(item) => item.title} />
    </div>
  );
}

function SponsorAnalytics(): JSX.Element {
  const t = useTranslations('roleWorkspace');
  const locale = useLocale();
  const [stats, setStats] = useState<z.infer<typeof statsSchema> | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setFailed(false);
    try { setStats(await apiGet('/sponsors/me/stats', statsSchema)); }
    catch (error) {
      console.error('Unable to load sponsor stats.', error instanceof ApiError ? error.status : 'invalid response or network error');
      setFailed(true);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (failed) return <div className="space-y-3"><p role="alert" className="text-sm text-muted">{t('loadError')}</p><Button onClick={() => void load()} variant="outline">{t('retry')}</Button></div>;
  if (!stats) return <WorkspaceLoading />;
  const daily = stats.daily.slice(-30);
  const max = Math.max(1, ...daily.flatMap((entry) => [entry.impressions, entry.clicks]));
  const number = (value: number) => new Intl.NumberFormat(locale === 'mk' ? 'mk-MK' : 'en-GB').format(value);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5"><p className="text-sm text-muted">{t('impressions')}</p><p className="mt-2 text-3xl font-semibold text-foreground">{number(stats.impressions)}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">{t('clicks')}</p><p className="mt-2 text-3xl font-semibold text-foreground">{number(stats.clicks)}</p></Card>
      </div>
      <Card className="p-5">
        <h2 className="font-semibold text-foreground">{t('dailyActivity')}</h2>
        {daily.length ? (
          <div className="mt-5 space-y-3">
            {daily.map((entry) => (
              <div className="grid gap-2 sm:grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)] sm:items-center" key={entry.day}>
                <time className="text-xs text-muted" dateTime={entry.day}>{formatDate(new Date(`${entry.day}T00:00:00Z`), locale)}</time>
                <span aria-label={`${t('impressions')}: ${entry.impressions}`} className="relative h-3 rounded-full bg-raised" role="img"><span className="block h-full rounded-full bg-brand-lime" style={{ width: `${Math.max(2, entry.impressions / max * 100)}%` }} /></span>
                <span className="text-xs text-muted">{t('impressions')}: {number(entry.impressions)} · {t('clicks')}: {number(entry.clicks)}</span>
              </div>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-muted">{t('noAnalytics')}</p>}
      </Card>
      <p className="text-xs text-muted">{t('analyticsNote')}</p>
    </div>
  );
}

export function SponsorWorkspace({ section }: { section: string }): JSX.Element {
  const t = useTranslations('roleWorkspace');
  if (section === 'profile') return <SponsorProfile />;
  if (section === 'offers') return <SponsorOffers />;
  if (section === 'analytics') return <SponsorAnalytics />;
  return <p className="text-sm text-muted">{t('notFound')}</p>;
}
