import { describe, expect, jest, test, beforeEach } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../src/prisma/prisma.service';
import { Env } from '../src/config/env';
import { AuthService } from '../src/auth/auth.service';
import { MailService } from '../src/auth/mail.service';
import { RolesGuard } from '../src/auth/roles.guard';

const activeUser = {
  id: 'user-1',
  email: 'member@example.com',
  role: 'MEMBER',
  status: 'ACTIVE',
  emailVerifiedAt: new Date(),
  profile: { name: 'Member' },
};

function dependencies(emailVerificationRequired = false) {
  const transaction = {
    refreshToken: {
      updateMany: jest.fn(async (_args: unknown) => ({ count: 1 })),
      create: jest.fn(async (_args: unknown) => ({})),
    },
    passwordResetToken: {
      updateMany: jest.fn(async (_args: unknown) => ({ count: 1 })),
    },
    user: { update: jest.fn(async (_args: unknown) => activeUser) },
    auditLog: { create: jest.fn(async (_args: unknown) => ({})) },
  };
  const prismaMocks = {
    user: {
      create: jest.fn(async (_args: unknown) => ({ ...activeUser, passwordHash: 'hash' })),
      findUnique: jest.fn(async (_args: unknown): Promise<unknown> => null),
      update: jest.fn(async (_args: unknown) => activeUser),
    },
    refreshToken: {
      create: jest.fn(async (_args: unknown) => ({})),
      findFirst: jest.fn(async (_args: unknown): Promise<unknown> => null),
      updateMany: jest.fn(async (_args: unknown) => ({ count: 1 })),
    },
    emailVerificationToken: {
      findFirst: jest.fn(async (_args: unknown): Promise<unknown> => null),
      updateMany: jest.fn(async (_args: unknown) => ({ count: 1 })),
      deleteMany: jest.fn(async (_args: unknown) => ({ count: 1 })),
      create: jest.fn(async (_args: unknown) => ({})),
    },
    passwordResetToken: {
      findFirst: jest.fn(async (_args: unknown): Promise<unknown> => null),
      updateMany: jest.fn(async (_args: unknown) => ({ count: 1 })),
      deleteMany: jest.fn(async (_args: unknown) => ({ count: 1 })),
      create: jest.fn(async (_args: unknown) => ({})),
    },
    auditLog: { create: jest.fn(async (_args: unknown) => ({})) },
    $transaction: jest.fn(async (operation: unknown) => {
      if (Array.isArray(operation)) return Promise.all(operation);
      if (typeof operation === 'function') {
        return (operation as (tx: typeof transaction) => Promise<unknown>)(transaction);
      }
      throw new Error('Unexpected transaction argument.');
    }),
  };
  const jwtMocks = {
    signAsync: jest.fn(async (_payload: unknown, _options: unknown) => 'signed-access-token'),
  };
  const configMocks = {
    get: jest.fn((key: keyof Env) => {
      if (key === 'JWT_SECRET') return 'unit-test-secret-with-at-least-32-characters';
      if (key === 'EMAIL_VERIFICATION_REQUIRED') return emailVerificationRequired;
      return 'test';
    }),
  };
  const mailMocks = {
    sendVerification: jest.fn(async (_email: string, _locale: string, _token: string) => undefined),
    sendPasswordReset: jest.fn(async (_email: string, _locale: string, _token: string) => undefined),
    sendInvitation: jest.fn(async (_email: string, _locale: string, _token: string) => undefined),
  };
  const service = new AuthService(
    prismaMocks as unknown as PrismaService,
    jwtMocks as unknown as JwtService,
    configMocks as unknown as ConfigService<Env, true>,
    mailMocks as unknown as MailService,
  );
  return { service, prismaMocks, jwtMocks, mailMocks, transaction };
}

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('register sends verification email when verification is required', async () => {
    const { service, prismaMocks, mailMocks } = dependencies(true);
    const result = await service.register(
      { email: 'member@example.com', password: 'password123', name: 'Member' },
      'en',
      {},
    );
    expect(result.message).toContain('Registration successful');
    expect(prismaMocks.user.create).toHaveBeenCalledTimes(1);
    expect(mailMocks.sendVerification).toHaveBeenCalledWith(
      'member@example.com',
      'en',
      expect.any(String),
    );
    expect(prismaMocks.refreshToken.create).not.toHaveBeenCalled();
  });

  test('register verifies the member and creates a session when verification is optional', async () => {
    const { service, prismaMocks, mailMocks } = dependencies();
    const result = await service.register(
      { email: 'member@example.com', password: 'password123', name: 'Member' },
      'en',
      {},
    );
    expect(result.session?.user.email).toBe('member@example.com');
    expect(prismaMocks.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ACTIVE',
          emailVerifiedAt: expect.any(Date),
        }),
      }),
    );
    expect(mailMocks.sendVerification).not.toHaveBeenCalled();
    expect(prismaMocks.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  test('login rejects unknown accounts with a generic auth error', async () => {
    const { service, prismaMocks, jwtMocks } = dependencies();
    prismaMocks.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: 'unknown@example.com', password: 'password123' }, {}),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password.'));
    expect(jwtMocks.signAsync).not.toHaveBeenCalled();
  });

  test('login rejects unverified users', async () => {
    const { service, prismaMocks } = dependencies(true);
    const passwordHash = await argon2.hash('password123');
    prismaMocks.user.findUnique.mockResolvedValue({
      ...activeUser,
      emailVerifiedAt: null,
      passwordHash,
    });

    await expect(
      service.login({ email: activeUser.email, password: 'password123' }, {}),
    ).rejects.toThrow(UnauthorizedException);
  });

  test('login accepts an unverified active user when verification is optional', async () => {
    const { service, prismaMocks } = dependencies();
    const passwordHash = await argon2.hash('password123');
    prismaMocks.user.findUnique.mockResolvedValue({
      ...activeUser,
      emailVerifiedAt: null,
      passwordHash,
    });
    await expect(
      service.login({ email: activeUser.email, password: 'password123' }, {}),
    ).resolves.toHaveProperty('user.email', activeUser.email);
  });

  test('login activates a pending unverified member when verification becomes optional', async () => {
    const { service, prismaMocks } = dependencies();
    const passwordHash = await argon2.hash('password123');
    prismaMocks.user.findUnique.mockResolvedValue({
      ...activeUser,
      status: 'PENDING',
      emailVerifiedAt: null,
      passwordHash,
    });

    await expect(
      service.login({ email: activeUser.email, password: 'password123' }, {}),
    ).resolves.toHaveProperty('user.email', activeUser.email);
    expect(prismaMocks.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: activeUser.id },
        data: { status: 'ACTIVE', emailVerifiedAt: expect.any(Date) },
      }),
    );
  });

  test('refresh revokes the old token and stores a replacement in the same family', async () => {
    const { service, prismaMocks, transaction } = dependencies();
    prismaMocks.refreshToken.findFirst.mockResolvedValue({
      id: 'refresh-1',
      userId: activeUser.id,
      hashedToken: 'old-hash',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: activeUser,
    });
    const result = await service.refresh('old-raw-token', { userAgent: 'test-agent', ip: '127.0.0.1' });
    expect(result.accessToken).toBe('signed-access-token');
    expect(result.refreshToken).not.toBe('old-raw-token');
    expect(transaction.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'refresh-1' }) }),
    );
    expect(transaction.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ familyId: 'family-1', userAgent: 'test-agent' }),
      }),
    );
  });

  test('reuse of a revoked refresh token revokes the account family and audits the event', async () => {
    const { service, prismaMocks, transaction } = dependencies();
    prismaMocks.refreshToken.findFirst.mockResolvedValue({
      id: 'refresh-revoked',
      userId: activeUser.id,
      familyId: 'family-1',
      revokedAt: new Date(),
    });
    await expect(service.refresh('reused-token', {})).rejects.toThrow(UnauthorizedException);
    expect(prismaMocks.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: activeUser.id, revokedAt: null },
      }),
    );
    expect(prismaMocks.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'auth.refresh.reuse_detected' }),
      }),
    );
    expect(transaction.refreshToken.create).not.toHaveBeenCalled();
  });

  test('password reset consumes its token, revokes sessions, and writes an audit event', async () => {
    const { service, prismaMocks, transaction } = dependencies();
    prismaMocks.passwordResetToken.findFirst.mockResolvedValue({
      id: 'reset-1',
      userId: activeUser.id,
    });
    await service.resetPassword('one-time-token', 'new-password123');
    expect(transaction.passwordResetToken.updateMany).toHaveBeenCalledTimes(1);
    expect(transaction.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: activeUser.id, revokedAt: null } }),
    );
    expect(transaction.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'auth.password.reset' }),
      }),
    );
  });

  test.each(['expired', 'used'])('rejects a %s reset token', async () => {
    const { service, prismaMocks } = dependencies();
    prismaMocks.passwordResetToken.findFirst.mockResolvedValue(null);
    await expect(service.resetPassword('invalid-token', 'new-password123')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  test.each(['expired', 'used'])('rejects a %s email verification token', async () => {
    const { service, prismaMocks } = dependencies();
    prismaMocks.emailVerificationToken.findFirst.mockResolvedValue(null);
    await expect(service.verifyEmail('invalid-token')).rejects.toThrow(UnauthorizedException);
  });
});

describe('RolesGuard', () => {
  test('denies a member access to an admin route', () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => ['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'MEMBER' } }),
      }),
    };
    expect(() => guard.canActivate(context as never)).toThrow(ForbiddenException);
  });
});
