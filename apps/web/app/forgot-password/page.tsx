import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth-form';
import { Card } from '@/components/ui/card';
import { AuthFormFallback } from '@/components/auth-form-fallback';
import { AuthPageLayout } from '@/components/auth-page-layout';

export default async function ForgotPasswordPage(): Promise<JSX.Element> {
  const t = await getTranslations('links');
  return (
    <AuthPageLayout>
      <Card className="auth-card shadow-2xl">
        <Suspense fallback={<AuthFormFallback />}>
          <AuthForm kind="forgot" />
        </Suspense>
        <Link className="mt-6 block text-sm text-muted transition hover:text-brand-lime" href="/login">{t('backHome')}</Link>
      </Card>
    </AuthPageLayout>
  );
}
