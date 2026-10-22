export const blogCategories = [
  { id: 'training', labelKey: 'categoryTraining' },
  { id: 'nutrition', labelKey: 'categoryNutrition' },
  { id: 'community', labelKey: 'categoryCommunity' },
  { id: 'recovery', labelKey: 'categoryRecovery' },
] as const;

export type BlogCategory = (typeof blogCategories)[number]['id'];

export const blogPosts = [
  {
    slug: 'build-a-strength-routine',
    category: 'training',
    date: '2026-10-15',
    image: '/images/free-weights.jpg',
    titleKey: 'strengthTitle',
    excerptKey: 'strengthExcerpt',
    contentKeys: ['strengthBodyOne', 'strengthBodyTwo', 'strengthBodyThree'],
  },
  {
    slug: 'make-recovery-part-of-training',
    category: 'recovery',
    date: '2026-10-08',
    image: '/images/recovery.jpg',
    titleKey: 'recoveryTitle',
    excerptKey: 'recoveryExcerpt',
    contentKeys: ['recoveryBodyOne', 'recoveryBodyTwo', 'recoveryBodyThree'],
  },
  {
    slug: 'small-steps-and-consistency',
    category: 'community',
    date: '2026-09-29',
    image: '/images/community.jpg',
    titleKey: 'communityTitle',
    excerptKey: 'communityExcerpt',
    contentKeys: ['communityBodyOne', 'communityBodyTwo', 'communityBodyThree'],
  },
] as const;

export type BlogPost = (typeof blogPosts)[number];
