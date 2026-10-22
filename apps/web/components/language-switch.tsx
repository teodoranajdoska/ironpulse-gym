'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

export function LanguageSwitch({ id = 'language-switch' }: { id?: string }): JSX.Element {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();

  function changeLocale(next: string): void {
    if (next !== 'mk' && next !== 'en') return;
    document.cookie = `ip_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div>
      <label className="sr-only" htmlFor={id}>{t('language')}</label>
      <select
        id={id}
        className="ml-2 h-11 min-w-11 cursor-pointer rounded-full border border-line bg-surface px-3 text-xs font-semibold uppercase tracking-widest text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
        onChange={(event) => changeLocale(event.target.value)}
        value={locale}
      >
        <option value="mk">MK</option>
        <option value="en">EN</option>
      </select>
    </div>
  );
}
