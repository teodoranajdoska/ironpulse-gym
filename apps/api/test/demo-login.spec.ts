import { describe, expect, jest, test } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { Env } from '../src/config/env';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { MailService } from '../src/auth/mail.service';
import { DemoSeedService } from '../src/auth/demo-seed.service';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../src/auth/demo-accounts';

describe('Demo account login', () => {
  test('logs into all registry accounts and preserves the normal session response', async () => {
    type StoredUser = {
      id: string;
      email: string;
      passwordHash: string;
      role: string;
      status: string;
      emailVerifiedAt: Date;
      profile: { name: string };
    };
    const users = new Map<string, StoredUser>();
    const findUser = jest.fn(async (args: { where: { email: string } }) =>
      users.get(args.where.email) ?? null,
    );
    const createUser = jest.fn(async ({ data }: { data: Prisma.UserCreateInput }) => {
      const account = DEMO_ACCOUNTS.find(({ email }) => email === data.email);
      if (!account) {
        throw new Error('Unexpected non-demo account creation.');
      }
      const user: StoredUser = {
        id: `id-${account.email}`,
        email: account.email,
        passwordHash: data.passwordHash,
        role: account.role,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        profile: { name: account.displayName },
      };
      users.set(account.email, user);
      return { id: user.id };
    });
    const transaction = { user: { findUnique: findUser, create: createUser } };
    const prismaMocks = {
      user: { findUnique: findUser },
      refreshToken: { create: jest.fn(async (_args: unknown) => ({})) },
      $transaction: jest.fn(async (operation: unknown) => {
        if (typeof operation !== 'function') {
          throw new Error('Expected a callback transaction.');
        }
        return (operation as (tx: typeof transaction) => Promise<unknown>)(transaction);
      }),
    };
    const config = {
      get: jest.fn((key: keyof Env) => {
        if (key === 'AUTO_SEED_DEMO_USERS') return true;
        if (key === 'EMAIL_VERIFICATION_REQUIRED') return false;
        if (key === 'JWT_SECRET') return 'unit-test-secret-with-at-least-32-characters';
        return 'test';
      }),
    } as unknown as ConfigService<Env, true>;
    const demoSeed = new DemoSeedService(
      prismaMocks as unknown as PrismaService,
      config,
    );
    const auth = new AuthService(
      prismaMocks as unknown as PrismaService,
      {
        signAsync: jest.fn(async () => 'access-token'),
      } as unknown as JwtService,
      config,
      {} as MailService,
      demoSeed,
    );

    for (const account of DEMO_ACCOUNTS) {
      const session = await auth.login(
        { email: account.email, password: DEMO_PASSWORD },
        {},
      );
      expect(session).toEqual({
        user: {
          id: `id-${account.email}`,
          email: account.email,
          role: account.role,
          profile: { name: account.displayName },
        },
        accessToken: 'access-token',
        refreshToken: expect.any(String),
      });
    }

    expect(users.size).toBe(DEMO_ACCOUNTS.length);
    expect(createUser).toHaveBeenCalledTimes(DEMO_ACCOUNTS.length);
    const originalUsers = [...users.entries()];
    await auth.login(
      { email: DEMO_ACCOUNTS[0].email, password: DEMO_PASSWORD },
      {},
    );
    expect(createUser).toHaveBeenCalledTimes(DEMO_ACCOUNTS.length);
    expect([...users.entries()]).toEqual(originalUsers);
  });
});
