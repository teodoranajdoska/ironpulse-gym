'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export function LanguageSwitch({ id = 'language-switch' }: { id?: string }): JSX.Element {
  const t = useTranslations('nav');
  const router = useRouter();
  const [locale, setLocale] = useState('mk');

  useEffect(() => {
    setLocale(document.documentElement.lang === 'en' ? 'en' : 'mk');
    const syncLocale = (event: Event): void => {
      const selected = (event as CustomEvent<string>).detail;
      if (selected === 'mk' || selected === 'en') setLocale(selected);
    };
    window.addEventListener('ironpulse-locale-change', syncLocale);
    return () => window.removeEventListener('ironpulse-locale-change', syncLocale);
  }, []);

  function changeLocale(next: string): void {
    document.cookie = `ip_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    setLocale(next);
    window.dispatchEvent(new CustomEvent('ironpulse-locale-change', { detail: next }));
    router.refresh();
  }

  return (
    <div>
      <label className="sr-only" htmlFor={id}>{t('language')}</label>
      <select
        id={id}
        className="ml-2 h-10 cursor-pointer rounded-full border border-line bg-surface px-3 text-xs font-semibold uppercase tracking-widest text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
        onChange={(event) => changeLocale(event.target.value)}
        value={locale}
      >
        <option value="mk">MK</option>
        <option value="en">EN</option>
      </select>
    </div>
  );
}
