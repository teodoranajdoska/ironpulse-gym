import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth-form';
import { Card } from '@/components/ui/card';
import { AuthFormFallback } from '@/components/auth-form-fallback';
import { AuthPageLayout } from '@/components/auth-page-layout';

export default async function RegisterPage(): Promise<JSX.Element> {
  const t = await getTranslations('links');
  return (
    <AuthPageLayout>
      <Card className="auth-card shadow-2xl">
        <Suspense fallback={<AuthFormFallback />}>
          <AuthForm kind="register" />
        </Suspense>
        <div className="mt-6 text-sm text-muted">
          <Link href="/login">{t('login')}</Link>
        </div>
      </Card>
    </AuthPageLayout>
  );
}
