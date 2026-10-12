import { MachineCategory } from '@prisma/client';
import { z } from 'zod';

const muscleSchema = z.object({
  muscleGroup: z.string().trim().min(1).max(80),
  primary: z.boolean().default(false),
});

export const machineSchema = z.object({
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  nameMk: z.string().trim().min(1).max(160),
  nameEn: z.string().trim().min(1).max(160),
  category: z.nativeEnum(MachineCategory),
  descriptionMk: z.string().trim().max(2000).optional(),
  descriptionEn: z.string().trim().max(2000).optional(),
  difficulty: z.number().int().min(1).max(5).default(1),
  animationKey: z.string().trim().max(100).optional(),
  imageUrl: z.string().url().max(2048).optional(),
  isPublic: z.boolean().default(true),
  muscles: z.array(muscleSchema).max(20).default([]),
});

export const updateMachineSchema = machineSchema.partial();

const stringArraySchema = z.array(z.string().trim().min(1).max(500)).max(30);

export const exerciseSchema = z.object({
  machineId: z.string().min(1),
  nameMk: z.string().trim().min(1).max(160),
  nameEn: z.string().trim().min(1).max(160),
  stepsMk: stringArraySchema.optional(),
  stepsEn: stringArraySchema.optional(),
  commonMistakesMk: stringArraySchema.optional(),
  commonMistakesEn: stringArraySchema.optional(),
  safetyTipsMk: stringArraySchema.optional(),
  safetyTipsEn: stringArraySchema.optional(),
  recommendedSets: z.number().int().min(1).max(20).optional(),
  recommendedReps: z.number().int().min(1).max(100).optional(),
  videoId: z.string().regex(/^[a-zA-Z0-9_-]{11}$/).optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
});

export const updateExerciseSchema = exerciseSchema.partial();
export const machineCategorySchema = z.nativeEnum(MachineCategory);
export const localeSchema = z.enum(['mk', 'en']).default('mk');
export const machineSearchSchema = z.string().trim().max(120);

export type MachineInput = z.infer<typeof machineSchema>;
export type ExerciseInput = z.infer<typeof exerciseSchema>;
