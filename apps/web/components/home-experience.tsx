'use client';

import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Dumbbell,
  HeartPulse,
  MoveUpRight,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Route } from 'next';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { z } from 'zod';
import { GymImage } from '@/components/gym-image';
import { CountUp } from '@/components/sections/count-up';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, apiGet, apiPostParsed } from '@/lib/api-client';
import { getMonthlyPrice, getSavingsPercentage } from '@/lib/pricing';
import { localizedSeedCopy } from '@/lib/localized-copy';
import type { ImageSlot } from '@/lib/images';

const plansResponseSchema = z
  .object({
    data: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        durationMonths: z.number().int().positive(),
        priceMkd: z.number().nonnegative(),
      }),
    ),
    pagination: z.object({ total: z.number().int().nonnegative() }).passthrough().optional(),
  })
  .passthrough();

const machinesResponseSchema = z
  .object({
    data: z.array(
      z.object({
        id: z.string(),
        slug: z.string(),
        name: z.string(),
        category: z.string(),
      }),
    ),
    pagination: z.object({ total: z.number().int().nonnegative() }).passthrough().optional(),
  })
  .passthrough();

const trainersResponseSchema = z
  .object({
    data: z.array(
      z.object({
        id: z.string(),
        name: z.string().nullable(),
        bio: z.string().nullable(),
        specialties: z.array(z.string()),
        photoUrl: z.string().url().nullable(),
      }),
    ),
    pagination: z.object({ total: z.number().int().nonnegative() }).passthrough().optional(),
  })
  .passthrough();

const sponsorsResponseSchema = z
  .object({
    data: z.array(
      z.object({
        id: z.string(),
        companyName: z.string(),
        logoUrl: z.string().nullable(),
        websiteUrl: z.string().nullable(),
        offers: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            discountCode: z.string().nullable(),
          }),
        ),
      }),
    ),
  })
  .passthrough();

const settingsResponseSchema = z.array(z.object({ key: z.string(), value: z.string() }));
const trialRequestResponseSchema = z.object({ id: z.string() }).passthrough();
const trialRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).optional(),
  preferredDate: z.coerce.date().optional(),
});

type Plan = z.infer<typeof plansResponseSchema>['data'][number];
type Machine = z.infer<typeof machinesResponseSchema>['data'][number];
type Trainer = z.infer<typeof trainersResponseSchema>['data'][number];
type Sponsor = z.infer<typeof sponsorsResponseSchema>['data'][number];
type Setting = z.infer<typeof settingsResponseSchema>[number];
type Resource<T> = { value: T | undefined; error: boolean };

async function loadResource<T>(name: string, request: Promise<T>): Promise<Resource<T>> {
  try {
    return { value: await request, error: false };
  } catch (error) {
    if (error instanceof ApiError || error instanceof z.ZodError || error instanceof TypeError) {
      console.error(
        `Unable to load public ${name}.`,
        error instanceof ApiError ? error.status : 'invalid response or network error',
      );
    } else {
      console.error(
        `Unexpected error while loading public ${name}.`,
        error instanceof Error ? error.name : 'unknown error',
      );
    }
    return { value: undefined, error: true };
  }
}

function categoryText(category: string, t: ReturnType<typeof useTranslations<'landing'>>): string {
  switch (category) {
    case 'LEGS':
      return t('categoryLegs');
    case 'CHEST':
      return t('categoryChest');
    case 'BACK':
      return t('categoryBack');
    case 'SHOULDERS':
      return t('categoryShoulders');
    case 'ARMS':
      return t('categoryArms');
    case 'CORE':
      return t('categoryCore');
    case 'CARDIO':
      return t('categoryCardio');
    default:
      return t('categoryOther');
  }
}

function durationText(months: number, t: ReturnType<typeof useTranslations<'landing'>>): string {
  if (months === 1) return t('durationOne');
  if (months === 3) return t('durationThree');
  if (months === 6) return t('durationSix');
  if (months === 12) return t('durationTwelve');
  return t('durationOther', { months });
}

function trainerCopy(value: string, locale: string): string {
  return localizedSeedCopy(value, locale);
}

