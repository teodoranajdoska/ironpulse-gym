import { Suspense } from 'react';
import { AuthForm } from '@/components/auth-form';
import { Card } from '@/components/ui/card';

export default async function VerifyEmailPage(): Promise<JSX.Element> {
  return (
    <main className="flex min-h-[70vh] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <Suspense fallback={<p>Loading…</p>}>
          <AuthForm kind="verify" />
          <div className="my-6 border-t border-slate-700" />
          <AuthForm kind="resend" />
        </Suspense>
      </Card>
    </main>
  );
}
