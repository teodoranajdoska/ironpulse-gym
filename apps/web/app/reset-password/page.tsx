import { Suspense } from 'react';
import { AuthForm } from '@/components/auth-form';
import { Card } from '@/components/ui/card';
import { AuthFormFallback } from '@/components/auth-form-fallback';
import { AuthPageLayout } from '@/components/auth-page-layout';

export default function ResetPasswordPage(): JSX.Element {
  return (
    <AuthPageLayout>
      <Card className="auth-card shadow-2xl">
        <Suspense fallback={<AuthFormFallback />}>
          <AuthForm kind="reset" />
        </Suspense>
      </Card>
    </AuthPageLayout>
  );
}
