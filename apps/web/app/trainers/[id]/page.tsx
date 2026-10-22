import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api-client';
import { localizedSeedCopy } from '@/lib/localized-copy';

const trainersResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      bio: z.string().nullable(),
      specialties: z.array(z.string()),
      photoUrl: z.string().url().nullable(),
    }),
  ),
});

export async function generateMetadata() {
  const t = await getTranslations('trainerProfile');
  return { title: t('pageTitle') };
}

export default async function TrainerProfilePage({
  params,
}: {
  params: { id: string };
}): Promise<JSX.Element> {
  const t = await getTranslations('trainerProfile');
  const locale = await getLocale();
  const { data: trainers } = await apiGet('/trainers?page=1&pageSize=100', trainersResponseSchema);
  const trainer = trainers.find(({ id }) => id === params.id);
  if (!trainer) notFound();

  return (
    <main className="page-width min-h-[70vh] py-12 sm:py-20">
      <article className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center">
        <div className="relative aspect-[4/5] overflow-hidden rounded-panel bg-raised">
          {trainer.photoUrl ? (
            <Image
              alt={t('portraitAlt', { name: trainer.name ?? t('namePending') })}
              className="object-cover"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 40vw"
              src={trainer.photoUrl}
              unoptimized
            />
          ) : (
            <div
              aria-label={t('portraitAlt', { name: trainer.name ?? t('namePending') })}
              className="grid h-full place-items-center text-brand-lime"
              role="img"
            >
              <span aria-hidden="true" className="display-font text-8xl">
                {(trainer.name ?? '?').slice(0, 1)}
              </span>
            </div>
          )}
        </div>
        <div>
          <Link className="text-link" href="/#trainers">
            {t('backToTrainers')}
          </Link>
          <p className="eyebrow mt-8">{t('eyebrow')}</p>
          <h1 className="display-font mt-3 text-5xl font-bold tracking-tightest text-foreground sm:text-6xl">
            {trainer.name ?? t('namePending')}
          </h1>
          {trainer.specialties.length > 0 && (
            <ul aria-label={t('specialties')} className="mt-5 flex flex-wrap gap-2">
              {trainer.specialties.map((specialty) => (
                <li
                  className="rounded-full border border-brand-lime/40 bg-brand-lime/[0.08] px-3 py-1 text-sm text-foreground"
                  key={specialty}
                >
                  {localizedSeedCopy(specialty, locale)}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 whitespace-pre-line text-base leading-8 text-muted">
            {trainer.bio ? localizedSeedCopy(trainer.bio, locale) : t('bioPending')}
          </p>
          <Button asChild className="mt-8">
            <Link href="/register">{t('bookSession')}</Link>
          </Button>
        </div>
      </article>
    </main>
  );
}
