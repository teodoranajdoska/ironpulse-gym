import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NutritionPlan, nutritionPlanSchema } from '@ironpulse/shared';
import {
  AI_PROVIDER,
  AiProvider,
  FALLBACK_PROVIDER,
  NutritionGenerationContext,
  NutritionTargets,
} from './nutrition-ai.provider';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { pagination, paginated } from '../common/pagination';
import {
  NutritionQuestionnaireInput,
  nutritionQuestionnaireSchema,
} from './nutrition.schemas';

const ACTIVITY_FACTORS: Record<NutritionQuestionnaireInput['activityLevel'], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9,
};

export const NUTRITION_DISCLAIMER =
  'This meal plan is for general information only and is not medical advice.';

function questionnaireJson(input: NutritionQuestionnaireInput): Prisma.InputJsonObject {
  return {
    age: input.age,
    sex: input.sex,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    goal: input.goal,
    activityLevel: input.activityLevel,
    mealsPerDay: input.mealsPerDay,
    dietType: input.dietType,
    allergies: [...input.allergies],
    dislikedFoods: [...input.dislikedFoods],
    trainingDaysPerWeek: input.trainingDaysPerWeek,
  };
}

function planJson(plan: NutritionPlan): Prisma.InputJsonObject {
  return {
    days: plan.days.map((day) => ({
      day: day.day,
      meals: day.meals.map((meal) => ({
        name: meal.name,
        ingredients: [...meal.ingredients],
        instructions: [...meal.instructions],
        calories: meal.calories,
        proteinG: meal.proteinG,
        carbsG: meal.carbsG,
        fatG: meal.fatG,
      })),
    })),
  };
}

export function calculateNutritionTargets(
  input: NutritionQuestionnaireInput,
): NutritionTargets {
  const bmr = Math.round(
    10 * input.weightKg +
      6.25 * input.heightCm -
      5 * input.age +
      (input.sex === 'MALE' ? 5 : -161),
  );
  const tdee = Math.round(bmr * ACTIVITY_FACTORS[input.activityLevel]);
  const targetCalories = Math.max(
    1000,
    tdee + (input.goal === 'lose' ? -500 : input.goal === 'gain' ? 300 : 0),
  );
  const proteinG = Math.round(input.weightKg * 1.8);
  const fatG = Math.round(input.weightKg * 0.8);
  const carbsG = Math.max(0, Math.round((targetCalories - proteinG * 4 - fatG * 9) / 4));
  return {
    bmr,
    tdee,
    targetCalories,
    macros: { calories: targetCalories, proteinG, carbsG, fatG },
  };
}