function trainerSpecialtyCopy(value: string, locale: string): string {
  const knownSpecialties: Record<string, [string, string]> = {
    'Силов тренинг': ['Силов тренинг', 'Strength training'],
    'Strength training': ['Силов тренинг', 'Strength training'],
    'Функционален тренинг': ['Функционален тренинг', 'Functional training'],
    'Functional training': ['Функционален тренинг', 'Functional training'],
    Mobility: ['Подвижност', 'Mobility'],
    Подвижност: ['Подвижност', 'Mobility'],
    'Техника и прогресија': ['Техника и прогресија', 'Technique and progression'],
    'Technique and progression': ['Техника и прогресија', 'Technique and progression'],
    'Почетнички програми': ['Програми за почетници', 'Beginner programmes'],
    'Програми за почетници': ['Програми за почетници', 'Beginner programmes'],
    Кондиција: ['Кондициски тренинг', 'Conditioning'],
    Conditioning: ['Кондициски тренинг', 'Conditioning'],
    'Индивидуално планирање': ['Индивидуално планирање', 'Individual planning'],
    'Individual planning': ['Индивидуално планирање', 'Individual planning'],
  };
  return knownSpecialties[value]?.[locale === 'mk' ? 0 : 1] ?? trainerCopy(value, locale);
}

function TrainerPortrait({ photoUrl, alt }: { photoUrl: string | null; alt: string }): JSX.Element {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = imageFailed ? null : photoUrl;
  const showImage = imageSrc !== null;

  return (
    <div
      aria-label={showImage ? undefined : alt}
      className="gym-image trainer-card__portrait image-reveal"
      role={showImage ? undefined : 'img'}
    >
      <div aria-hidden="true" className="gym-image__placeholder trainer-card__avatar">
        <UserRound aria-hidden="true" size={64} strokeWidth={1.2} />
      </div>
      {imageSrc !== null && (
        <Image
          alt={alt}
          className="gym-image__asset"
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          src={imageSrc}
          unoptimized
          onError={() => setImageFailed(true)}
        />
      )}
    </div>
  );
}

function machineImageSlot(category: string): 'cardio' | 'free-weights' | 'functional' | 'machines' {
  switch (category) {
    case 'CARDIO':
      return 'cardio';
    case 'CHEST':
    case 'ARMS':
      return 'free-weights';
    case 'SHOULDERS':
    case 'CORE':
      return 'functional';
    default:
      return 'machines';
  }
}

function Metric({
  value,
  label,
  loaded,
}: {
  value: number;
  label: string;
  loaded: boolean;
}): JSX.Element {
  return (
    <div className="home-metric">
      <p className="display-font home-metric__value">{loaded ? <CountUp value={value} /> : '—'}</p>
      <p className="home-metric__label">{label}</p>
    </div>
  );
}

function MockupScreen({ step }: { step: number }): JSX.Element {
  const t = useTranslations('landing');
  const screens = [
    <div className="mockup-panel" key="membership">
      <div className="mockup-topline">
        <span>{t('mockMembership')}</span>
        <span className="mockup-dot" />
      </div>
      <p className="mockup-label">{t('mockPlanLabel')}</p>
      <p className="mockup-main">{t('mockActivePlan')}</p>
      <div className="mockup-progress">
        <span />
      </div>
      <p className="mockup-foot">{t('mockRenewal')}</p>
    </div>,
    <div className="mockup-panel" key="nutrition">
      <div className="mockup-topline">
        <span>{t('mockNutrition')}</span>
        <HeartPulse aria-hidden="true" size={18} />
      </div>
      <p className="mockup-label">{t('mockToday')}</p>
      <p className="mockup-main">{t('mockNutritionTitle')}</p>
      <div className="mockup-food">
        <span />
        <span />
        <span />
      </div>
      <p className="mockup-foot">{t('mockPersonalized')}</p>
    </div>,
    <div className="mockup-panel" key="library">
      <div className="mockup-topline">
        <span>{t('mockLibrary')}</span>
        <Dumbbell aria-hidden="true" size={18} />
      </div>
      <p className="mockup-label">{t('mockGuide')}</p>
      <p className="mockup-main">{t('mockExerciseTitle')}</p>
      <div className="mockup-machine">
        <span />
        <i />
        <b />
        <i />
        <span />
      </div>
      <p className="mockup-foot">{t('mockTechnique')}</p>
    </div>,
    <div className="mockup-panel" key="trainer">
      <div className="mockup-topline">
        <span>{t('mockCoaching')}</span>
        <UsersRound aria-hidden="true" size={18} />
      </div>
      <p className="mockup-label">{t('mockNextSession')}</p>
      <p className="mockup-main">{t('mockCoachTitle')}</p>
      <div className="mockup-session">
        <span />
        <span />
        <span />
      </div>
      <p className="mockup-foot">{t('mockSessionReady')}</p>
    </div>,
  ];
  return <div className="platform-mockup__screen">{screens[step]}</div>;
}

