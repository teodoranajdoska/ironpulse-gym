import * as argon2 from 'argon2';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrivacyService } from '../src/privacy/privacy.service';

describe('privacy export and deletion', () => {
  it('returns the member profile and persisted locale without exposing credentials', async () => {
    const profile = {
      id: 'member-id',
      email: 'member@example.com',
      locale: 'en',
      profile: { name: 'Member', phone: null, birthDate: null, gender: null, heightCm: null, weightKg: null, avatarUrl: null },
    };
    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue(profile) },
    };
    const service = new PrivacyService(prismaMock as unknown as PrismaService);

    await expect(service.getProfile('member-id')).resolves.toEqual(profile);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'member-id' },
      select: expect.objectContaining({ email: true, locale: true, profile: expect.any(Object) }),
    }));
  });

  it('updates profile values and locale and returns the refreshed profile', async () => {
    const updatedProfile = {
      id: 'member-id',
      email: 'member@example.com',
      locale: 'en',
      profile: {
        name: 'Updated Name',
        phone: '+38970000000',
        birthDate: new Date('1990-01-02T00:00:00.000Z'),
        gender: 'FEMALE',
        heightCm: 168,
        weightKg: 62,
        avatarUrl: null,
      },
    };
    const prismaMock = {
      user: {
        update: jest.fn().mockResolvedValue({ id: 'member-id', email: 'member@example.com', locale: 'en' }),
        findUnique: jest.fn().mockResolvedValue(updatedProfile),
      },
      profile: {
        upsert: jest.fn().mockResolvedValue(updatedProfile.profile),
      },
      $transaction: jest.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    const service = new PrivacyService(prismaMock as unknown as PrismaService);

    const result = await service.updateProfile('member-id', {
      name: 'Updated Name',
      phone: '+38970000000',
      birthDate: '1990-01-02',
      gender: 'FEMALE',
      heightCm: 168,
      weightKg: 62,
      locale: 'en',
    });

    expect(result).toEqual(updatedProfile);
    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'member-id' },
      data: { locale: 'en' },
    }));
    expect(prismaMock.profile.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'member-id' },
      update: expect.objectContaining({ birthDate: new Date('1990-01-02T00:00:00.000Z') }),
    }));
  });

  it('exports account data without password hashes or token records', async () => {
    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'member-id', email: 'member@example.com' }) },
      trialRequest: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new PrivacyService(prismaMock as unknown as PrismaService);

    const result = await service.exportUserData('member-id');

    expect(result.user).toEqual({ id: 'member-id', email: 'member@example.com' });
    const query = prismaMock.user.findUnique.mock.calls[0][0];
    expect(query.select).not.toHaveProperty('passwordHash');
    expect(query.select).not.toHaveProperty('refreshTokens');
    expect(query.select).not.toHaveProperty('passwordResetTokens');
  });

  it('anonymizes a confirmed account, revokes sessions, and preserves aggregate memberships', async () => {
    const passwordHash = await argon2.hash('correct-password');
    const transaction = {
      sponsor: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
      refreshToken: { deleteMany: jest.fn() },
      emailVerificationToken: { deleteMany: jest.fn() },
      passwordResetToken: { deleteMany: jest.fn() },
      appointment: { deleteMany: jest.fn() },
      trainerClient: { deleteMany: jest.fn() },
      trainerAvailability: { deleteMany: jest.fn() },
      workoutLog: { deleteMany: jest.fn() },
      nutritionPlan: { deleteMany: jest.fn() },
      nutritionQuestionnaire: { deleteMany: jest.fn() },
      nutritionGenerationQuota: { deleteMany: jest.fn() },
      membership: { updateMany: jest.fn() },
      paymentRecord: { updateMany: jest.fn() },
      trialRequest: { updateMany: jest.fn() },
      sponsorOffer: { deleteMany: jest.fn() },
      trainerProfile: { deleteMany: jest.fn() },
      profile: { deleteMany: jest.fn() },
      auditLog: { updateMany: jest.fn() },
      user: { update: jest.fn() },
    };
    const prismaMock = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'member-id',
          email: 'member@example.com',
          passwordHash,
          status: 'ACTIVE',
        }),
      },
      $transaction: jest.fn(async (operation: (tx: unknown) => Promise<unknown>) =>
        operation(transaction),
      ),
    };
    const service = new PrivacyService(prismaMock as unknown as PrismaService);

    const result = await service.anonymizeUser('member-id', 'correct-password');

    expect(result.message).toContain('anonymized');
    expect(transaction.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'member-id' },
    });
    expect(transaction.membership.updateMany).toHaveBeenCalledWith({
      where: { userId: 'member-id' },
      data: { userId: null },
    });
    expect(transaction.paymentRecord.updateMany).toHaveBeenCalled();
    expect(transaction.trialRequest.updateMany).toHaveBeenCalled();
    expect(transaction.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'member-id' },
        data: expect.objectContaining({
          email: 'deleted-member-id@deleted.invalid',
          status: 'DELETED',
          emailVerifiedAt: null,
        }),
      }),
    );
  });

  it('does not alter data when password confirmation fails', async () => {
    const passwordHash = await argon2.hash('correct-password');
    const prismaMock = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'member-id',
          email: 'member@example.com',
          passwordHash,
          status: 'ACTIVE',
        }),
      },
      $transaction: jest.fn(),
    };
    const service = new PrivacyService(prismaMock as unknown as PrismaService);

    await expect(
      service.anonymizeUser('member-id', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
