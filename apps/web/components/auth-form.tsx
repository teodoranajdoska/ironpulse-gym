'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import { useTranslations } from 'next-intl';
import {
  authUserSchema,
  emailSchema,
  emailVerificationSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@ironpulse/shared';
import { z } from 'zod';
import { ApiError, apiPost, apiPostParsed } from '@/lib/api-client';
import { dashboardPaths, safeReturnTo } from '@/lib/dashboard';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type AuthFormKind = 'login' | 'register' | 'verify' | 'resend' | 'forgot' | 'reset';

const loginResponseSchema = z.object({ user: authUserSchema });

export function AuthForm({ kind }: { kind: AuthFormKind }): JSX.Element {
  const t = useTranslations('forms');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (kind === 'login') {
        const input = loginSchema.parse({ email, password });
        const result = await apiPostParsed('/auth/login', input, loginResponseSchema);
        setUser(result.user);
        const destination = safeReturnTo(searchParams.get('next'), dashboardPaths[result.user.role]);
        router.replace(destination as Route);
        router.refresh();
        return;
      }
      if (kind === 'register') {
        const input = registerSchema.parse({ email, password, name });
        const result = await apiPostParsed(
          '/auth/register',
          input,
          z.object({ message: z.string(), user: authUserSchema.optional() }),
        );
        if (result.user) {
          setUser(result.user);
          router.replace(dashboardPaths[result.user.role]);
          router.refresh();
        } else {
          setNotice(t('registerSuccess'));
          router.replace('/verify-email');
        }
        return;
      }
      if (kind === 'verify') {
        const input = emailVerificationSchema.parse({ token: searchParams.get('token') ?? '' });
        await apiPost('/auth/verify-email', input);
        setNotice(t('verifySuccess'));
        return;
      }
      if (kind === 'resend' || kind === 'forgot') {
        const input = emailSchema.parse({ email });
        const endpoint = kind === 'resend' ? '/auth/resend-verification' : '/auth/forgot-password';
        await apiPost(endpoint, input);
        setNotice(t(kind === 'resend' ? 'resendSuccess' : 'forgotSuccess'));
        return;
      }
      if (password !== confirmation) {
        setError(t('passwordMismatch'));
        return;
      }
      const input = resetPasswordSchema.parse({
        token: searchParams.get('token') ?? '',
        password,
      });
      await apiPost('/auth/reset-password', input);
      setNotice(t('resetSuccess'));
      router.replace('/login');
    } catch (caught) {
      if (caught instanceof z.ZodError) {
        setError(t('validation'));
      } else if (caught instanceof ApiError) {
        setError(caught.status === 401 ? t('invalidOrExpired') : t('requestFailed'));
      } else {
        setError(t('requestFailed'));
      }
    } finally {
      setBusy(false);
    }
  }

  const titleKey = `${kind}Title` as const;
  return (
    <form className="space-y-5" onSubmit={(event) => void submit(event)} noValidate>
      <h1 className="display-font text-4xl font-bold leading-none tracking-tightest text-foreground">{t(titleKey)}</h1>
      {kind === 'register' && (
        <Field id="register-name" label={t('name')} value={name} onChange={setName} autoComplete="name" />
      )}
      {(kind === 'login' || kind === 'register' || kind === 'forgot' || kind === 'resend') && (
        <Field
          label={t('email')}
          id={`${kind}-email`}
          value={email}
          onChange={setEmail}
          type="email"
          autoComplete="email"
        />
      )}
      {(kind === 'login' || kind === 'register' || kind === 'reset') && (
        <Field
          label={kind === 'reset' ? t('newPassword') : t('password')}
          id={`${kind}-password`}
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete={kind === 'login' ? 'current-password' : 'new-password'}
        />
      )}
      {kind === 'reset' && (
        <Field
          label={t('confirmPassword')}
          id="reset-confirm-password"
          value={confirmation}
          onChange={setConfirmation}
          type="password"
          autoComplete="new-password"
        />
      )}
      {kind === 'verify' && (
        <p className="text-sm leading-relaxed text-muted">
          {searchParams.get('token') ? t('verificationReady') : t('verificationMissing')}
        </p>
      )}
      {error && <p aria-live="assertive" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p>}
      {notice && <p aria-live="polite" className="rounded-xl border border-brand-lime/30 bg-brand-lime/10 px-4 py-3 text-sm text-brand-lime">{notice}</p>}
      <Button className="w-full" type="submit" disabled={busy || (kind === 'verify' && !searchParams.get('token'))}>
        {busy ? t('working') : t(`${kind}Submit` as const)}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}): JSX.Element {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-muted" htmlFor={id}>{label}</label>
      <Input
        autoComplete={autoComplete}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        required
        type={type}
        value={value}
      />
    </div>
  );
}
