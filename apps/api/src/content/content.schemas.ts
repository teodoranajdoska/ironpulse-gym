import { z } from 'zod';

export const localeSchema = z.enum(['mk', 'en']).default('mk');

export const gymRuleSchema = z.object({
  orderIndex: z.number().int().min(0),
  titleMk: z.string().trim().min(1).max(160),
  titleEn: z.string().trim().min(1).max(160),
  bodyMk: z.string().trim().min(1).max(2000),
  bodyEn: z.string().trim().min(1).max(2000),
  icon: z.string().trim().max(80).nullable().optional(),
});

export const updateGymRuleSchema = gymRuleSchema.partial();

export const gymSettingSchema = z.object({
  key: z.enum(['opening_hours', 'address', 'phone', 'email']),
  value: z.string().trim().min(1).max(500),
});

export const trialRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).optional(),
  preferredDate: z.coerce.date().optional(),
});

export const trialStatusSchema = z.enum(['NEW', 'CONTACTED', 'CONVERTED']);
