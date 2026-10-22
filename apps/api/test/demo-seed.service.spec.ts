import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { Env } from '../src/config/env';
import { PrismaService } from '../src/prisma/prisma.service';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../src/auth/demo-accounts';
import { DemoSeedService } from '../src/auth/demo-seed.service';
import { AuthService } from '../src/auth/auth.service';
import { MailService } from '../src/auth/mail.service';

function createHarness(enabled = true) {
  const transaction = {
    user: {
      findUnique: jest.fn(async (_args: unknown): Promise<unknown> => null),
      create: jest.fn(async (_args: unknown) => ({ id: 'demo-user-id' })),
    },
  };
  const prismaMocks = {
    user: {
      findUnique: jest.fn(async (_args: unknown): Promise<unknown> => null),
    },
    $transaction: jest.fn(async (operation: unknown) => {
      if (typeof operation !== 'function') {
        throw new Error('Expected a callback transaction.');
      }
      return (operation as (tx: typeof transaction) => Promise<unknown>)(transaction);
    }),
  };
  const config = {
    get: jest.fn((key: keyof Env) =>
      key === 'AUTO_SEED_DEMO_USERS' ? enabled : 'test',
    ),
  } as unknown as ConfigService<Env, true>;
  const service = new DemoSeedService(
    prismaMocks as unknown as PrismaService,
    config,
  );
  return { service, prismaMocks, transaction, config };
}

describe('DemoSeedService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates only each registered account with its role profile and a password hash', async () => {
    const { service, prismaMocks, transaction } = createHarness();

    for (const account of DEMO_ACCOUNTS) {
      await service.seedForLogin(account.email, DEMO_PASSWORD);
    }

    expect(prismaMocks.$transaction).toHaveBeenCalledTimes(DEMO_ACCOUNTS.length);
    expect(transaction.user.create).toHaveBeenCalledTimes(DEMO_ACCOUNTS.length);
    for (const account of DEMO_ACCOUNTS) {
      const createCall = transaction.user.create.mock.calls.find(([args]) => {
        const data = (args as { data: Prisma.UserCreateInput }).data;
        return data.email === account.email;
      });
      expect(createCall).toBeDefined();
      const data = (createCall?.[0] as { data: Prisma.UserCreateInput }).data;
      expect(data.role).toBe(account.role);
      expect(data.status).toBe('ACTIVE');
      expect(data.emailVerifiedAt).toBeInstanceOf(Date);
      expect(data.profile).toEqual({ create: { name: account.displayName } });
      expect(typeof data.passwordHash).toBe('string');
      expect(data.passwordHash).not.toBe(DEMO_PASSWORD);
      await expect(argon2.verify(data.passwordHash, DEMO_PASSWORD)).resolves.toBe(true);

      if (account.role === 'TRAINER') {
        expect(data.trainerProfile).toEqual({
          create: {
            bio: account.trainerProfile.bio,
            specialties: account.trainerProfile.specialties,
            photoUrl: null,
          },
        });
      } else if (account.role === 'SPONSOR') {
        expect(data.sponsor).toEqual({
          create: {
            companyName: account.sponsorProfile.companyName,
            websiteUrl: account.sponsorProfile.websiteUrl,
            tier: account.sponsorProfile.tier,
            isActive: true,
          },
        });
      }
    }
  });

  test('does not create existing accounts or change their data', async () => {
    const { service, prismaMocks, transaction } = createHarness();
    prismaMocks.user.findUnique.mockResolvedValue({ id: 'existing-id' });

    await service.seedForLogin(DEMO_ACCOUNTS[0].email, DEMO_PASSWORD);

    expect(prismaMocks.$transaction).not.toHaveBeenCalled();
    expect(transaction.user.create).not.toHaveBeenCalled();
  });

  test('does not seed when disabled, for unknown emails, or for a wrong password', async () => {
    const disabled = createHarness(false);
    const auth = new AuthService(
      disabled.prismaMocks as unknown as PrismaService,
      { signAsync: jest.fn(async () => 'access-token') } as unknown as JwtService,
      disabled.config,
      {} as MailService,
      disabled.service,
    );
    await expect(
      auth.login({ email: DEMO_ACCOUNTS[0].email, password: DEMO_PASSWORD }, {}),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password.'));
    expect(disabled.prismaMocks.user.findUnique).toHaveBeenCalledTimes(1);
    expect(disabled.prismaMocks.$transaction).not.toHaveBeenCalled();

    const enabled = createHarness();
    await enabled.service.seedForLogin('unknown@ironpulse.test', DEMO_PASSWORD);
    await enabled.service.seedForLogin(DEMO_ACCOUNTS[0].email, 'wrong-password');
    expect(enabled.prismaMocks.user.findUnique).not.toHaveBeenCalled();
    expect(enabled.prismaMocks.$transaction).not.toHaveBeenCalled();
  });

  test('re-fetches the account after a concurrent unique-constraint conflict', async () => {
    const { service, prismaMocks, transaction } = createHarness();
    const conflict = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    transaction.user.create.mockRejectedValue(conflict);
    prismaMocks.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'created-by-concurrent-login' });

    await expect(
      service.seedForLogin(DEMO_ACCOUNTS[0].email, DEMO_PASSWORD),
    ).resolves.toBeUndefined();
    expect(prismaMocks.user.findUnique).toHaveBeenCalledTimes(2);
  });

  test('concurrent first logins create no duplicate and both complete', async () => {
    const { service, prismaMocks, transaction } = createHarness();
    let created = false;
    let successfulCreates = 0;
    let transactionLookups = 0;
    transaction.user.findUnique.mockImplementation(async () => {
      transactionLookups += 1;
      return transactionLookups <= 2 ? null : { id: 'demo-user-id' };
    });
    transaction.user.create.mockImplementation(async () => {
      if (created) {
        throw Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      }
      created = true;
      successfulCreates += 1;
      return { id: 'demo-user-id' };
    });
    prismaMocks.user.findUnique.mockImplementation(async () =>
      created ? { id: 'demo-user-id' } : null,
    );

    await expect(
      Promise.all([
        service.seedForLogin(DEMO_ACCOUNTS[0].email, DEMO_PASSWORD),
        service.seedForLogin(DEMO_ACCOUNTS[0].email, DEMO_PASSWORD),
      ]),
    ).resolves.toEqual([undefined, undefined]);
    expect(transaction.user.create).toHaveBeenCalledTimes(2);
    expect(successfulCreates).toBe(1);
    expect(prismaMocks.user.findUnique).toHaveBeenCalledTimes(3);
  });
});
