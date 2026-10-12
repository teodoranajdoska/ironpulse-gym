import { Injectable, NotFoundException } from '@nestjs/common';
import { TrialStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { pagination, paginated } from '../common/pagination';
import {
  gymRuleSchema,
  gymSettingSchema,
  trialRequestSchema,
  trialStatusSchema,
  updateGymRuleSchema,
} from './content.schemas';
import { z } from 'zod';

type RuleInput = z.infer<typeof gymRuleSchema>;
type TrialInput = z.infer<typeof trialRequestSchema>;

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async getRules(locale: 'mk' | 'en') {
    const rules = await this.prisma.gymRule.findMany({ orderBy: { orderIndex: 'asc' } });
    return rules.map(({ id, orderIndex, icon, titleMk, titleEn, bodyMk, bodyEn }) => ({
      id,
      orderIndex,
      icon,
      title: locale === 'mk' ? titleMk : titleEn,
      body: locale === 'mk' ? bodyMk : bodyEn,
    }));
  }

  getSettings() {
    return this.prisma.gymSetting.findMany({
      where: { key: { in: ['opening_hours', 'address', 'phone', 'email'] } },
      orderBy: { key: 'asc' },
      select: { key: true, value: true },
    });
  }

  async createTrialRequest(input: TrialInput) {
    const validated = trialRequestSchema.parse(input);
    return this.prisma.trialRequest.create({ data: validated });
  }

  async listRules(input: { page?: string; pageSize?: string }) {
    const page = pagination(input);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.gymRule.findMany({
        orderBy: { orderIndex: 'asc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.gymRule.count(),
    ]);
    return paginated(data, total, page.page, page.pageSize);
  }

  async createRule(actorId: string, input: RuleInput) {
    const validated = gymRuleSchema.parse(input);
    const rule = await this.prisma.gymRule.create({ data: validated });
    await this.audit.record(actorId, 'content.rule.create', 'GymRule', rule.id);
    return rule;
  }

  async updateRule(actorId: string, id: string, input: unknown) {
    const validated = updateGymRuleSchema.parse(input);
    const rule = await this.prisma.gymRule.update({ where: { id }, data: validated });
    await this.audit.record(actorId, 'content.rule.update', 'GymRule', rule.id);
    return rule;
  }

  async deleteRule(actorId: string, id: string) {
    await this.prisma.gymRule.delete({ where: { id } });
    await this.audit.record(actorId, 'content.rule.delete', 'GymRule', id);
    return { id };
  }

  async upsertSetting(actorId: string, input: unknown) {
    const { key, value } = gymSettingSchema.parse(input);
    const setting = await this.prisma.gymSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    await this.audit.record(actorId, 'content.setting.upsert', 'GymSetting', setting.id, { key });
    return setting;
  }

  async listTrialRequests(input: {
    page?: string;
    pageSize?: string;
    status?: string;
  }) {
    const page = pagination(input);
    const status = input.status ? trialStatusSchema.parse(input.status) : undefined;
    const where = status ? { status: status as TrialStatus } : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.trialRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.trialRequest.count({ where }),
    ]);
    return paginated(data, total, page.page, page.pageSize);
  }

  async updateTrialStatus(actorId: string, id: string, status: unknown) {
    const validated = trialStatusSchema.parse(status);
    const exists = await this.prisma.trialRequest.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Trial request not found.');
    const request = await this.prisma.trialRequest.update({
      where: { id },
      data: { status: validated },
    });
    await this.audit.record(actorId, 'content.trial-request.status', 'TrialRequest', id, {
      status: validated,
    });
    return request;
  }
}
