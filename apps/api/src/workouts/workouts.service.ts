import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginated, pagination } from '../common/pagination';
import { CreateWorkoutInput, createWorkoutSchema } from './workouts.schemas';

@Injectable()
export class WorkoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(memberId: string, input: CreateWorkoutInput) {
    const validated = createWorkoutSchema.parse(input);
    const performedAt = validated.performedAt ?? new Date();
    if (performedAt > new Date()) {
      throw new BadRequestException('Workout date cannot be in the future.');
    }
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: validated.exerciseId },
      select: { id: true },
    });
    if (!exercise) throw new NotFoundException('Exercise not found.');
    return this.prisma.workoutLog.create({
      data: {
        memberId,
        exerciseId: exercise.id,
        performedAt,
        sets: {
          create: validated.sets.map((set, index) => ({
            setNumber: index + 1,
            reps: set.reps,
            weightKg: set.weightKg,
          })),
        },
      },
      include: { sets: { orderBy: { setNumber: 'asc' } } },
    });
  }

  async history(
    memberId: string,
    input: { page?: string; pageSize?: string; locale: 'mk' | 'en' },
  ) {
    const page = pagination(input);
    const where = { memberId };
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.workoutLog.findMany({
        where,
        include: {
          sets: { orderBy: { setNumber: 'asc' } },
          exercise: { include: { machine: { select: { slug: true, nameMk: true, nameEn: true } } } },
        },
        orderBy: { performedAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.workoutLog.count({ where }),
    ]);
    const data = logs.map(({ exercise, ...log }) => ({
      ...log,
      exercise: {
        id: exercise.id,
        name: input.locale === 'mk' ? exercise.nameMk : exercise.nameEn,
        machineSlug: exercise.machine.slug,
      },
    }));
    return paginated(data, total, page.page, page.pageSize);
  }

  async progress(
    memberId: string,
    exerciseId: string,
    input: { page?: string; pageSize?: string },
  ) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { id: true },
    });
    if (!exercise) throw new NotFoundException('Exercise not found.');
    const page = pagination(input);
    const where = { memberId, exerciseId };
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.workoutLog.findMany({
        where,
        include: { sets: { orderBy: { setNumber: 'asc' } } },
        orderBy: { performedAt: 'asc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.workoutLog.count({ where }),
    ]);
    const data = logs.map(({ id, performedAt, sets }) => ({
      id,
      performedAt,
      totalReps: sets.reduce((totalReps, set) => totalReps + set.reps, 0),
      totalVolumeKg: sets.reduce((volume, set) => volume + set.reps * set.weightKg, 0),
      maxWeightKg: Math.max(0, ...sets.map((set) => set.weightKg)),
      sets,
    }));
    return paginated(data, total, page.page, page.pageSize);
  }

  async personalRecords(
    memberId: string,
    input: { page?: string; pageSize?: string; locale: 'mk' | 'en' },
  ) {
    const logs = await this.prisma.workoutLog.findMany({
      where: { memberId },
      include: {
        sets: true,
        exercise: {
          include: { machine: { select: { nameMk: true, nameEn: true } } },
        },
      },
      orderBy: { performedAt: 'asc' },
    });
    const records = new Map<
      string,
      {
        exerciseId: string;
        exerciseName: string;
        maxWeightKg: number;
        maxWeightAt: Date;
        maxVolumeKg: number;
        maxVolumeAt: Date;
      }
    >();
    for (const log of logs) {
      const current = records.get(log.exerciseId);
      const volume = log.sets.reduce((sum, set) => sum + set.reps * set.weightKg, 0);
      const maxWeight = Math.max(0, ...log.sets.map((set) => set.weightKg));
      const exerciseName =
        input.locale === 'mk' ? log.exercise.nameMk : log.exercise.nameEn;
      if (!current) {
        records.set(log.exerciseId, {
          exerciseId: log.exerciseId,
          exerciseName,
          maxWeightKg: maxWeight,
          maxWeightAt: log.performedAt,
          maxVolumeKg: volume,
          maxVolumeAt: log.performedAt,
        });
        continue;
      }
      if (maxWeight > current.maxWeightKg) {
        current.maxWeightKg = maxWeight;
        current.maxWeightAt = log.performedAt;
      }
      if (volume > current.maxVolumeKg) {
        current.maxVolumeKg = volume;
        current.maxVolumeAt = log.performedAt;
      }
    }
    const allRecords = [...records.values()].sort(
      (left, right) => right.maxWeightKg - left.maxWeightKg,
    );
    const page = pagination(input);
    const data = allRecords.slice(page.skip, page.skip + page.take);
    return paginated(data, allRecords.length, page.page, page.pageSize);
  }
}
