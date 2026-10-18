import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { paginated, pagination } from '../common/pagination';
import {
  SponsorCreateInput,
  SponsorOfferInput,
  SponsorOfferUpdateInput,
  SponsorProfileInput,
} from './sponsors.schemas';

@Injectable()
export class SponsorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async publicList(input: { page?: string; pageSize?: string }) {
    const page = pagination(input);
    const where = { isActive: true, user: { status: 'ACTIVE' } };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.sponsor.findMany({
        where,
        select: {
          id: true,
          companyName: true,
          logoUrl: true,
          websiteUrl: true,
          tier: true,
          offers: {
            where: {
              isActive: true,
              OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
            },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              title: true,
              description: true,
              discountCode: true,
              validUntil: true,
            },
          },
        },
        orderBy: { companyName: 'asc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.sponsor.count({ where }),
    ]);
    return paginated(data, total, page.page, page.pageSize);
  }

  async ownProfile(userId: string) {
    const sponsor = await this.prisma.sponsor.findUnique({
      where: { userId },
      include: { offers: { orderBy: { createdAt: 'desc' } } },
    });
    if (!sponsor) throw new NotFoundException('Sponsor profile not found.');
    return sponsor;
  }

  async adminList(input: { page?: string; pageSize?: string }) {
    const page = pagination(input);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.sponsor.findMany({
        include: {
          user: { select: { id: true, email: true, status: true, profile: { select: { name: true } } } },
          offers: { orderBy: { createdAt: 'desc' } },
          stats: { select: { impressions: true, clicks: true } },
        },
        orderBy: { companyName: 'asc' },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.sponsor.count(),
    ]);
    return paginated(data, total, page.page, page.pageSize);
  }

  async updateOwnProfile(userId: string, input: SponsorProfileInput) {
    const sponsor = await this.prisma.sponsor.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!sponsor) throw new NotFoundException('Sponsor profile not found.');
    const updated = await this.prisma.sponsor.update({
      where: { id: sponsor.id },
      data: input,
    });
    await this.audit.record(userId, 'sponsor.profile.update', 'Sponsor', sponsor.id);
    return updated;
  }

  async createOwnOffer(userId: string, input: SponsorOfferInput) {
    const sponsor = await this.ownedSponsor(userId);
    const offer = await this.prisma.sponsorOffer.create({
      data: { ...input, sponsorId: sponsor.id },
    });
    await this.audit.record(userId, 'sponsor.offer.create', 'SponsorOffer', offer.id);
    return offer;
  }

  async updateOwnOffer(userId: string, offerId: string, input: SponsorOfferUpdateInput) {
    const sponsor = await this.ownedSponsor(userId);
    const updated = await this.prisma.sponsorOffer.updateMany({
      where: { id: offerId, sponsorId: sponsor.id },
      data: input,
    });
    if (updated.count !== 1) throw new NotFoundException('Offer not found.');
    await this.audit.record(userId, 'sponsor.offer.update', 'SponsorOffer', offerId);
    return this.prisma.sponsorOffer.findUniqueOrThrow({ where: { id: offerId } });
  }

  async deleteOwnOffer(userId: string, offerId: string) {
    const sponsor = await this.ownedSponsor(userId);
    const deleted = await this.prisma.sponsorOffer.deleteMany({
      where: { id: offerId, sponsorId: sponsor.id },
    });
    if (deleted.count !== 1) throw new NotFoundException('Offer not found.');
    await this.audit.record(userId, 'sponsor.offer.delete', 'SponsorOffer', offerId);
    return { id: offerId };
  }

  async ownStats(userId: string) {
    const sponsor = await this.ownedSponsor(userId);
    const [stats, daily] = await Promise.all([
      this.prisma.sponsorStat.findUnique({
        where: { sponsorId: sponsor.id },
        select: { impressions: true, clicks: true, createdAt: true },
      }),
      this.prisma.sponsorStatDaily.findMany({
        where: { sponsorId: sponsor.id },
        orderBy: { day: 'asc' },
        select: { day: true, impressions: true, clicks: true },
      }),
    ]);
    return {
      impressions: stats?.impressions ?? 0,
      clicks: stats?.clicks ?? 0,
      createdAt: stats?.createdAt ?? null,
      daily,
    };
  }

  async trackImpression(sponsorId: string) {
    const sponsor = await this.prisma.sponsor.findFirst({
      where: { id: sponsorId, isActive: true, user: { status: 'ACTIVE' } },
      select: { id: true },
    });
    if (!sponsor) throw new NotFoundException('Active sponsor not found.');
    const day = new Date().toISOString().slice(0, 10);
    await this.prisma.$transaction([
      this.prisma.sponsorStat.upsert({
        where: { sponsorId },
        update: { impressions: { increment: 1 } },
        create: { sponsorId, impressions: 1 },
      }),
      this.prisma.sponsorStatDaily.upsert({
        where: { sponsorId_day: { sponsorId, day } },
        update: { impressions: { increment: 1 } },
        create: { sponsorId, day, impressions: 1 },
      }),
    ]);
    return { tracked: true };
  }

  async trackClick(offerId: string) {
    const offer = await this.prisma.sponsorOffer.findFirst({
      where: {
        id: offerId,
        sponsor: {
          isActive: true,
          user: { status: 'ACTIVE' },
        },
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
      },
      select: { sponsorId: true },
    });
    if (!offer) throw new NotFoundException('Active offer not found.');
    const day = new Date().toISOString().slice(0, 10);
    await this.prisma.$transaction([
      this.prisma.sponsorStat.upsert({
        where: { sponsorId: offer.sponsorId },
        update: { clicks: { increment: 1 } },
        create: { sponsorId: offer.sponsorId, clicks: 1 },
      }),
      this.prisma.sponsorStatDaily.upsert({
        where: { sponsorId_day: { sponsorId: offer.sponsorId, day } },
        update: { clicks: { increment: 1 } },
        create: { sponsorId: offer.sponsorId, day, clicks: 1 },
      }),
    ]);
    return { tracked: true };
  }

  async adminCreate(actorId: string, input: SponsorCreateInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, role: true },
    });
    if (!user || user.role !== 'SPONSOR') {
      throw new BadRequestException('A sponsor-role user account is required.');
    }
    try {
      const sponsor = await this.prisma.sponsor.upsert({
        where: { userId: user.id },
        update: {
          companyName: input.companyName,
          logoUrl: input.logoUrl,
          websiteUrl: input.websiteUrl,
          tier: input.tier,
          isActive: true,
        },
        create: {
          userId: user.id,
          companyName: input.companyName,
          logoUrl: input.logoUrl,
          websiteUrl: input.websiteUrl,
          tier: input.tier,
          isActive: true,
        },
      });
      await this.audit.record(actorId, 'admin.sponsor.create', 'Sponsor', sponsor.id);
      return sponsor;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Sponsor profile already exists.');
      }
      throw error;
    }
  }

  async adminSetActive(actorId: string, sponsorId: string, isActive: boolean) {
    const sponsor = await this.prisma.sponsor.update({
      where: { id: sponsorId },
      data: { isActive },
    });
    await this.audit.record(actorId, 'admin.sponsor.status', 'Sponsor', sponsorId, { isActive });
    return sponsor;
  }

  private async ownedSponsor(userId: string) {
    const sponsor = await this.prisma.sponsor.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!sponsor) throw new ForbiddenException('A sponsor profile is required.');
    return sponsor;
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