@Injectable()
export class NutritionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    @Inject(FALLBACK_PROVIDER) private readonly fallbackProvider: AiProvider,
  ) {}

  async generate(memberId: string, input: NutritionQuestionnaireInput) {
    const validInput = nutritionQuestionnaireSchema.parse(input);
    const targets = calculateNutritionTargets(validInput);
    const context: NutritionGenerationContext = { questionnaire: validInput, targets };
    const { plan, source } = await this.createPlan(context);
    const today = new Date();
    const generationDay = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    )
      .toISOString()
      .slice(0, 10);
    try {
      const saved = await this.prisma.$transaction(async (transaction) => {
        await transaction.nutritionGenerationQuota.create({
          data: { memberId, generationDay },
        });
        const questionnaire = await transaction.nutritionQuestionnaire.create({
          data: {
            memberId,
            answers: questionnaireJson(validInput),
            computedBmr: targets.bmr,
            computedTdee: targets.tdee,
            targetCalories: targets.targetCalories,
            macros: targets.macros,
          },
        });
        return transaction.nutritionPlan.create({
          data: {
            memberId,
            questionnaireId: questionnaire.id,
            planJson: planJson(plan),
            source,
            status: 'DRAFT',
            generationDay,
          },
        });
      });
      return { ...saved, disclaimer: NUTRITION_DISCLAIMER };
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new HttpException(
          'Only one nutrition plan can be generated per UTC day.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw error;
    }
  }

  async listOwn(memberId: string, input: { page?: string; pageSize?: string }) {
    const page = pagination(input);
    const where = { memberId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.nutritionPlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.nutritionPlan.count({ where }),
    ]);
    return {
      ...paginated(data, total, page.page, page.pageSize),
      disclaimer: NUTRITION_DISCLAIMER,
    };
  }

  async getOwn(memberId: string, planId: string) {
    const plan = await this.prisma.nutritionPlan.findFirst({
      where: { id: planId, memberId },
      include: { questionnaire: true },
    });
    if (!plan) throw new NotFoundException('Nutrition plan not found.');
    return { ...plan, disclaimer: NUTRITION_DISCLAIMER };
  }

  async regenerate(memberId: string, planId: string) {
    const existing = await this.prisma.nutritionPlan.findFirst({
      where: { id: planId, memberId },
      include: { questionnaire: true },
    });
    if (!existing?.questionnaire) throw new NotFoundException('Nutrition plan not found.');
    const input = nutritionQuestionnaireSchema.parse(existing.questionnaire.answers);
    return this.generate(memberId, input);
  }

  async deleteOwn(memberId: string, planId: string) {
    const result = await this.prisma.nutritionPlan.deleteMany({
      where: { id: planId, memberId },
    });
    if (result.count !== 1) throw new NotFoundException('Nutrition plan not found.');
    return { id: planId };
  }

  async listClientPlans(trainerId: string, memberId: string, input: { page?: string; pageSize?: string }) {
    await this.assertTrainerClient(trainerId, memberId);
    const page = pagination(input);
    const where = { memberId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.nutritionPlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.nutritionPlan.count({ where }),
    ]);
    return {
      ...paginated(data, total, page.page, page.pageSize),
      disclaimer: NUTRITION_DISCLAIMER,
    };
  }

  async editClientPlan(trainerId: string, memberId: string, planId: string, planInput: NutritionPlan) {
    await this.assertTrainerClient(trainerId, memberId);
    const plan = nutritionPlanSchema.parse(planInput);
    const updated = await this.prisma.nutritionPlan.updateMany({
      where: { id: planId, memberId },
      data: {
        planJson: planJson(plan),
        source: 'TRAINER',
        status: 'DRAFT',
        approvedByTrainerId: null,
      },
    });
    if (updated.count !== 1) throw new NotFoundException('Nutrition plan not found.');
    await this.audit.record(trainerId, 'nutrition.plan.edit', 'NutritionPlan', planId);
    return { ...(await this.prisma.nutritionPlan.findUniqueOrThrow({ where: { id: planId } })), disclaimer: NUTRITION_DISCLAIMER };
  }

  async approveClientPlan(trainerId: string, memberId: string, planId: string) {
    await this.assertTrainerClient(trainerId, memberId);
    const updated = await this.prisma.nutritionPlan.updateMany({
      where: { id: planId, memberId },
      data: { source: 'TRAINER', status: 'APPROVED', approvedByTrainerId: trainerId },
    });
    if (updated.count !== 1) throw new NotFoundException('Nutrition plan not found.');
    await this.audit.record(trainerId, 'nutrition.plan.approve', 'NutritionPlan', planId);
    return { ...(await this.prisma.nutritionPlan.findUniqueOrThrow({ where: { id: planId } })), disclaimer: NUTRITION_DISCLAIMER };
  }

  private async assertTrainerClient(trainerId: string, memberId: string): Promise<void> {
    const assignment = await this.prisma.trainerClient.findUnique({
      where: { trainerId_memberId: { trainerId, memberId } },
      select: { status: true },
    });
    if (!assignment || assignment.status !== 'ACTIVE') {
      throw new ForbiddenException('This member is not assigned to the trainer.');
    }
  }

  private async createPlan(
    context: NutritionGenerationContext,
  ): Promise<{ plan: NutritionPlan; source: 'AI' | 'FALLBACK' }> {
    if (this.aiProvider === this.fallbackProvider) {
      return {
        plan: this.parsePlan(await this.fallbackProvider.generate(context)),
        source: 'FALLBACK',
      };
    }

    let feedback: string | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const raw = await this.aiProvider.generate(context, feedback);
      const parsed = this.tryParsePlan(raw);
      if (parsed.success) return { plan: parsed.data, source: 'AI' };
      feedback = parsed.feedback;
    }
    return {
      plan: this.parsePlan(await this.fallbackProvider.generate(context)),
      source: 'FALLBACK',
    };
  }

  private parsePlan(raw: string): NutritionPlan {
    const parsed = this.tryParsePlan(raw);
    if (!parsed.success) {
      throw new BadRequestException('The generated nutrition plan did not match the required schema.');
    }
    return parsed.data;
  }

  private tryParsePlan(
    raw: string,
  ): { success: true; data: NutritionPlan } | { success: false; feedback: string } {
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return { success: false, feedback: 'The response was not valid JSON.' };
    }
    const parsed = nutritionPlanSchema.safeParse(value);
    if (!parsed.success) {
      return {
        success: false,
        feedback: parsed.error.issues.map(({ path, code }) => `${path.join('.')}: ${code}`).join('; '),
      };
    }
    return { success: true, data: parsed.data };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code === 'P2002';
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
