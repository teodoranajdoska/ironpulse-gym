import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipStatus, PaymentStatus } from '@prisma/client';
import { AuditLogService } from '../audit/audit-log.service';
import { paginated, pagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import {
  membershipPlanSchema,
  membershipRequestSchema,
  updateMembershipPlanSchema,
} from './memberships.schemas';
import { PAYMENT_PROVIDER, PaymentProvider } from './payment-provider';
import { z } from 'zod';

type MembershipRequestInput = z.infer<typeof membershipRequestSchema>;
type MembershipPlanInput = z.infer<typeof membershipPlanSchema>;

export function addCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function membershipPeriod(
  durationMonths: number,
  now: Date,
  previousEnd?: Date | null,
): { startsAt: Date; endsAt: Date } {
  const startsAt = previousEnd && previousEnd > now ? new Date(previousEnd) : new Date(now);
  return { startsAt, endsAt: addCalendarMonths(startsAt, durationMonths) };
}

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
  ) {}

  async listPlans(input: { page?: string; pageSize?: string }) {
    const page = pagination(input);
    const where = { isActive: true };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.membershipPlan.findMany({
        where,
        orderBy: { durationMonths: 'asc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.membershipPlan.count({ where }),
    ]);
    return paginated(data, total, page.page, page.pageSize);
  }

  async listAllPlans(input: { page?: string; pageSize?: string }) {
    const page = pagination(input);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.membershipPlan.findMany({
        orderBy: { durationMonths: 'asc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.membershipPlan.count(),
    ]);
    return paginated(data, total, page.page, page.pageSize);
  }

  async getCurrent(userId: string) {
    const now = new Date();
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        status: MembershipStatus.ACTIVE,
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      include: { plan: true },
      orderBy: { endsAt: 'desc' },
    });
    return {
      membership,
      daysRemaining: membership?.endsAt ? this.daysLeft(membership.endsAt, now) : 0,
    };
  }

  async getHistory(userId: string, input: { page?: string; pageSize?: string }) {
    const page = pagination(input);
    const where = { userId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.membership.findMany({
        where,
        include: { plan: true, paymentRecords: true },
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.membership.count({ where }),
    ]);
    return paginated(data, total, page.page, page.pageSize);
  }

  async requestMembership(userId: string, input: MembershipRequestInput) {
    const validated = membershipRequestSchema.parse(input);
    const plan = await this.prisma.membershipPlan.findFirst({
      where: { id: validated.planId, isActive: true },
    });
    if (!plan) throw new NotFoundException('Membership plan not found.');
    const existingPending = await this.prisma.membership.findFirst({
      where: { userId, status: MembershipStatus.PENDING },
      select: { id: true },
    });
    if (existingPending) {
      throw new ConflictException('A membership request is already pending.');
    }

    const payment = await this.paymentProvider.requestPayment(plan.priceMkd);
    return this.prisma.membership.create({
      data: {
        userId,
        planId: plan.id,
        startsAt: new Date(),
        status: MembershipStatus.PENDING,
        paymentRecords: {
          create: {
            amountMkd: plan.priceMkd,
            provider: payment.provider,
            status: payment.status,
          },
        },
      },
      include: { plan: true, paymentRecords: true },
    });
  }

  async daysRemaining(userId: string) {
    const current = await this.getCurrent(userId);
    return { daysRemaining: current.daysRemaining };
  }

  async hasActiveMembership(userId: string): Promise<boolean> {
    const now = new Date();
    const active = await this.prisma.membership.findFirst({
      where: {
        userId,
        status: MembershipStatus.ACTIVE,
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      select: { id: true },
    });
    return active !== null;
  }

  async listPending(input: { page?: string; pageSize?: string }) {
    const page = pagination(input);
    const where = { status: MembershipStatus.PENDING };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.membership.findMany({
        where,
        include: {
          plan: true,
          user: { select: { id: true, email: true, profile: { select: { name: true } } } },
          paymentRecords: true,
        },
        orderBy: { createdAt: 'asc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.membership.count({ where }),
    ]);
    return paginated(data, total, page.page, page.pageSize);
  }

  async confirmPayment(actorId: string, membershipId: string) {
    const now = new Date();
    const confirmed = await this.prisma.$transaction(async (transaction) => {
      const pending = await transaction.membership.findUnique({
        where: { id: membershipId },
        include: { plan: true },
      });
      if (!pending) throw new NotFoundException('Membership request not found.');
      if (pending.status !== MembershipStatus.PENDING) {
        throw new ConflictException('Membership request is no longer pending.');
      }
      const current = await transaction.membership.findFirst({
        where: {
          userId: pending.userId,
          status: MembershipStatus.ACTIVE,
          endsAt: { gt: now },
        },
        orderBy: { endsAt: 'desc' },
        select: { endsAt: true },
      });
      const period = membershipPeriod(pending.plan.durationMonths, now, current?.endsAt);
      const paymentUpdate = await transaction.paymentRecord.updateMany({
        where: { membershipId, status: PaymentStatus.PENDING },
        data: {
          status: PaymentStatus.CONFIRMED,
          confirmedByAdminId: actorId,
          confirmedAt: now,
        },
      });
      if (paymentUpdate.count === 0) {
        throw new ConflictException('No pending payment is available to confirm.');
      }
      return transaction.membership.update({
        where: { id: membershipId },
        data: {
          status: MembershipStatus.ACTIVE,
          startsAt: period.startsAt,
          endsAt: period.endsAt,
        },
        include: { plan: true, paymentRecords: true },
      });
    });
    await this.audit.record(actorId, 'membership.payment.confirm', 'Membership', confirmed.id);
    return confirmed;
  }

  async cancel(actorId: string, membershipId: string) {
    const membership = await this.prisma.membership.findUnique({ where: { id: membershipId } });
    if (!membership) throw new NotFoundException('Membership not found.');
    if (membership.status === MembershipStatus.CANCELLED) {
      throw new ConflictException('Membership is already cancelled.');
    }
    const updated = await this.prisma.membership.update({
      where: { id: membershipId },
      data: { status: MembershipStatus.CANCELLED },
    });
    await this.prisma.paymentRecord.updateMany({
      where: { membershipId, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.REJECTED, confirmedByAdminId: actorId },
    });
    await this.audit.record(actorId, 'membership.cancel', 'Membership', membershipId);
    return updated;
  }

  async createPlan(actorId: string, input: MembershipPlanInput) {
    const validated = membershipPlanSchema.parse(input);
    const plan = await this.prisma.membershipPlan.create({ data: validated });
    await this.audit.record(actorId, 'membership.plan.create', 'MembershipPlan', plan.id);
    return plan;
  }

  async updatePlan(actorId: string, id: string, input: unknown) {
    const validated = updateMembershipPlanSchema.parse(input);
    const plan = await this.prisma.membershipPlan.update({ where: { id }, data: validated });
    await this.audit.record(actorId, 'membership.plan.update', 'MembershipPlan', plan.id);
    return plan;
  }

  async deactivatePlan(actorId: string, id: string) {
    const plan = await this.prisma.membershipPlan.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit.record(actorId, 'membership.plan.deactivate', 'MembershipPlan', plan.id);
    return plan;
  }

  async expireMemberships(now = new Date()): Promise<number> {
    const result = await this.prisma.membership.updateMany({
      where: {
        status: MembershipStatus.ACTIVE,
        endsAt: { lte: now },
      },
      data: { status: MembershipStatus.EXPIRED },
    });
    return result.count;
  }

  private daysLeft(endsAt: Date, now: Date): number {
    return Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000));
  }
}
