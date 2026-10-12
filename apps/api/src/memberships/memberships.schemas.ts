import { z } from 'zod';

export const membershipRequestSchema = z.object({
  planId: z.string().min(1).max(100),
});

export const membershipPlanSchema = z.object({
  name: z.string().trim().min(1).max(100),
  durationMonths: z.number().int().min(1).max(60),
  priceMkd: z.number().int().min(0).max(10_000_000),
  isActive: z.boolean().optional(),
});

export const updateMembershipPlanSchema = membershipPlanSchema.partial();
