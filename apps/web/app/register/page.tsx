import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth-form';
import { Card } from '@/components/ui/card';

export default async function RegisterPage(): Promise<JSX.Element> {
  const t = await getTranslations('links');
  return (
    <main className="flex min-h-[70vh] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <Suspense fallback={<p>Loading…</p>}>
          <AuthForm kind="register" />
        </Suspense>
        <div className="mt-4 text-sm text-slate-400">
          <Link href="/login">{t('login')}</Link>
        </div>
      </Card>
    </main>
  );
}
