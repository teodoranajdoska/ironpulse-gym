import { Suspense } from 'react';
import { AuthForm } from '@/components/auth-form';
import { Card } from '@/components/ui/card';

export default function ResetPasswordPage(): JSX.Element {
  return (
    <main className="flex min-h-[70vh] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <Suspense fallback={<p>Loading…</p>}>
          <AuthForm kind="reset" />
        </Suspense>
      </Card>
    </main>
  );
}
