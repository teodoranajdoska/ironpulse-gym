import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { APP_NAME, membershipPlanPrices } from '@ironpulse/shared';

export default async function HomePage(): Promise<JSX.Element> {
  const t = await getTranslations('home');
  const locale = await getLocale();

  return (
    <main className="py-10">
      <section className="grid gap-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 md:grid-cols-2">
        <div>
          <p className="mb-3 uppercase tracking-[0.25em] text-brand-lime">{APP_NAME}</p>
          <h1 className="text-5xl font-black leading-none text-white">{t('headline')}</h1>
          <p className="mt-6 max-w-md text-lg text-slate-300">{t('subtitle')}</p>
          <div className="mt-8 flex gap-4">
            <Button asChild>
              <Link href="/register">{t('cta')}</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/login">{t('signIn')}</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-8">
          <div className="mb-4 text-sm uppercase tracking-[0.25em] text-slate-400">{t('membership')}</div>
          <div className="space-y-4 text-slate-200">
            {Object.entries(membershipPlanPrices).map(([plan, price], index) => (
              <div className="flex justify-between" key={plan}>
                <span>{t(`duration${index + 1}` as const)}</span>
                <span>{new Intl.NumberFormat(locale).format(price)} MKD</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
