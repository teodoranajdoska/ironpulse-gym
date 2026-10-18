import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { MemberProfileUpdateInput } from '@ironpulse/shared';

@Injectable()
export class PrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        locale: true,
        profile: {
          select: {
            name: true,
            phone: true,
            birthDate: true,
            gender: true,
            heightCm: true,
            weightKg: true,
            avatarUrl: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  async updateProfile(userId: string, input: MemberProfileUpdateInput) {
    const { locale, ...profile } = input;
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: locale === undefined ? {} : { locale },
        select: { id: true, email: true, locale: true },
      }),
      this.prisma.profile.upsert({
        where: { userId },
        update: {
          ...profile,
          ...(profile.birthDate === undefined
            ? {}
            : { birthDate: profile.birthDate === null ? null : new Date(profile.birthDate) }),
        },
        create: {
          userId,
          name: profile.name ?? null,
          phone: profile.phone ?? null,
          birthDate: profile.birthDate ? new Date(profile.birthDate) : null,
          gender: profile.gender ?? null,
          heightCm: profile.heightCm ?? null,
          weightKg: profile.weightKg ?? null,
          avatarUrl: profile.avatarUrl ?? null,
        },
      }),
    ]);
    const current = await this.getProfile(userId);
    return { ...user, profile: current.profile };
  }

  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        locale: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
        memberships: {
          include: {
            plan: true,
            paymentRecords: {
              select: {
                id: true,
                amountMkd: true,
                provider: true,
                status: true,
                confirmedAt: true,
                createdAt: true,
              },
            },
          },
        },
        membershipPayments: {
          select: {
            id: true,
            membershipId: true,
            amountMkd: true,
            provider: true,
            status: true,
            confirmedAt: true,
            createdAt: true,
          },
        },
        trainerProfile: true,
        trainerClients: {
          include: {
            member: { select: { id: true, profile: { select: { name: true } } } },
          },
        },
        memberClients: {
          include: {
            trainer: { select: { id: true, profile: { select: { name: true } } } },
          },
        },
        appointmentsAsTrainer: {
          select: {
            id: true,
            trainerId: true,
            memberId: true,
            startsAt: true,
            endsAt: true,
            status: true,
            notes: true,
            createdAt: true,
          },
        },
        appointmentsAsMember: {
          select: {
            id: true,
            trainerId: true,
            memberId: true,
            startsAt: true,
            endsAt: true,
            status: true,
            notes: true,
            createdAt: true,
          },
        },
        nutritionQuestionnaires: true,
        nutritionPlans: true,
        nutritionGenerationQuotas: true,
        workoutLogs: {
          include: {
            sets: true,
            exercise: {
              select: {
                id: true,
                nameMk: true,
                nameEn: true,
                machine: { select: { slug: true, nameMk: true, nameEn: true } },
              },
            },
          },
        },
        sponsor: {
          include: {
            offers: true,
            stats: { select: { impressions: true, clicks: true, createdAt: true } },
          },
        },
        auditLogs: {
          select: { action: true, entity: true, entityId: true, metadata: true, createdAt: true },
        },
      },
    });
    if (!user || user.status === 'DELETED') throw new NotFoundException('User not found.');
    const trialRequests = await this.prisma.trialRequest.findMany({
      where: { email: user.email },
    });
    return { exportedAt: new Date().toISOString(), user, trialRequests };
  }

  async anonymizeUser(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, passwordHash: true, status: true },
    });
    if (!user || user.status === 'DELETED') throw new NotFoundException('User not found.');
    if (!(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Password confirmation failed.');
    }

    const anonymizedHash = await argon2.hash(randomBytes(32).toString('base64url'));
    await this.prisma.$transaction(async (transaction) => {
      const sponsor = await transaction.sponsor.findUnique({
        where: { userId },
        select: { id: true },
      });
      await transaction.refreshToken.deleteMany({ where: { userId } });
      await transaction.emailVerificationToken.deleteMany({ where: { userId } });
      await transaction.passwordResetToken.deleteMany({ where: { userId } });
      await transaction.appointment.deleteMany({
        where: { OR: [{ trainerId: userId }, { memberId: userId }] },
      });
      await transaction.trainerClient.deleteMany({
        where: { OR: [{ trainerId: userId }, { memberId: userId }] },
      });
      await transaction.trainerAvailability.deleteMany({ where: { trainerId: userId } });
      await transaction.workoutLog.deleteMany({ where: { memberId: userId } });
      await transaction.nutritionPlan.deleteMany({ where: { memberId: userId } });
      await transaction.nutritionQuestionnaire.deleteMany({ where: { memberId: userId } });
      await transaction.nutritionGenerationQuota.deleteMany({ where: { memberId: userId } });
      await transaction.membership.updateMany({
        where: { userId },
        data: { userId: null },
      });
      await transaction.paymentRecord.updateMany({
        where: { confirmedByAdminId: userId },
        data: { confirmedByAdminId: null },
      });
      await transaction.trialRequest.updateMany({
        where: { email: user.email },
        data: {
          name: 'Deleted user',
          email: `deleted-${userId}@deleted.invalid`,
          phone: null,
        },
      });
      if (sponsor) {
        await transaction.sponsorOffer.deleteMany({ where: { sponsorId: sponsor.id } });
        await transaction.sponsor.update({
          where: { id: sponsor.id },
          data: {
            userId: null,
            companyName: 'Deleted sponsor',
            logoUrl: null,
            websiteUrl: null,
            isActive: false,
          },
        });
      }
      await transaction.trainerProfile.deleteMany({ where: { userId } });
      await transaction.profile.deleteMany({ where: { userId } });
      await transaction.auditLog.updateMany({
        where: { OR: [{ actorId: userId }, { entityId: userId }] },
        data: { actorId: null, entityId: null },
      });
      await transaction.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@deleted.invalid`,
          passwordHash: anonymizedHash,
          emailVerifiedAt: null,
          locale: 'mk',
          status: 'DELETED',
        },
      });
    });
    return { message: 'Personal data was anonymized and active sessions were revoked.' };
  }
}
