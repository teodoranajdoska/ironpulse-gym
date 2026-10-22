'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  openCookieSettingsEvent,
  setCookieConsent,
  useCookieConsent,
} from '@/lib/cookie-consent';

export function CookieBanner(): JSX.Element | null {
  const t = useTranslations('cookie');
  const consent = useCookieConsent();
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const open = (): void => setReopened(true);
    window.addEventListener(openCookieSettingsEvent, open);
    return () => window.removeEventListener(openCookieSettingsEvent, open);
  }, []);

  function choose(value: 'accepted' | 'rejected'): void {
    setCookieConsent(value);
    setReopened(false);
  }

  if (consent !== null && !reopened) return null;
  return (
    <aside
      aria-labelledby="cookie-title"
      aria-describedby="cookie-description"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] z-[80] flex flex-col gap-4 rounded-panel border border-line bg-surface p-5 shadow-2xl sm:left-auto sm:max-w-lg sm:flex-row sm:items-center"
      role="region"
    >
      <div className="flex-1">
        <h2 className="font-semibold text-foreground" id="cookie-title">{t('title')}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted" id="cookie-description">
          {t('description')}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-col">
        <Button onClick={() => choose('accepted')}>{t('accept')}</Button>
        <Button onClick={() => choose('rejected')} variant="outline">
          {t('reject')}
        </Button>
      </div>
    </aside>
  );
}
