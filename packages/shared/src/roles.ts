export const roleValues = ['MEMBER', 'TRAINER', 'ADMIN', 'SPONSOR'] as const;
export type UserRole = (typeof roleValues)[number];

export const membershipPlanPrices = {
  '1 month': 2000,
  '3 months': 5500,
  '6 months': 10000,
  '12 months': 16000,
} as const;
