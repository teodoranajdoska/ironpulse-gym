import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getTranslations } from 'next-intl/server';

export default async function NotFound(): Promise<JSX.Element> {
  const t = await getTranslations('errors');
  return (
    <main className="page-width system-page flex min-h-[72vh] items-center justify-center py-12">
      <div className="text-center">
        <p className="text-brand-lime">404</p>
        <h1 className="display-font mt-4 text-6xl font-bold tracking-tightest text-foreground">{t('notFound')}</h1>
        <Button className="mt-6" asChild>
          <Link href="/">{t('home')}</Link>
        </Button>
      </div>
    </main>
  );
}
