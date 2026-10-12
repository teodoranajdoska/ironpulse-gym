import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth-form';
import { Card } from '@/components/ui/card';

export default async function ForgotPasswordPage(): Promise<JSX.Element> {
  const t = await getTranslations('links');
  return (
    <main className="flex min-h-[70vh] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <Suspense fallback={<p>Loading…</p>}>
          <AuthForm kind="forgot" />
        </Suspense>
        <Link className="mt-4 block text-sm text-slate-400" href="/login">{t('backHome')}</Link>
      </Card>
    </main>
  );
}
