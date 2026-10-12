import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getTranslations } from 'next-intl/server';

export default async function NotFound(): Promise<JSX.Element> {
  const t = await getTranslations('errors');
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-brand-lime">404</p>
        <h1 className="mt-4 text-4xl font-bold">{t('notFound')}</h1>
        <Button className="mt-6" asChild>
          <Link href="/">{t('home')}</Link>
        </Button>
      </div>
    </main>
  );
}
