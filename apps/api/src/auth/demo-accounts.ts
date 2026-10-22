import { Role, SponsorTier } from '@prisma/client';

type DemoAccountBase = {
  email: string;
  displayName: string;
};

export type DemoAccount =
  | (DemoAccountBase & { role: 'ADMIN' | 'MEMBER' })
  | (DemoAccountBase & {
      role: 'TRAINER';
      trainerProfile: {
        bio: string;
        specialties: string[];
      };
    })
  | (DemoAccountBase & {
      role: 'SPONSOR';
      sponsorProfile: {
        companyName: string;
        websiteUrl: string;
        tier: SponsorTier;
      };
    });

export const DEMO_PASSWORD = 'password123';

export const DEMO_ACCOUNTS = [
  {
    email: 'admin@ironpulse.test',
    displayName: 'Ана Стојановска',
    role: Role.ADMIN,
  },
  {
    email: 'member@ironpulse.test',
    displayName: 'Бојан Илиев',
    role: Role.MEMBER,
  },
  {
    email: 'member2@ironpulse.test',
    displayName: 'Елена Димова',
    role: Role.MEMBER,
  },
  {
    email: 'trainer@ironpulse.test',
    displayName: 'Александар Николов',
    role: Role.TRAINER,
    trainerProfile: {
      bio: 'Тренер за сила што ти помага да напредуваш постепено, со добра техника и одржлив план. / Strength coach helping you progress steadily with sound technique and a sustainable plan.',
      specialties: [
        'Силов тренинг / Strength training',
        'Техника и прогресија / Technique and progression',
      ],
    },
  },
  {
    email: 'sponsor@ironpulse.test',
    displayName: 'Весна Илиевска',
    role: Role.SPONSOR,
    sponsorProfile: {
      companyName: 'Vardar Active',
      websiteUrl: 'https://example.com/vardar-active',
      tier: SponsorTier.GOLD,
    },
  },
] satisfies readonly DemoAccount[];
