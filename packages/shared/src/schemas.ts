import { z } from 'zod';

export const roleEnum = z.enum(['MEMBER', 'TRAINER', 'ADMIN', 'SPONSOR']);

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(120),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const emailSchema = z.object({ email: z.string().email() });
export const emailVerificationSchema = z.object({
  token: z.string().min(1),
});
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});
export const createAccountSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120),
  role: z.enum(['TRAINER', 'SPONSOR']),
});

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: roleEnum,
  name: z.string().nullable().optional(),
});

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: roleEnum,
  profile: z.object({ name: z.string().nullable() }).nullable(),
});
export const authMeResponseSchema = z.object({ user: authUserSchema });
export const csrfResponseSchema = z.object({ csrfToken: z.string().min(1) });
export const messageResponseSchema = z.object({ message: z.string() });

export const nutritionQuestionnaireSchema = z.object({
  age: z.number().int().min(18).max(100),
  sex: z.enum(['MALE', 'FEMALE']),
  heightCm: z.number().min(120).max(250),
  weightKg: z.number().min(35).max(350),
  goal: z.enum(['lose', 'maintain', 'gain']),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'high', 'very_high']),
  mealsPerDay: z.number().int().min(1).max(6),
  dietType: z.enum(['omnivore', 'vegetarian', 'vegan', 'halal']),
  allergies: z.array(z.string().trim().min(1).max(80)).max(30),
  dislikedFoods: z.array(z.string().trim().min(1).max(80)).max(30),
  trainingDaysPerWeek: z.number().int().min(0).max(7),
});

export const nutritionMacroSchema = z.object({
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
});

export const nutritionMealSchema = z.object({
  name: z.string().min(1).max(160),
  ingredients: z.array(z.string().min(1).max(160)).min(1).max(20),
  instructions: z.array(z.string().min(1).max(400)).min(1).max(10),
  ...nutritionMacroSchema.shape,
});

export const nutritionDaySchema = z.object({
  day: z.number().int().min(1).max(7),
  meals: z.array(nutritionMealSchema).min(1).max(6),
});

export const nutritionPlanSchema = z.object({
  days: z.array(nutritionDaySchema).length(7),
});

export const confirmPasswordSchema = z.object({ password: z.string().min(8) });
export const membershipRequestSchema = z.object({ planId: z.string().min(1).max(100) });
export const workoutLogSchema = z.object({
  exerciseId: z.string().min(1),
  performedAt: z.string().datetime().optional(),
  sets: z.array(z.object({
    reps: z.number().int().min(1).max(100),
    weightKg: z.number().min(0).max(500),
  })).min(1).max(20),
});
export const appointmentRequestSchema = z.object({
  trainerId: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
}).refine((appointment) => new Date(appointment.endsAt) > new Date(appointment.startsAt), {
  path: ['endsAt'],
});
export const memberProfileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  birthDate: z.string().date().nullable().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).nullable().optional(),
  heightCm: z.number().int().min(120).max(250).nullable().optional(),
  weightKg: z.number().min(35).max(350).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  locale: z.enum(['mk', 'en']).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>;
export type User = z.infer<typeof userSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type NutritionQuestionnaireInput = z.infer<typeof nutritionQuestionnaireSchema>;
export type NutritionPlan = z.infer<typeof nutritionPlanSchema>;
export type MembershipRequestInput = z.infer<typeof membershipRequestSchema>;
export type WorkoutLogInput = z.infer<typeof workoutLogSchema>;
export type AppointmentRequestInput = z.infer<typeof appointmentRequestSchema>;
export type MemberProfileUpdateInput = z.infer<typeof memberProfileUpdateSchema>;
