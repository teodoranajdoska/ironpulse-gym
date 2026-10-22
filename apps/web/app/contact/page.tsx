'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, apiGet } from '@/lib/api-client';
import { contactFormSchema, type ContactField, type ContactFormValues } from '@/lib/contact-schema';
import { submitContactMessage } from '@/lib/contact-service';
import { localizedSeedCopy } from '@/lib/localized-copy';
import { useToast } from '@/components/ui/toast';
import { useCookieConsent } from '@/lib/cookie-consent';

const settingsSchema = z.array(z.object({ key: z.string(), value: z.string() }));
const fields = [
  'name',
  'email',
  'phone',
  'subject',
  'message',
] as const satisfies readonly ContactField[];
const initialValues: ContactFormValues = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
};

export default function ContactPage(): JSX.Element {
  const t = useTranslations('contact');
  const locale = useLocale();
  const toast = useToast();
  const consent = useCookieConsent();
  const isDevelopment = process.env.NODE_ENV === 'development';
  const [values, setValues] = useState<ContactFormValues>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<ContactField, string>>>({});
  const [settings, setSettings] = useState<z.infer<typeof settingsSchema>>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsFailed, setSettingsFailed] = useState(false);
  const [settingsAttempt, setSettingsAttempt] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    let active = true;
    setSettingsLoading(true);
    setSettingsFailed(false);
    apiGet('/content/settings', settingsSchema)
      .then((data) => {
        if (active) setSettings(data);
      })
      .catch((error: unknown) => {
        console.error(
          'Unable to load contact settings.',
          error instanceof ApiError
            ? error.status
            : error instanceof z.ZodError
              ? 'invalid response'
              : 'network error',
        );
        if (active) setSettingsFailed(true);
      })
      .finally(() => {
        if (active) setSettingsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [settingsAttempt]);

  function setting(key: string): string {
    const value = settings.find((item) => item.key === key)?.value;
    if (!value || (!isDevelopment && value.startsWith('DEMO ·'))) return t('notAvailable');
    return localizedSeedCopy(value, locale);
  }

  function rawSetting(key: string): string | undefined {
    const value = settings.find((item) => item.key === key)?.value;
    if (!value || (!isDevelopment && value.startsWith('DEMO ·'))) return undefined;
    return value.replace(/^DEMO ·\s*/, '');
  }

  function updateField(field: ContactField, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submittingRef.current) return;

    const result = contactFormSchema.safeParse(values);
    if (!result.success) {
      const nextErrors: Partial<Record<ContactField, string>> = {};
      for (const field of fields) {
        if (result.error.issues.some((issue) => issue.path[0] === field)) {
          nextErrors[field] = t(`${field}Error`);
        }
      }
      setErrors(nextErrors);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await submitContactMessage(result.data);
      setValues(initialValues);
      setErrors({});
      toast({ kind: 'success', message: t('successToast') });
    } catch (error) {
      console.error(
        'Contact form submission failed.',
        error instanceof ApiError
          ? error.status
          : error instanceof z.ZodError
            ? 'invalid response'
            : 'request error',
      );
      toast({
        kind: 'error',
        message:
          error instanceof ApiError && error.status === 404
            ? t('endpointUnavailable')
            : t('failureToast'),
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const address = rawSetting('address');
  const mapQuery = address ?? t('mapFallbackQuery');
  const mapSearch = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
  const mapEmbed = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;

  return (
    <main className="page-width min-h-[70vh] py-16 sm:py-24">
      <header className="max-w-3xl">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="display-font mt-3 text-5xl font-bold tracking-tightest text-foreground sm:text-7xl">
          {t('title')}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">{t('description')}</p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <Card className="p-6 sm:p-8">
          <h2 className="display-font text-3xl font-semibold text-foreground">{t('formTitle')}</h2>
          <form className="mt-6 space-y-5" noValidate onSubmit={(event) => void submit(event)}>
            {fields.map((field) => {
              const inputId = `contact-${field}`;
              const errorId = `${inputId}-error`;
              const label = t(`${field}Label`);
              const describedBy = errors[field] ? errorId : undefined;
              return (
                <div key={field}>
                  <label
                    className="mb-2 block text-sm font-semibold text-foreground"
                    htmlFor={inputId}
                  >
                    {label}
                    {field !== 'phone' && <span aria-hidden="true"> *</span>}
                  </label>
                  {field === 'message' ? (
                    <textarea
                      aria-describedby={describedBy}
                      aria-invalid={Boolean(errors[field])}
                      autoComplete="off"
                      className="min-h-36 w-full rounded-xl border border-line bg-canvas px-4 py-3 text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
                      id={inputId}
                      maxLength={5000}
                      minLength={10}
                      name={field}
                      onChange={(event) => updateField(field, event.target.value)}
                      required
                      value={values[field]}
                    />
                  ) : (
                    <Input
                      aria-describedby={describedBy}
                      aria-invalid={Boolean(errors[field])}
                      autoComplete={
                        field === 'name'
                          ? 'name'
                          : field === 'email'
                            ? 'email'
                            : field === 'phone'
                              ? 'tel'
                              : 'off'
                      }
                      id={inputId}
                      maxLength={
                        field === 'name'
                          ? 120
                          : field === 'email'
                            ? 254
                            : field === 'phone'
                              ? 30
                              : 120
                      }
                      minLength={field === 'name' ? 2 : field === 'subject' ? 3 : undefined}
                      name={field}
                      onChange={(event) => updateField(field, event.target.value)}
                      required={field !== 'phone'}
                      type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                      value={values[field]}
                    />
                  )}
                  {errors[field] && (
                    <p className="mt-2 text-sm text-red-400" id={errorId} role="alert">
                      {errors[field]}
                    </p>
                  )}
                </div>
              );
            })}
            <Button className="w-full sm:w-auto" disabled={submitting} type="submit">
              {submitting ? t('submitting') : t('send')}
            </Button>
          </form>
        </Card>

        <aside aria-labelledby="contact-details-title" className="space-y-6">
          <Card className="p-6 sm:p-8">
            <h2
              className="display-font text-3xl font-semibold text-foreground"
              id="contact-details-title"
            >
              {t('detailsTitle')}
            </h2>
            {settingsLoading ? (
              <div aria-label={t('loading')} aria-live="polite" className="mt-6 space-y-4">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-4/5" />
              </div>
            ) : settingsFailed ? (
              <div className="mt-6 space-y-4">
                <EmptyState description={t('settingsError')} title={t('settingsErrorTitle')} />
                <Button
                  onClick={() => setSettingsAttempt((attempt) => attempt + 1)}
                  variant="outline"
                >
                  {t('retry')}
                </Button>
              </div>
            ) : (
              <dl className="mt-6 space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-foreground">{t('addressLabel')}</dt>
                  <dd className="mt-1 text-muted">{setting('address')}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">{t('phoneLabel')}</dt>
                  <dd className="mt-1 text-muted">
                    {rawSetting('phone') ? (
                      <a
                        className="underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
                        href={`tel:${rawSetting('phone')}`}
                      >
                        {setting('phone')}
                      </a>
                    ) : (
                      setting('phone')
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">{t('emailLabel')}</dt>
                  <dd className="mt-1 text-muted">
                    {rawSetting('email') ? (
                      <a
                        className="underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
                        href={`mailto:${rawSetting('email')}`}
                      >
                        {setting('email')}
                      </a>
                    ) : (
                      setting('email')
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">{t('hoursLabel')}</dt>
                  <dd className="mt-1 whitespace-pre-line text-muted">
                    {setting('opening_hours')}
                  </dd>
                </div>
              </dl>
            )}
          </Card>
          <Card className="overflow-hidden p-0">
            {consent === 'accepted' ? (
              <iframe
                aria-label={t('mapTitle')}
                className="h-72 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={mapEmbed}
                title={t('mapTitle')}
              />
            ) : (
              <div
                className="flex h-72 items-center justify-center bg-raised p-6 text-center text-sm text-muted"
                role="status"
              >
                {t('mapConsentNotice')}
              </div>
            )}
            <div className="p-5">
              <a className="text-link" href={mapSearch} rel="noreferrer" target="_blank">
                {t('openMap')}
              </a>
            </div>
          </Card>
        </aside>
      </div>
    </main>
  );
}