export function HomeExperience({
  hasHeroVideo,
  imageAvailability,
}: {
  hasHeroVideo: boolean;
  imageAvailability: Record<ImageSlot, boolean>;
}): JSX.Element {
  const t = useTranslations('landing');
  const locale = useLocale() === 'en' ? 'en' : 'mk';
  const rootRef = useRef<HTMLElement>(null);
  const trialFormRef = useRef<HTMLFormElement>(null);
  const [heroVideoEnabled, setHeroVideoEnabled] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planCount, setPlanCount] = useState<number | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineCount, setMachineCount] = useState<number | null>(null);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainerCount, setTrainerCount] = useState<number | null>(null);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [resourceErrors, setResourceErrors] = useState<Record<string, boolean>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [trialError, setTrialError] = useState('');
  const [trialSuccess, setTrialSuccess] = useState(false);
  const [trialBusy, setTrialBusy] = useState(false);
  const [trackingError, setTrackingError] = useState(false);
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = (): void => setMotionEnabled(!preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktopMotion = window.matchMedia(
      '(min-width: 768px) and (hover: hover) and (pointer: fine)',
    );
    const connection = (
      navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }
    ).connection;
    const update = (): void => {
      setHeroVideoEnabled(
        hasHeroVideo &&
          !preference.matches &&
          motionEnabled &&
          desktopMotion.matches &&
          !connection?.saveData,
      );
    };
    update();
    preference.addEventListener('change', update);
    desktopMotion.addEventListener('change', update);
    connection?.addEventListener('change', update);
    return () => {
      preference.removeEventListener('change', update);
      desktopMotion.removeEventListener('change', update);
      connection?.removeEventListener('change', update);
    };
  }, [hasHeroVideo, motionEnabled]);

  useEffect(() => {
    let active = true;
    const requests = Promise.all([
      loadResource(
        'membership plans',
        apiGet('/memberships/plans?page=1&pageSize=20', plansResponseSchema),
      ),
      loadResource('machines', apiGet('/machines?page=1&pageSize=6', machinesResponseSchema)),
      loadResource('trainers', apiGet('/trainers?page=1&pageSize=3', trainersResponseSchema)),
      loadResource('sponsors', apiGet('/sponsors?page=1&pageSize=12', sponsorsResponseSchema)),
      loadResource('gym settings', apiGet('/content/settings', settingsResponseSchema)),
    ]);
    void requests.then(
      ([planResult, machineResult, trainerResult, sponsorResult, settingsResult]) => {
        if (!active) return;
        setPlans(planResult.value?.data ?? []);
        setPlanCount(planResult.value?.pagination?.total ?? planResult.value?.data.length ?? null);
        setMachines(machineResult.value?.data ?? []);
        setMachineCount(
          machineResult.value?.pagination?.total ?? machineResult.value?.data.length ?? null,
        );
        setTrainers(trainerResult.value?.data ?? []);
        setTrainerCount(
          trainerResult.value?.pagination?.total ?? trainerResult.value?.data.length ?? null,
        );
        setSponsors(sponsorResult.value?.data ?? []);
        setSettings(settingsResult.value ?? []);
        setResourceErrors({
          plans: planResult.error,
          machines: machineResult.error,
          trainers: trainerResult.error,
          sponsors: sponsorResult.error,
          settings: settingsResult.error,
        });
        setDataLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !motionEnabled) return;
    let destroy: (() => void) | undefined;
    let cancelled = false;
    void import('@/lib/home-motion')
      .then(({ initializeHomeMotion }) => {
        if (!cancelled) destroy = initializeHomeMotion(root);
      })
      .catch((error: unknown) => {
        console.error('Unable to initialize home animations.', error);
      });
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [motionEnabled]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-platform-step]'));
    if (!steps.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
        const step = current?.target.getAttribute('data-platform-step');
        if (step !== null && step !== undefined) setActiveStep(Number(step));
      },
      { threshold: [0.25, 0.55, 0.8] },
    );
    steps.forEach((step) => observer.observe(step));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (sponsors.length === 0) return;
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-sponsor-id]'));
    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const sponsorId = (entry.target as HTMLElement).dataset.sponsorId;
          if (!sponsorId || seen.has(sponsorId)) return;
          seen.add(sponsorId);
          void apiPostParsed(`/sponsors/${sponsorId}/impressions`, {}, z.unknown()).catch(
            (error: unknown) => {
              console.error(
                'Unable to record sponsor impression.',
                error instanceof ApiError ? error.status : 'invalid response or network error',
              );
              setTrackingError(true);
            },
          );
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.5 },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [sponsors]);

  const openingHours = useMemo(() => {
    const value = settings.find((setting) => setting.key === 'opening_hours')?.value;
    return value ? localizedSeedCopy(value, locale) : undefined;
  }, [settings, locale]);
  const displayOpeningHours =
    isDevelopment || !openingHours?.startsWith('DEMO ·') ? openingHours : undefined;
  const visibleSponsors = sponsors.filter(
    (sponsor) => isDevelopment || !sponsor.websiteUrl?.includes('example.com'),
  );
  const oneMonthPrice = plans.find((plan) => plan.durationMonths === 1)?.priceMkd;
  const bestValuePlan = plans.reduce<Plan | undefined>(
    (best, plan) =>
      !best ||
      getMonthlyPrice(plan.priceMkd, plan.durationMonths) <
        getMonthlyPrice(best.priceMkd, best.durationMonths)
        ? plan
        : best,
    undefined,
  );
  const statementWords = t('statement').split(/\s+/);

  async function submitTrialRequest(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setTrialError('');
    setTrialSuccess(false);
    const form = trialFormRef.current;
    if (!form) return;
    const formData = new FormData(form);
    const input = trialRequestSchema.safeParse({
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone') || undefined,
      preferredDate: formData.get('preferredDate') || undefined,
    });
    if (!input.success) {
      setTrialError(t('trialValidation'));
      return;
    }

    setTrialBusy(true);
    try {
      await apiPostParsed('/content/trial-requests', input.data, trialRequestResponseSchema);
      form.reset();
      setTrialSuccess(true);
    } catch (error) {
      if (error instanceof ApiError || error instanceof z.ZodError || error instanceof TypeError) {
        console.error(
          'The free-trial request could not be submitted.',
          error instanceof ApiError ? error.status : 'invalid response or network error',
        );
      } else {
        console.error(
          'Unexpected free-trial request error.',
          error instanceof Error ? error.name : 'unknown error',
        );
      }
      setTrialError(t('trialError'));
    } finally {
      setTrialBusy(false);
    }
  }

  function trackOfferClick(offerId: string): void {
    void apiPostParsed(`/sponsors/offers/${offerId}/click`, {}, z.unknown()).catch(
      (error: unknown) => {
        console.error(
          'Unable to record sponsor offer click.',
          error instanceof ApiError ? error.status : 'invalid response or network error',
        );
        setTrackingError(true);
      },
    );
  }

  return (
    <main className="home-page" ref={rootRef}>
      <section aria-labelledby="hero-heading" className="home-hero" id="top">
        <div className="hero-media">
          <GymImage
            available={imageAvailability.hero}
            className="hero-media__image"
            locale={locale}
            priority
            sizes="100vw"
            slot="hero"
          />
          {heroVideoEnabled && (
            <video
              aria-hidden="true"
              autoPlay
              className="hero-media__video"
              loop
              muted
              playsInline
              poster="/images/hero.jpg"
              preload="metadata"
            >
              <source src="/video/hero.mp4" type="video/mp4" />
            </video>
          )}
        </div>
        <div aria-hidden="true" className="hero-shade" />
        <div className="page-width hero-content">
          <div className="hero-copy">
            <p className="eyebrow hero-eyebrow">
              <span />
              {t('heroEyebrow')}
            </p>
            <h1 className="display-font hero-title" id="hero-heading">
              <span className="hero-title-line">
                {t('heroLineOne')
                  .split(/\s+/)
                  .map((word, index) => (
                    <span className="hero-title-word" key={`${index}-${word}`}>
                      {word}
                    </span>
                  ))}
              </span>
              <br />
              <span className="hero-title-line hero-title-line--accent">
                {t('heroLineTwo')
                  .split(/\s+/)
                  .map((word, index) => (
                    <span className="hero-title-word" key={`${index}-${word}`}>
                      {word}
                    </span>
                  ))}
              </span>
            </h1>
            <p className="hero-subtitle">{t('heroSubtitle')}</p>
            <div className="hero-actions">
              <Button asChild size="lg">
                <a data-magnetic href="#trial">
                  {t('bookTrial')}
                  <ArrowUpRight aria-hidden="true" size={17} />
                </a>
              </Button>
              <a className="button-secondary" href="#statement">
                {t('exploreGym')}
                <ArrowDown aria-hidden="true" size={16} />
              </a>
            </div>
            <div className="hero-trust">
              <div>
                <span className="trust-label">{t('openingHours')}</span>
                <strong>
                  {displayOpeningHours ??
                    (dataLoading && !resourceErrors.settings
                      ? t('loadingValue')
                      : t('notAvailable'))}
                </strong>
                {isDevelopment && openingHours?.startsWith('DEMO ·') && (
                  <span className="dev-placeholder-badge">{t('placeholderBadge')}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <a aria-label={t('scrollDown')} className="hero-scroll" href="#statement">
          <span>{t('scrollDown')}</span>
          <ArrowDown aria-hidden="true" size={17} />
        </a>
      </section>

      <section
        aria-labelledby="statement-heading"
        className="home-statement page-width"
        id="statement"
      >
        <p className="eyebrow">{t('statementEyebrow')}</p>
        <h2 className="statement-copy" id="statement-heading" aria-label={t('statement')}>
          {statementWords.map((word, index) => (
            <span aria-hidden="true" className="statement-word" key={`${index}-${word}`}>
              {word}{' '}
            </span>
          ))}
        </h2>
      </section>

      <section aria-label={t('statsLabel')} className="home-stats page-width">
        <Metric label={t('statPlans')} loaded={planCount !== null} value={planCount ?? 0} />
        <Metric
          label={t('statMachines')}
          loaded={machineCount !== null}
          value={machineCount ?? 0}
        />
        <Metric label={t('statCoaches')} loaded={trainerCount !== null} value={trainerCount ?? 0} />
        <Metric label={t('statZones')} loaded value={6} />
      </section>

      <section aria-labelledby="pillars-title" className="home-section page-width">
        <div className="section-intro">
          <p className="eyebrow">{t('pillarsEyebrow')}</p>
          <h2 className="display-font section-title" id="pillars-title">
            {t('pillarsTitle')}
          </h2>
        </div>
        <div className="pillars-grid">
          {[
            { icon: Dumbbell, title: t('pillarEquipmentTitle'), copy: t('pillarEquipmentCopy') },
            { icon: ShieldCheck, title: t('pillarCoachesTitle'), copy: t('pillarCoachesCopy') },
            { icon: UsersRound, title: t('pillarCommunityTitle'), copy: t('pillarCommunityCopy') },
            { icon: Sparkles, title: t('pillarTechnologyTitle'), copy: t('pillarTechnologyCopy') },
          ].map(({ icon: Icon, title, copy }, index) => (
            <article className="pillar-card" key={title}>
              <span className="pillar-index">0{index + 1}</span>
              <Icon aria-hidden="true" className="pillar-icon" size={25} strokeWidth={1.5} />
              <h3 className="display-font">{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="zones-title" className="zones-gallery" id="zones">
        <div className="page-width section-intro zones-heading">
          <p className="eyebrow">{t('zonesEyebrow')}</p>
          <h2 className="display-font section-title" id="zones-title">
            {t('zonesTitle')}
          </h2>
          <p className="section-description">{t('zonesDescription')}</p>
        </div>
        <div className="zones-track">
          {[
            {
              slot: 'free-weights' as const,
              title: t('zoneFreeTitle'),
              description: t('zoneFreeCopy'),
              list: t('zoneFreeList'),
            },
            {
              slot: 'machines' as const,
              title: t('zoneMachinesTitle'),
              description: t('zoneMachinesCopy'),
              list: t('zoneMachinesList'),
            },
            {
              slot: 'cardio' as const,
              title: t('zoneCardioTitle'),
              description: t('zoneCardioCopy'),
              list: t('zoneCardioList'),
            },
            {
              slot: 'functional' as const,
              title: t('zoneFunctionalTitle'),
              description: t('zoneFunctionalCopy'),
              list: t('zoneFunctionalList'),
            },
            {
              slot: 'group-class' as const,
              title: t('zoneGroupTitle'),
              description: t('zoneGroupCopy'),
              list: t('zoneGroupList'),
            },
            {
              slot: 'recovery' as const,
              title: t('zoneRecoveryTitle'),
              description: t('zoneRecoveryCopy'),
              list: t('zoneRecoveryList'),
            },
          ].map((zone, index) => (
            <article className="zone-card" key={zone.slot}>
              <GymImage
                available={imageAvailability[zone.slot]}
                className="zone-card__image"
                locale={locale}
                slot={zone.slot}
                sizes="(max-width: 900px) 84vw, 42vw"
              />
              <div className="zone-card__overlay" />
              <div className="zone-card__content">
                <span className="zone-card__number">0{index + 1} / 06</span>
                <h3 className="display-font">{zone.title}</h3>
                <p>{zone.description}</p>
                <span className="zone-card__find-label">{t('whatToFind')}</span>
                <p className="zone-card__list">{zone.list}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="page-width zones-instruction">
          {t('zonesScrollHint')}
          <ArrowRight aria-hidden="true" size={16} />
        </div>
      </section>

      <section aria-labelledby="platform-title" className="platform-story page-width">
        <div className="platform-copy">
          <p className="eyebrow">{t('platformEyebrow')}</p>
          <h2 className="display-font section-title" id="platform-title">
            {t('platformTitle')}
          </h2>
          <p className="section-description">{t('platformDescription')}</p>
          <div className="platform-steps">
            {[0, 1, 2, 3].map((step) => (
              <article
                aria-current={activeStep === step ? 'step' : undefined}
                className={`platform-step${activeStep === step ? ' is-active' : ''}`}
                data-platform-step={step}
                key={step}
              >
                <span className="platform-step__number">0{step + 1}</span>
                <div>
                  <h3>{t(`platformStep${step + 1}Title` as 'platformStep1Title')}</h3>
                  <p>{t(`platformStep${step + 1}Copy` as 'platformStep1Copy')}</p>
                  <Link
                    href={
                      ['/#membership', '/register', '/member/machines', '/register'][step] as Route
                    }
                  >
                    {t('platformStepLink')}
                    <ArrowUpRight aria-hidden="true" size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div aria-label={t('platformVisualLabel')} className="platform-visual" role="img">
          <div className="platform-mockup">
            <div className="platform-mockup__camera" />
            <MockupScreen step={activeStep} />
            <span className="platform-mockup__glow" />
          </div>
          <p className="platform-visual__caption">
            {t(`platformStep${activeStep + 1}Title` as 'platformStep1Title')}
          </p>
        </div>
      </section>

      <section aria-labelledby="machines-title" className="home-section page-width">
        <div className="section-intro section-intro--row">
          <div>
            <p className="eyebrow">{t('machinesEyebrow')}</p>
            <h2 className="display-font section-title" id="machines-title">
              {t('machinesTitle')}
            </h2>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link className="text-link" href="/member/machines">
              {t('machineLibraryLink')}
              <ArrowUpRight aria-hidden="true" size={16} />
            </Link>
            <Link className="text-link" href="/member/workouts">
              {t('workoutsLink')}
              <ArrowUpRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </div>
        {resourceErrors.machines ? (
          <p className="data-message" role="status">
            {t('machinesUnavailable')}
          </p>
        ) : dataLoading ? (
          <p className="data-message" role="status">
            {t('loadingValue')}
          </p>
        ) : machines.length === 0 ? (
          <p className="data-message" role="status">
            {t('machinesEmpty')}
          </p>
        ) : (
          <div className="machines-grid">
            {machines.slice(0, 6).map((machine) => {
              const imageSlot = machineImageSlot(machine.category);
              return (
                <article className="machine-card" key={machine.id}>
                  <div className="machine-card__visual">
                    <GymImage
                      available={imageAvailability[imageSlot]}
                      className="machine-card__image"
                      locale={locale}
                      sizes="(max-width: 768px) 100vw, 33vw"
                      slot={imageSlot}
                    />
                    <span aria-hidden="true" className="machine-card__shade" />
                    <Dumbbell
                      aria-hidden="true"
                      className="machine-card__icon"
                      size={62}
                      strokeWidth={1}
                    />
                    <span>{t('machineGuide')}</span>
                  </div>
                  <div className="machine-card__body">
                    <p className="eyebrow">{categoryText(machine.category, t)}</p>
                    <h3>{machine.name}</h3>
                    <Link
                      aria-label={`${t('machineLibraryLink')}: ${machine.name}`}
                      href={`/member/machines/${encodeURIComponent(machine.slug)}`}
                    >
                      {t('learnMachine')}
                      <ArrowUpRight aria-hidden="true" size={15} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section
        aria-labelledby="trainers-title"
        className="home-section trainers-section"
        id="trainers"
      >
        <div className="page-width">
          <div className="section-intro section-intro--row">
            <div>
              <p className="eyebrow">{t('trainersEyebrow')}</p>
              <h2 className="display-font section-title" id="trainers-title">
                {t('trainersTitle')}
              </h2>
            </div>
            <p className="section-description">{t('trainersDescription')}</p>
          </div>
          {resourceErrors.trainers ? (
            <p className="data-message" role="status">
              {t('trainersUnavailable')}
            </p>
          ) : dataLoading ? (
            <p className="data-message" role="status">
              {t('loadingValue')}
            </p>
          ) : trainers.length === 0 ? (
            <p className="data-message" role="status">
              {t('trainersEmpty')}
            </p>
          ) : (
            <div className="trainers-grid">
              {trainers.slice(0, 3).map((trainer) => (
                <article className="trainer-card" key={trainer.id}>
                  <TrainerPortrait
                    alt={t('trainerPortraitAlt', { name: trainer.name ?? t('trainerNamePending') })}
                    photoUrl={trainer.photoUrl}
                  />
                  <div className="trainer-card__info">
                    <h3 className="display-font">{trainer.name ?? t('trainerNamePending')}</h3>
                    <p>
                      {trainer.specialties.length
                        ? [
                            ...new Set(
                              trainer.specialties.map((specialty) =>
                                trainerSpecialtyCopy(specialty, locale),
                              ),
                            ),
                          ].join(' · ')
                        : t('trainerSpecialtyPending')}
                    </p>
                    <p className="trainer-card__bio">
                      {trainer.bio ? trainerCopy(trainer.bio, locale) : t('trainerBioPending')}
                    </p>
                    <Link
                      className="text-link"
                      href={`/trainers/${encodeURIComponent(trainer.id)}`}
                    >
                      {t('viewTrainer')}
                      <ArrowUpRight aria-hidden="true" size={15} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="week-title" className="home-section page-width first-week">
        <div className="first-week__intro">
          <p className="eyebrow">{t('weekEyebrow')}</p>
          <h2 className="display-font section-title" id="week-title">
            {t('weekTitle')}
          </h2>
          <p className="section-description">{t('weekDescription')}</p>
        </div>
        <ol className="week-timeline">
          {[1, 2, 3, 4, 5].map((step) => (
            <li key={step}>
              <span className="week-timeline__number">0{step}</span>
              <div>
                <h3>{t(`weekStep${step}Title` as 'weekStep1Title')}</h3>
                <p>{t(`weekStep${step}Copy` as 'weekStep1Copy')}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="community-title" className="community-section">
        <div className="page-width community-layout">
          <div className="community-photo">
            <GymImage
              available={imageAvailability.community}
              className="image-reveal"
              locale={locale}
              slot="community"
              sizes="(max-width: 900px) 100vw, 50vw"
            />
            <div className="community-photo__caption">
              <UsersRound aria-hidden="true" />
              <span>{t('communityPhotoCaption')}</span>
            </div>
          </div>
          <div className="community-copy">
            <p className="eyebrow">{t('communityEyebrow')}</p>
            <h2 className="display-font section-title" id="community-title">
              {t('communityTitle')}
            </h2>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="membership-title"
        className="home-section page-width pricing-section"
        id="membership"
      >
        <div className="section-intro">
          <p className="eyebrow">{t('pricingEyebrow')}</p>
          <h2 className="display-font section-title" id="membership-title">
            {t('pricingTitle')}
          </h2>
          <p className="section-description">{t('pricingDescription')}</p>
        </div>
        {dataLoading ? (
          <p className="data-message" role="status">
            {t('loadingValue')}
          </p>
        ) : resourceErrors.plans ? (
          <p className="data-message" role="status">
            {t('plansUnavailable')}
          </p>
        ) : plans.length === 0 ? (
          <p className="data-message" role="status">
            {t('plansEmpty')}
          </p>
        ) : (
          <div className="plans-grid">
            {plans
              .slice()
              .sort((first, second) => first.durationMonths - second.durationMonths)
              .map((plan) => {
                const savings = oneMonthPrice
                  ? getSavingsPercentage(plan.priceMkd, plan.durationMonths, oneMonthPrice)
                  : 0;
                const isBestValue = plan.id === bestValuePlan?.id;
                return (
                  <article
                    className={`plan-card${isBestValue ? ' plan-card--best' : ''}`}
                    key={plan.id}
                  >
                    {isBestValue && <span className="plan-card__best">{t('bestValue')}</span>}
                    {savings > 0 && (
                      <span className="plan-card__saving">
                        {t('savePercent', { percent: savings })}
                      </span>
                    )}
                    <p className="plan-card__duration">{durationText(plan.durationMonths, t)}</p>
                    <h3 className="display-font">
                      {t('planName', { duration: durationText(plan.durationMonths, t) })}
                    </h3>
                    <p className="plan-card__price display-font">
                      {new Intl.NumberFormat(locale === 'mk' ? 'mk-MK' : 'en-GB').format(
                        plan.priceMkd,
                      )}
                      <span>MKD</span>
                    </p>
                    <p className="plan-card__monthly">
                      {t('perMonth', {
                        price: new Intl.NumberFormat(locale === 'mk' ? 'mk-MK' : 'en-GB', {
                          maximumFractionDigits: 2,
                        }).format(getMonthlyPrice(plan.priceMkd, plan.durationMonths)),
                      })}
                    </p>
                    <ul className="plan-features">
                      {[t('featureAccess'), t('featureOnline'), t('featureSupport')].map(
                        (feature) => (
                          <li key={feature}>
                            <Check aria-hidden="true" size={15} />
                            {feature}
                          </li>
                        ),
                      )}
                    </ul>
                    <Link
                      className={isBestValue ? 'plan-cta plan-cta--primary' : 'plan-cta'}
                      href="/register"
                    >
                      {t('choosePlan')}
                      <ArrowUpRight aria-hidden="true" size={16} />
                    </Link>
                  </article>
                );
              })}
          </div>
        )}
        <p className="pricing-note">
          <ShieldCheck aria-hidden="true" size={17} />
          {t('freeTrialNote')}
        </p>
      </section>

      <section aria-labelledby="sponsors-title" className="sponsors-section">
        <div className="page-width">
          <div className="sponsors-heading">
            <p className="eyebrow">{t('sponsorsEyebrow')}</p>
            <h2 className="display-font section-title" id="sponsors-title">
              {t('sponsorsTitle')}
            </h2>
          </div>
          {dataLoading ? (
            <p className="data-message" role="status">
              {t('loadingValue')}
            </p>
          ) : resourceErrors.sponsors ? (
            <p className="data-message" role="status">
              {t('sponsorsUnavailable')}
            </p>
          ) : visibleSponsors.length === 0 ? (
            <p className="data-message" role="status">
              {t('sponsorsEmpty')}
            </p>
          ) : (
            <div aria-label={t('sponsorsTitle')} className="sponsor-marquee">
              <div className="sponsor-track">
                {[...visibleSponsors, ...visibleSponsors].map((sponsor, index) => (
                  <article
                    className="sponsor-item"
                    data-sponsor-id={index < visibleSponsors.length ? sponsor.id : undefined}
                    key={`${sponsor.id}-${index}`}
                  >
                    {isDevelopment && sponsor.websiteUrl?.includes('example.com') && (
                      <span className="dev-placeholder-badge">{t('placeholderBadge')}</span>
                    )}
                    {sponsor.logoUrl ? (
                      <span className="sponsor-item__logo">{sponsor.companyName}</span>
                    ) : (
                      <span className="display-font sponsor-item__name">{sponsor.companyName}</span>
                    )}
                    {sponsor.offers.slice(0, 1).map((offer) =>
                      sponsor.websiteUrl ? (
                        <a
                          className="sponsor-item__offer"
                          href={sponsor.websiteUrl}
                          key={offer.id}
                          onClick={() => trackOfferClick(offer.id)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {offer.title}
                          <MoveUpRight aria-hidden="true" size={13} />
                        </a>
                      ) : (
                        <span className="sponsor-item__offer" key={offer.id}>
                          {offer.title}
                        </span>
                      ),
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}
          {trackingError && (
            <p className="tracking-message" role="status">
              {t('sponsorTrackingError')}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="faq-title" className="home-section page-width faq-section">
        <div className="section-intro">
          <p className="eyebrow">{t('faqEyebrow')}</p>
          <h2 className="display-font section-title" id="faq-title">
            {t('faqTitle')}
          </h2>
        </div>
        <div className="faq-list">
          {[1, 2, 3, 4, 5].map((item) => (
            <details className="faq-item" key={item}>
              <summary>
                {t(`faqQuestion${item}` as 'faqQuestion1')}
                <ChevronDown aria-hidden="true" size={19} />
              </summary>
              <p>{t(`faqAnswer${item}` as 'faqAnswer1')}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="trial-title" className="trial-cta page-width" id="trial">
        <GymImage
          available={imageAvailability.cta}
          className="trial-cta__image parallax-image"
          locale={locale}
          slot="cta"
          sizes="100vw"
        />
        <div aria-hidden="true" className="trial-cta__shade" />
        <div className="trial-cta__content">
          <div className="trial-cta__copy">
            <p className="eyebrow">{t('trialEyebrow')}</p>
            <h2 className="display-font section-title" id="trial-title">
              {t('trialTitle')}
            </h2>
            <p>{t('trialDescription')}</p>
          </div>
          <form
            className="trial-form"
            onSubmit={(event) => void submitTrialRequest(event)}
            ref={trialFormRef}
          >
            <label htmlFor="trial-name">{t('nameLabel')}</label>
            <Input autoComplete="name" id="trial-name" maxLength={120} name="name" required />
            <label htmlFor="trial-email">{t('emailLabel')}</label>
            <Input
              autoComplete="email"
              id="trial-email"
              maxLength={254}
              name="email"
              required
              type="email"
            />
            <label htmlFor="trial-phone">{t('phoneLabel')}</label>
            <Input autoComplete="tel" id="trial-phone" maxLength={30} name="phone" type="tel" />
            <label htmlFor="trial-date">{t('preferredDateLabel')}</label>
            <Input
              id="trial-date"
              min={new Date().toISOString().slice(0, 10)}
              name="preferredDate"
              type="date"
            />
            {trialError && (
              <p aria-live="assertive" className="form-message form-message--error">
                {trialError}
              </p>
            )}
            {trialSuccess && (
              <p aria-live="polite" className="form-message form-message--success">
                {t('trialSuccess')}
              </p>
            )}
            <Button
              className="trial-form__submit"
              data-magnetic
              disabled={trialBusy}
              size="lg"
              type="submit"
            >
              {trialBusy ? t('trialSending') : t('trialSubmit')}
              <ArrowUpRight aria-hidden="true" size={16} />
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
