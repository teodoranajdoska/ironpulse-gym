import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MachineCategory, Prisma } from '@prisma/client';
import { UserRole } from '@ironpulse/shared';
import { AuditLogService } from '../audit/audit-log.service';
import { paginated, pagination } from '../common/pagination';
import { MembershipsService } from '../memberships/memberships.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  exerciseSchema,
  machineSchema,
  updateExerciseSchema,
  updateMachineSchema,
} from './machines.schemas';
import { z } from 'zod';

type MachineInput = z.infer<typeof machineSchema>;
type ExerciseInput = z.infer<typeof exerciseSchema>;
type ExerciseRecord = Prisma.ExerciseGetPayload<Prisma.ExerciseDefaultArgs>;

@Injectable()
export class MachinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memberships: MembershipsService,
    private readonly audit: AuditLogService,
  ) {}

  async listPublic(input: {
    category?: MachineCategory;
    search?: string;
    locale: 'mk' | 'en';
    page?: string;
    pageSize?: string;
  }) {
    const page = pagination(input);
    const where: Prisma.MachineWhereInput = { isPublic: true };
    if (input.category) where.category = input.category;
    if (input.search) {
      where.OR = [
        { nameMk: { contains: input.search } },
        { nameEn: { contains: input.search } },
        { slug: { contains: input.search } },
      ];
    }
    const [machines, total] = await this.prisma.$transaction([
      this.prisma.machine.findMany({
        where,
        include: { muscles: { orderBy: { muscleGroup: 'asc' } } },
        orderBy: [{ category: 'asc' }, { nameEn: 'asc' }],
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.machine.count({ where }),
    ]);
    const data = machines.map((machine) => ({
      id: machine.id,
      slug: machine.slug,
      name: input.locale === 'mk' ? machine.nameMk : machine.nameEn,
      category: machine.category,
      difficulty: machine.difficulty,
      animationKey: machine.animationKey,
      imageUrl: machine.imageUrl,
      muscles: machine.muscles.map(({ muscleGroup, primary }) => ({ muscleGroup, primary })),
    }));
    return paginated(data, total, page.page, page.pageSize);
  }

  async getPublicDetail(slug: string, locale: 'mk' | 'en') {
    const machine = await this.prisma.machine.findFirst({
      where: { slug, isPublic: true },
      include: { muscles: { orderBy: { muscleGroup: 'asc' } } },
    });
    if (!machine) throw new NotFoundException('Machine not found.');
    return {
      id: machine.id,
      slug: machine.slug,
      name: locale === 'mk' ? machine.nameMk : machine.nameEn,
      category: machine.category,
      description: locale === 'mk' ? machine.descriptionMk : machine.descriptionEn,
      animationKey: machine.animationKey,
      imageUrl: machine.imageUrl,
      muscles: machine.muscles.map(({ muscleGroup, primary }) => ({ muscleGroup, primary })),
    };
  }

  async getExercisesForMachine(
    slug: string,
    locale: 'mk' | 'en',
    user: { id: string; role: UserRole },
    input: { page?: string; pageSize?: string },
  ) {
    await this.assertCanViewFullExercise(user);
    const machine = await this.prisma.machine.findFirst({
      where: { slug, isPublic: true },
      select: { id: true },
    });
    if (!machine) throw new NotFoundException('Machine not found.');
    const page = pagination(input);
    const where = { machineId: machine.id };
    const [exercises, total] = await this.prisma.$transaction([
      this.prisma.exercise.findMany({
        where,
        orderBy: { nameEn: 'asc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.exercise.count({ where }),
    ]);
    return paginated(
      exercises.map((exercise) => this.fullExercise(exercise, locale)),
      total,
      page.page,
      page.pageSize,
    );
  }

  async getExercise(id: string, locale: 'mk' | 'en', user: { id: string; role: UserRole }) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } });
    if (!exercise) throw new NotFoundException('Exercise not found.');
    await this.assertCanViewFullExercise(user);
    return this.fullExercise(exercise, locale);
  }

  private async assertCanViewFullExercise(user: { id: string; role: UserRole }): Promise<void> {
    if (user.role === 'MEMBER' && !(await this.memberships.hasActiveMembership(user.id))) {
      throw new ForbiddenException('An active membership is required to view exercise details.');
    }
    if (!['MEMBER', 'TRAINER', 'ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions.');
    }
  }

  private fullExercise(exercise: ExerciseRecord, locale: 'mk' | 'en') {
    const stepValue = locale === 'mk' ? exercise.stepsMk : exercise.stepsEn;
    const mistakesValue = locale === 'mk' ? exercise.commonMistakesMk : exercise.commonMistakesEn;
    const safetyValue = locale === 'mk' ? exercise.safetyTipsMk : exercise.safetyTipsEn;
    return {
      id: exercise.id,
      machineId: exercise.machineId,
      name: locale === 'mk' ? exercise.nameMk : exercise.nameEn,
      steps: z.array(z.string()).parse(stepValue ?? []),
      commonMistakes: z.array(z.string()).parse(mistakesValue ?? []),
      safetyTips: z.array(z.string()).parse(safetyValue ?? []),
      recommendedSets: exercise.recommendedSets,
      recommendedReps: exercise.recommendedReps,
      videoId: exercise.youtubeVideoId,
      level: exercise.level,
    };
  }

  async listAdminMachines(input: { page?: string; pageSize?: string }) {
    const page = pagination(input);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.machine.findMany({
        include: { muscles: { orderBy: { muscleGroup: 'asc' } } },
        orderBy: { nameEn: 'asc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.machine.count(),
    ]);
    return paginated(data, total, page.page, page.pageSize);
  }

  async createMachine(actorId: string, input: MachineInput) {
    const validated = machineSchema.parse(input);
    const { muscles, ...data } = validated;
    const machine = await this.prisma.machine.create({
      data: {
        ...data,
        muscles: { create: muscles },
      },
      include: { muscles: true },
    });
    await this.audit.record(actorId, 'machine.create', 'Machine', machine.id);
    return machine;
  }

  async updateMachine(actorId: string, id: string, input: unknown) {
    const validated = updateMachineSchema.parse(input);
    const { muscles, ...data } = validated;
    const machine = await this.prisma.$transaction(async (transaction) => {
      if (muscles) await transaction.machineMuscle.deleteMany({ where: { machineId: id } });
      return transaction.machine.update({
        where: { id },
        data: {
          ...data,
          ...(muscles ? { muscles: { create: muscles } } : {}),
        },
        include: { muscles: true },
      });
    });
    await this.audit.record(actorId, 'machine.update', 'Machine', machine.id);
    return machine;
  }

  async hideMachine(actorId: string, id: string) {
    const machine = await this.prisma.machine.update({
      where: { id },
      data: { isPublic: false },
    });
    await this.audit.record(actorId, 'machine.hide', 'Machine', machine.id);
    return machine;
  }

  listAdminExercises(input: { page?: string; pageSize?: string }) {
    const page = pagination(input);
    return this.prisma.$transaction(async (transaction) => {
      const [data, total] = await Promise.all([
        transaction.exercise.findMany({
          include: { machine: { select: { slug: true, nameEn: true } } },
          orderBy: { nameEn: 'asc' },
          skip: page.skip,
          take: page.take,
        }),
        transaction.exercise.count(),
      ]);
      return paginated(
        data.map(({ youtubeVideoId, ...exercise }) => ({
          ...exercise,
          videoId: youtubeVideoId,
        })),
        total,
        page.page,
        page.pageSize,
      );
    });
  }

  async createExercise(actorId: string, input: ExerciseInput) {
    const validated = exerciseSchema.parse(input);
    const exercise = await this.prisma.exercise.create({
      data: this.exerciseCreateData(validated),
    });
    await this.audit.record(actorId, 'exercise.create', 'Exercise', exercise.id);
    const { youtubeVideoId, ...response } = exercise;
    return { ...response, videoId: youtubeVideoId };
  }

  async updateExercise(actorId: string, id: string, input: unknown) {
    const validated = updateExerciseSchema.parse(input);
    const exercise = await this.prisma.exercise.update({
      where: { id },
      data: this.exerciseUpdateData(validated),
    });
    await this.audit.record(actorId, 'exercise.update', 'Exercise', exercise.id);
    const { youtubeVideoId, ...response } = exercise;
    return { ...response, videoId: youtubeVideoId };
  }

  async deleteExercise(actorId: string, id: string) {
    const logCount = await this.prisma.workoutLog.count({ where: { exerciseId: id } });
    if (logCount > 0) {
      throw new ConflictException('An exercise with workout history cannot be deleted.');
    }
    await this.prisma.exercise.delete({ where: { id } });
    await this.audit.record(actorId, 'exercise.delete', 'Exercise', id);
    return { id };
  }

  private exerciseCreateData(input: ExerciseInput): Prisma.ExerciseUncheckedCreateInput {
    return {
      machineId: input.machineId,
      nameMk: input.nameMk,
      nameEn: input.nameEn,
      stepsMk: input.stepsMk,
      stepsEn: input.stepsEn,
      commonMistakesMk: input.commonMistakesMk,
      commonMistakesEn: input.commonMistakesEn,
      safetyTipsMk: input.safetyTipsMk,
      safetyTipsEn: input.safetyTipsEn,
      recommendedSets: input.recommendedSets,
      recommendedReps: input.recommendedReps,
      youtubeVideoId: input.videoId,
      level: input.level,
    };
  }

  private exerciseUpdateData(
    input: Partial<ExerciseInput>,
  ): Prisma.ExerciseUncheckedUpdateInput {
    return {
      machineId: input.machineId,
      nameMk: input.nameMk,
      nameEn: input.nameEn,
      stepsMk: input.stepsMk,
      stepsEn: input.stepsEn,
      commonMistakesMk: input.commonMistakesMk,
      commonMistakesEn: input.commonMistakesEn,
      safetyTipsMk: input.safetyTipsMk,
      safetyTipsEn: input.safetyTipsEn,
      recommendedSets: input.recommendedSets,
      recommendedReps: input.recommendedReps,
      youtubeVideoId: input.videoId,
      level: input.level,
    };
  }
}
