import { z } from 'zod';

export const sponsorProfileSchema = z.object({
  companyName: z.string().trim().min(2).max(160).optional(),
  logoUrl: z.string().url().nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  tier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
});

export const sponsorCreateSchema = z.object({
  userId: z.string().min(1),
  companyName: z.string().trim().min(2).max(160),
  logoUrl: z.string().url().nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  tier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).default('BRONZE'),
});

export const sponsorOfferSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(1).max(2000),
  discountCode: z.string().trim().min(1).max(80).nullable().optional(),
  validUntil: z.coerce.date().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const sponsorOfferUpdateSchema = sponsorOfferSchema.partial();

export const sponsorStatusSchema = z.object({ isActive: z.boolean() });

export type SponsorProfileInput = z.infer<typeof sponsorProfileSchema>;
export type SponsorCreateInput = z.infer<typeof sponsorCreateSchema>;
export type SponsorOfferInput = z.infer<typeof sponsorOfferSchema>;
export type SponsorOfferUpdateInput = z.infer<typeof sponsorOfferUpdateSchema>;
