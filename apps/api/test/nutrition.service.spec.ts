import { NutritionPlan, nutritionPlanSchema } from '@ironpulse/shared';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  AiProvider,
  FallbackNutritionProvider,
  NutritionGenerationContext,
} from '../src/nutrition/nutrition-ai.provider';
import {
  calculateNutritionTargets,
  NutritionService,
} from '../src/nutrition/nutrition.service';

const questionnaire: NutritionGenerationContext['questionnaire'] = {
  age: 30,
  sex: 'FEMALE',
  heightCm: 165,
  weightKg: 65,
  goal: 'lose',
  activityLevel: 'moderate',
  mealsPerDay: 3,
  dietType: 'vegetarian',
  allergies: ['peanuts'],
  dislikedFoods: [],
  trainingDaysPerWeek: 4,
};

const fallbackDocument: NutritionPlan = {
  days: Array.from({ length: 7 }, (_, index) => ({
    day: index + 1,
    meals: [
      {
        name: 'Lentil bowl',
        ingredients: ['lentils', 'rice'],
        instructions: ['Cook until tender.'],
        calories: 500,
        proteinG: 30,
        carbsG: 60,
        fatG: 10,
      },
    ],
  })),
};

describe('nutrition calculation and generation', () => {
  it('calculates Mifflin-St Jeor BMR, activity-adjusted TDEE, and goal macros', () => {
    const targets = calculateNutritionTargets(questionnaire);
    expect(targets).toEqual({
      bmr: 1370,
      tdee: 2124,
      targetCalories: 1624,
      macros: { calories: 1624, proteinG: 117, carbsG: 172, fatG: 52 },
    });
  });

  it('validates a seven-day meal plan and rejects incomplete plans', () => {
    expect(nutritionPlanSchema.safeParse(fallbackDocument).success).toBe(true);
    expect(
      nutritionPlanSchema.safeParse({ days: fallbackDocument.days.slice(0, 6) }).success,
    ).toBe(false);
  });

  it('uses the deterministic fallback when a mocked AI provider returns invalid JSON', async () => {
    const aiProvider: AiProvider = {
      generate: jest.fn().mockResolvedValue('not json'),
    };
    const fallbackProvider: AiProvider = {
      generate: jest.fn().mockResolvedValue(JSON.stringify(fallbackDocument)),
    };
    const questionnaireRow = { id: 'questionnaire-id' };
    const savedPlan = {
      id: 'plan-id',
      memberId: 'member-id',
      source: 'FALLBACK',
      status: 'DRAFT',
      planJson: fallbackDocument,
    };
    const prismaMock = {
      nutritionPlan: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(async (operation: (transaction: unknown) => Promise<unknown>) =>
        operation({
          nutritionGenerationQuota: { create: jest.fn() },
          nutritionQuestionnaire: {
            create: jest.fn().mockResolvedValue(questionnaireRow),
          },
          nutritionPlan: {
            create: jest.fn().mockResolvedValue(savedPlan),
          },
        }),
      ),
    };
    const auditMock = { record: jest.fn() };
    const service = new NutritionService(
      prismaMock as unknown as PrismaService,
      auditMock as never,
      aiProvider,
      fallbackProvider,
    );

    const result = await service.generate('member-id', questionnaire);

    expect(aiProvider.generate).toHaveBeenCalledTimes(2);
    expect(fallbackProvider.generate).toHaveBeenCalledTimes(1);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(result.source).toBe('FALLBACK');
    expect(result.status).toBe('DRAFT');
    expect(result.disclaimer).toContain('not medical advice');
  });

  it('enforces the single-generation quota after a plan has been deleted', async () => {
    const fallbackProvider: AiProvider = {
      generate: jest.fn().mockResolvedValue(JSON.stringify(fallbackDocument)),
    };
    const prismaMock = {
      $transaction: jest.fn(async (operation: (transaction: unknown) => Promise<unknown>) =>
        operation({
          nutritionGenerationQuota: {
            create: jest.fn().mockRejectedValue({ code: 'P2002' }),
          },
          nutritionQuestionnaire: { create: jest.fn() },
          nutritionPlan: { create: jest.fn() },
        }),
      ),
    };
    const service = new NutritionService(
      prismaMock as unknown as PrismaService,
      {} as never,
      fallbackProvider,
      fallbackProvider,
    );

    await expect(service.generate('member-id', questionnaire)).rejects.toMatchObject({
      status: 429,
    });
  });

  it('builds a deterministic plan that excludes matching allergy and preference terms', async () => {
    const provider = new FallbackNutritionProvider();
    const context: NutritionGenerationContext = {
      questionnaire: { ...questionnaire, allergies: ['dairy'], dislikedFoods: ['lentils'] },
      targets: calculateNutritionTargets(questionnaire),
    };
    const result = nutritionPlanSchema.parse(JSON.parse(await provider.generate(context)));
    expect(result.days).toHaveLength(7);
    expect(result.days[0].meals).toHaveLength(questionnaire.mealsPerDay);
    expect(JSON.stringify(result).toLowerCase()).not.toContain('yogurt');
    expect(JSON.stringify(result).toLowerCase()).not.toContain('lentil');
  });

  it('uses neutral staples when all diet-specific fallback recipes are excluded', async () => {
    const provider = new FallbackNutritionProvider();
    const restricted: NutritionGenerationContext = {
      questionnaire: {
        ...questionnaire,
        allergies: ['dairy', 'eggs', 'legumes', 'gluten', 'soy'],
      },
      targets: calculateNutritionTargets(questionnaire),
    };
    const result = nutritionPlanSchema.parse(JSON.parse(await provider.generate(restricted)));
    const ingredients = JSON.stringify(result).toLowerCase();
    expect(result.days).toHaveLength(7);
    expect(ingredients).not.toContain('lentil');
    expect(ingredients).not.toContain('yogurt');
    expect(ingredients).not.toContain('tofu');
  });
});
