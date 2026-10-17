export type ImageSlot =
  | 'hero'
  | 'free-weights'
  | 'machines'
  | 'cardio'
  | 'functional'
  | 'group-class'
  | 'recovery'
  | 'personal-training'
  | 'trainer-1'
  | 'trainer-2'
  | 'trainer-3'
  | 'community'
  | 'nutrition'
  | 'cta';

type ImageEntry = {
  file: string;
  alt: { mk: string; en: string };
  aspectRatio: string;
  objectPosition: string;
};

export const imageManifest = {
  hero: {
    file: 'hero.jpg',
    alt: {
      mk: 'Атлет тренира во современа, затемнета теретана',
      en: 'Athlete training in a modern, low-lit gym',
    },
    aspectRatio: '16 / 9',
    objectPosition: '50% 48%',
  },
  'free-weights': {
    file: 'free-weights.jpg',
    alt: {
      mk: 'Слободни тегови во зоната за силов тренинг',
      en: 'Free weights in the strength training zone',
    },
    aspectRatio: '4 / 3',
    objectPosition: '50% 50%',
  },
  machines: {
    file: 'machines.jpg',
    alt: {
      mk: 'Современи справи за тренинг',
      en: 'Modern strength training machines',
    },
    aspectRatio: '4 / 3',
    objectPosition: '50% 50%',
  },
  cardio: {
    file: 'cardio.jpg',
    alt: {
      mk: 'Кардио зона со опрема за издржливост',
      en: 'Cardio area with endurance equipment',
    },
    aspectRatio: '4 / 3',
    objectPosition: '50% 50%',
  },
  functional: {
    file: 'functional.jpg',
    alt: {
      mk: 'Функционална зона за движење и кондиција',
      en: 'Functional training area for movement and conditioning',
    },
    aspectRatio: '4 / 3',
    objectPosition: '50% 50%',
  },
  'group-class': {
    file: 'group-class.jpg',
    alt: {
      mk: 'Групен тренинг предводен од тренер',
      en: 'Coach-led group training session',
    },
    aspectRatio: '4 / 3',
    objectPosition: '50% 50%',
  },
  recovery: {
    file: 'recovery.jpg',
    alt: {
      mk: 'Мирен простор за одмор и опоравување',
      en: 'Quiet space for rest and recovery',
    },
    aspectRatio: '4 / 3',
    objectPosition: '50% 50%',
  },
  'personal-training': {
    file: 'personal-training.jpg',
    alt: {
      mk: 'Тренер му помага на член со техника на вежбање',
      en: 'Coach helping a member with exercise technique',
    },
    aspectRatio: '4 / 3',
    objectPosition: '50% 50%',
  },
  'trainer-1': {
    file: 'trainer-1.jpg',
    alt: { mk: 'Портрет на тренер', en: 'Portrait of a trainer' },
    aspectRatio: '4 / 5',
    objectPosition: '50% 35%',
  },
  'trainer-2': {
    file: 'trainer-2.jpg',
    alt: { mk: 'Портрет на тренер', en: 'Portrait of a trainer' },
    aspectRatio: '4 / 5',
    objectPosition: '50% 35%',
  },
  'trainer-3': {
    file: 'trainer-3.jpg',
    alt: { mk: 'Портрет на тренер', en: 'Portrait of a trainer' },
    aspectRatio: '4 / 5',
    objectPosition: '50% 35%',
  },
  community: {
    file: 'community.jpg',
    alt: {
      mk: 'Членови тренираат и се поддржуваат меѓусебно',
      en: 'Members training and supporting one another',
    },
    aspectRatio: '4 / 3',
    objectPosition: '50% 50%',
  },
  nutrition: {
    file: 'nutrition.jpg',
    alt: {
      mk: 'Свеж оброк подготвен за тренинг и опоравување',
      en: 'Fresh meal prepared for training and recovery',
    },
    aspectRatio: '4 / 3',
    objectPosition: '50% 50%',
  },
  cta: {
    file: 'cta.jpg',
    alt: {
      mk: 'Атлет во светлина по тренинг',
      en: 'Athlete in the light after a training session',
    },
    aspectRatio: '16 / 7',
    objectPosition: '50% 48%',
  },
} satisfies Record<ImageSlot, ImageEntry>;
