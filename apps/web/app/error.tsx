'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

export default function ErrorPage(): JSX.Element {
  const t = useTranslations('errors');
  return (
    <main className="page-width system-page flex min-h-[72vh] items-center justify-center py-12">
      <div className="text-center">
        <p className="display-font text-5xl font-bold tracking-tightest text-foreground">{t('unexpected')}</p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          {t('retry')}
        </Button>
      </div>
    </main>
  );
}
