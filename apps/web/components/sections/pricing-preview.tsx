'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { apiGet, ApiError } from '@/lib/api-client';
import { membershipPlanPrices } from '@ironpulse/shared';
import { PricingCard } from '@/components/sections/pricing-card';
import { Reveal } from '@/components/sections/reveal';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Section, SectionHeading } from '@/components/sections';
import { useLocale, useTranslations } from 'next-intl';

const plansResponseSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    name: z.string(),
    durationMonths: z.number(),
    priceMkd: z.number(),
  })),
});

type Plan = z.infer<typeof plansResponseSchema>['data'][number];

export function PricingPreview(): JSX.Element {
  const locale = useLocale();
  const t = useTranslations('home');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  function durationLabel(months: number): string {
    if (months === 1) return t('duration1');
    if (months === 3) return t('duration3');
    if (months === 6) return t('duration6');
    if (months === 12) return t('duration12');
    return t('planName', { months });
  }

  useEffect(() => {
    let active = true;
    apiGet('/memberships/plans?page=1&pageSize=4', plansResponseSchema)
      .then(({ data }) => {
        if (active) setPlans(data);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError || error instanceof z.ZodError || error instanceof TypeError) {
          if (active) setFailed(true);
          return;
        }
        throw error;
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Section id="membership">
      <SectionHeading description={t('pricingDescription')} eyebrow={t('pricingEyebrow')} title={t('pricingTitle')} />
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Object.keys(membershipPlanPrices).map((plan) => <Skeleton className="h-64 rounded-panel" key={plan} />)}
        </div>
      ) : failed || plans.length === 0 ? (
        <EmptyState description={t('pricingUnavailable')} title={t('pricingUnavailableTitle')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan, index) => (
            <Reveal delay={index * 70} key={plan.id}>
              <PricingCard
                cta={t('choosePlan')}
                duration={durationLabel(plan.durationMonths)}
                locale={locale}
                name={t('planName', { duration: durationLabel(plan.durationMonths) })}
                popular={false}
                popularLabel={t('popular')}
                price={plan.priceMkd}
              />
            </Reveal>
          ))}
        </div>
      )}
    </Section>
  );
}
