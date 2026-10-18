'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function CookieBanner(): JSX.Element | null {
  const t = useTranslations('cookie');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem('ironpulse-cookie-consent') !== 'accepted');
  }, []);

  function accept(): void {
    window.localStorage.setItem('ironpulse-cookie-consent', 'accepted');
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <aside
      aria-label={t('title')}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-[80] flex flex-col gap-4 rounded-panel border border-line bg-surface p-5 shadow-2xl sm:left-auto sm:max-w-lg sm:flex-row sm:items-center"
    >
      <div className="flex-1">
        <h2 className="font-semibold text-foreground">{t('title')}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{t('description')}</p>
      </div>
      <Button onClick={accept}>{t('accept')}</Button>
    </aside>
  );
}
