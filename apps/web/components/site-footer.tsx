'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { APP_NAME } from '@ironpulse/shared';
import { LanguageSwitch } from '@/components/language-switch';
import { ThemeToggle } from '@/components/theme-toggle';
import { ApiError, apiGet } from '@/lib/api-client';

const settingsSchema = z.array(z.object({ key: z.string(), value: z.string() }));
type Setting = z.infer<typeof settingsSchema>[number];

export function SiteFooter(): JSX.Element {
  const t = useTranslations('footer');
  const [settings, setSettings] = useState<Setting[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    apiGet('/content/settings', settingsSchema)
      .then((data) => {
        if (active) setSettings(data);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError || error instanceof z.ZodError || error instanceof TypeError) {
          console.error('Unable to load footer contact settings.', error instanceof ApiError ? error.status : 'invalid response or network error');
          if (active) setFailed(true);
          return;
        }
        console.error('Unexpected footer contact settings error.', error instanceof Error ? error.name : 'unknown error');
        if (active) setFailed(true);
      });
    return () => { active = false; };
  }, []);

  function setting(key: string): string {
    return settings.find((item) => item.key === key)?.value ?? t(failed ? 'notAvailable' : 'loading');
  }

  const phone = settings.find((item) => item.key === 'phone')?.value;
  const email = settings.find((item) => item.key === 'email')?.value;

  return (
    <footer className="site-footer" id="footer">
      <div className="page-width site-footer__content">
        <div>
          <Link className="site-footer__brand display-font" href="/">
            {APP_NAME}<span>.</span>
          </Link>
          <p className="site-footer__tagline">{t('tagline')}</p>
        </div>
        <div className="site-footer__contact">
          <h2>{t('contactHeading')}</h2>
          <p><strong>{t('hoursLabel')}:</strong> {setting('opening_hours')}</p>
          <p><strong>{t('addressLabel')}:</strong> {setting('address')}</p>
          {phone ? <a href={`tel:${phone}`}><strong>{t('phoneLabel')}:</strong> {phone}</a> : <p><strong>{t('phoneLabel')}:</strong> {setting('phone')}</p>}
          {email ? <a href={`mailto:${email}`}><strong>{t('emailLabel')}:</strong> {email}</a> : <p><strong>{t('emailLabel')}:</strong> {setting('email')}</p>}
        </div>
        <nav aria-label={t('legalHeading')} className="site-footer__links">
          <h2>{t('legalHeading')}</h2>
          <Link href="/privacy">{t('privacy')}</Link>
          <Link href="/terms">{t('terms')}</Link>
          <span>{t('socialPlaceholder')}</span>
        </nav>
      </div>
      <div className="page-width site-footer__bottom">
        <span>© {new Date().getFullYear()} {APP_NAME}</span>
        <span>{t('tagline')}</span>
        <div className="site-footer__preferences">
          <LanguageSwitch id="language-switch-footer" />
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
