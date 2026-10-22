import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './demo-accounts';

@Injectable()
export class DemoSeedService implements OnModuleInit {
  private readonly logger = new Logger(DemoSeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onModuleInit(): void {
    if (
      this.config.get('AUTO_SEED_DEMO_USERS') &&
      this.config.get('NODE_ENV') === 'production'
    ) {
      this.logger.warn(
        'AUTO_SEED_DEMO_USERS is enabled in production; demo credentials are intended only for demo deployments.',
      );
    }
  }

  async seedForLogin(email: string, password: string): Promise<void> {
    if (!this.config.get('AUTO_SEED_DEMO_USERS') || password !== DEMO_PASSWORD) {
      return;
    }

    const account = DEMO_ACCOUNTS.find((demoAccount) => demoAccount.email === email);
    if (!account) {
      return;
    }

    if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      return;
    }

    const passwordHash = await argon2.hash(DEMO_PASSWORD);
    let created = false;
    try {
      created = await this.prisma.$transaction(async (transaction) => {
        const existing = await transaction.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (existing) {
          return false;
        }

        const data: Prisma.UserCreateInput = {
          email,
          passwordHash,
          role: account.role,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          locale: 'mk',
          profile: { create: { name: account.displayName } },
        };

        if (account.role === Role.TRAINER) {
          data.trainerProfile = {
            create: {
              bio: account.trainerProfile.bio,
              specialties: account.trainerProfile.specialties,
              photoUrl: null,
            },
          };
        } else if (account.role === Role.SPONSOR) {
          data.sponsor = {
            create: {
              companyName: account.sponsorProfile.companyName,
              websiteUrl: account.sponsorProfile.websiteUrl,
              tier: account.sponsorProfile.tier,
              isActive: true,
            },
          };
        }

        await transaction.user.create({ data, select: { id: true } });
        return true;
      });
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }
      const existing = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (!existing) {
        throw error;
      }
    }

    if (created) {
      this.logger.log('Auto-seeded one registered demo account during login.');
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
