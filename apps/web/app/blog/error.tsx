'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

export default function BlogError({ reset }: { reset: () => void }): JSX.Element {
  const t = useTranslations('blog');

  return (
    <main className="page-width flex min-h-[70vh] items-center justify-center py-16">
      <div className="max-w-lg text-center">
        <h1 className="display-font text-4xl font-bold text-foreground">{t('loadErrorTitle')}</h1>
        <p className="mt-4 text-muted">{t('loadError')}</p>
        <Button className="mt-6" onClick={reset}>
          {t('retry')}
        </Button>
      </div>
    </main>
  );
}
