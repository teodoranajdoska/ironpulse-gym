'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

export default function ErrorPage(): JSX.Element {
  const t = useTranslations('errors');
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-brand-lime">{t('unexpected')}</p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          {t('retry')}
        </Button>
      </div>
    </main>
  );
}
