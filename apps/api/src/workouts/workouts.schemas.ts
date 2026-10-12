import { z } from 'zod';

export const createWorkoutSchema = z.object({
  exerciseId: z.string().min(1),
  performedAt: z.coerce.date().optional(),
  sets: z
    .array(
      z.object({
        reps: z.number().int().min(1).max(100),
        weightKg: z.number().min(0).max(500),
      }),
    )
    .min(1)
    .max(20),
});

export const workoutLocaleSchema = z.enum(['mk', 'en']).default('mk');
export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
