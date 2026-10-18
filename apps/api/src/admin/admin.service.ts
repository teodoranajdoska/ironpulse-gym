import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { paginated, pagination } from '../common/pagination';
import { adminUserQuerySchema } from './admin.schemas';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async listUsers(input: {
    page?: string;
    pageSize?: string;
    role?: string;
    status?: string;
    search?: string;
  }) {
    const query = adminUserQuerySchema.parse(input);
    const page = pagination(input);
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search } },
              { profile: { is: { name: { contains: query.search } } } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          emailVerifiedAt: true,
          createdAt: true,
          profile: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(data, total, page.page, page.pageSize);
  }

  async changeUserStatus(actorId: string, userId: string, status: 'ACTIVE' | 'SUSPENDED') {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });
    if (!target || target.status === 'DELETED') throw new NotFoundException('User not found.');
    if (actorId === userId) {
      throw new BadRequestException('Administrators cannot change their own account status here.');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, status: true },
    });
    await this.audit.record(actorId, 'admin.user.status', 'User', userId, { status });
    return updated;
  }

  async dashboard() {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const historyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    const [
      memberCount,
      activeMemberships,
      revenue,
      pendingPayments,
      newMemberRows,
      confirmedPayments,
      exercisePopularity,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'MEMBER', status: { not: 'DELETED' } } }),
      this.prisma.membership.count({
        where: {
          userId: { not: null },
          status: 'ACTIVE',
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
      }),
      this.prisma.paymentRecord.aggregate({
        where: {
          provider: 'mock',
          status: 'CONFIRMED',
          confirmedAt: { gte: monthStart, lt: nextMonthStart },
        },
        _sum: { amountMkd: true },
      }),
      this.prisma.paymentRecord.count({ where: { status: 'PENDING' } }),
      this.prisma.user.findMany({
        where: {
          role: 'MEMBER',
          status: { not: 'DELETED' },
          createdAt: { gte: historyStart, lt: nextMonthStart },
        },
        select: { createdAt: true },
      }),
      this.prisma.paymentRecord.findMany({
        where: {
          provider: 'mock',
          status: 'CONFIRMED',
          confirmedAt: { gte: historyStart, lt: nextMonthStart },
        },
        select: { amountMkd: true, confirmedAt: true },
      }),
      this.prisma.workoutLog.groupBy({
        by: ['exerciseId'],
        _count: { exerciseId: true },
        orderBy: { _count: { exerciseId: 'desc' } },
      }),
    ]);
    const exerciseIds = exercisePopularity.map((row) => row.exerciseId);
    const exercises = exerciseIds.length
      ? await this.prisma.exercise.findMany({
          where: { id: { in: exerciseIds } },
          select: { id: true, machine: { select: { id: true, slug: true, nameEn: true } } },
        })
      : [];
    const exerciseMachine = new Map(
      exercises.map((exercise) => [exercise.id, exercise.machine]),
    );
    const popularCounts = new Map<string, { slug: string; name: string; workouts: number }>();
    for (const row of exercisePopularity) {
      const machine = exerciseMachine.get(row.exerciseId);
      if (!machine) continue;
      const current = popularCounts.get(machine.id);
      if (current) current.workouts += row._count.exerciseId;
      else {
        popularCounts.set(machine.id, {
          slug: machine.slug,
          name: machine.nameEn,
          workouts: row._count.exerciseId,
        });
      }
    }
    const monthCounts = new Map<string, number>();
    const monthRevenue = new Map<string, number>();
    for (let index = 0; index < 12; index += 1) {
      const month = new Date(Date.UTC(historyStart.getUTCFullYear(), historyStart.getUTCMonth() + index, 1));
      const key = month.toISOString().slice(0, 7);
      monthCounts.set(key, 0);
      monthRevenue.set(key, 0);
    }
    for (const row of newMemberRows) {
      const key = row.createdAt.toISOString().slice(0, 7);
      monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
    }
    for (const payment of confirmedPayments) {
      if (!payment.confirmedAt) continue;
      const key = payment.confirmedAt.toISOString().slice(0, 7);
      if (monthRevenue.has(key)) {
        monthRevenue.set(key, (monthRevenue.get(key) ?? 0) + payment.amountMkd);
      }
    }
    return {
      members: memberCount,
      activeMemberships,
      monthlyRevenueMkd: revenue._sum.amountMkd ?? 0,
      pendingPayments,
      newMembersPerMonth: [...monthCounts].map(([month, count]) => ({ month, count })),
      revenuePerMonth: [...monthRevenue].map(([month, amountMkd]) => ({ month, amountMkd })),
      popularMachines: [...popularCounts.values()]
        .sort((left, right) => right.workouts - left.workouts)
        .slice(0, 10),
    };
  }

  async auditLog(input: { page?: string; pageSize?: string; action?: string; entity?: string }) {
    const page = pagination(input);
    const where: Prisma.AuditLogWhereInput = {
      ...(input.action ? { action: { contains: input.action } } : {}),
      ...(input.entity ? { entity: { contains: input.entity } } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, profile: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginated(data, total, page.page, page.pageSize);
  }
}
