import { nutritionQuestionnaireSchema, nutritionPlanSchema } from '@ironpulse/shared';
import { z } from 'zod';

export { nutritionQuestionnaireSchema, nutritionPlanSchema };

export const updateNutritionPlanSchema = z.object({
  plan: nutritionPlanSchema,
});

export type NutritionQuestionnaireInput = z.infer<typeof nutritionQuestionnaireSchema>;
export type UpdateNutritionPlanInput = z.infer<typeof updateNutritionPlanSchema>;
