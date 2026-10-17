import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { getLocale } from 'next-intl/server';
import { GymImage } from '@/components/gym-image';
import { getImageAvailability } from '@/lib/image-availability';

export async function AuthPageLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  const t = await getTranslations('authPanel');
  const requestedLocale = await getLocale();
  const locale = requestedLocale === 'en' ? 'en' : 'mk';
  const imageAvailability = getImageAvailability();

  return (
    <main className="page-width auth-layout">
      <aside aria-label={t('title')} className="auth-layout__photo">
        <GymImage available={imageAvailability['personal-training']} className="auth-layout__image" locale={locale} sizes="(max-width: 900px) 100vw, 55vw" slot="personal-training" />
        <div className="auth-layout__shade">
          <h2 className="display-font">{t('title')}</h2>
          <p>{t('copy')}</p>
        </div>
      </aside>
      <section className="auth-layout__form">{children}</section>
    </main>
  );
}
