import { Suspense } from 'react';
import { AuthForm } from '@/components/auth-form';
import { Card } from '@/components/ui/card';
import { AuthFormFallback } from '@/components/auth-form-fallback';
import { AuthPageLayout } from '@/components/auth-page-layout';
import { webEnv } from '@/lib/env';
import { redirect } from 'next/navigation';

export default async function VerifyEmailPage(): Promise<JSX.Element> {
  if (!webEnv.NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED) redirect('/login');

  return (
    <AuthPageLayout>
      <Card className="auth-card shadow-2xl">
        <Suspense fallback={<AuthFormFallback />}>
          <AuthForm kind="verify" />
          <div className="my-6 border-t border-line" />
          <AuthForm kind="resend" />
        </Suspense>
      </Card>
    </AuthPageLayout>
  );
}
