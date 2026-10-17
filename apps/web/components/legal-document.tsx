import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export async function LegalDocument({ kind }: { kind: 'privacy' | 'terms' }): Promise<JSX.Element> {
  const t = await getTranslations('legal');
  const isPrivacy = kind === 'privacy';

  return (
    <main className="page-width legal-page">
      <p className="eyebrow">{isPrivacy ? t('privacy') : t('terms')}</p>
      <h1 className="display-font section-title">{t(isPrivacy ? 'privacyTitle' : 'termsTitle')}</h1>
      <p className="legal-page__intro">{t(isPrivacy ? 'privacyIntro' : 'termsIntro')}</p>
      <section>
        <h2>{t(isPrivacy ? 'privacyAccountsTitle' : 'termsHealthTitle')}</h2>
        <p>{t(isPrivacy ? 'privacyAccountsCopy' : 'termsHealthCopy')}</p>
      </section>
      <section>
        <h2>{t(isPrivacy ? 'privacyCookiesTitle' : 'termsPaymentsTitle')}</h2>
        <p>{t(isPrivacy ? 'privacyCookiesCopy' : 'termsPaymentsCopy')}</p>
      </section>
      {isPrivacy && (
        <section>
          <h2>{t('privacyRequestsTitle')}</h2>
          <p>{t('privacyRequestsCopy')}</p>
        </section>
      )}
      <Link className="text-link" href="/">{t('backHome')}</Link>
    </main>
  );
}
