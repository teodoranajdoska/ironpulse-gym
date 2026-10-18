import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { SponsorsService } from '../src/sponsors/sponsors.service';

describe('sponsor offer ownership', () => {
  it('limits public offers to enabled offers that have not expired', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prismaMock = {
      sponsor: { findMany, count },
      $transaction: jest.fn().mockImplementation((queries: unknown[]) => Promise.all(queries)),
    };
    const service = new SponsorsService(
      prismaMock as unknown as PrismaService,
      {} as never,
    );

    await service.publicList({});

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        offers: expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            OR: expect.any(Array),
          }),
        }),
      }),
    }));
  });

  it('lists sponsors with their account, offers, and statistics for admin management', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prismaMock = {
      sponsor: { findMany, count },
      $transaction: jest.fn().mockImplementation((queries: unknown[]) => Promise.all(queries)),
    };
    const service = new SponsorsService(
      prismaMock as unknown as PrismaService,
      {} as never,
    );

    await service.adminList({});

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        user: expect.any(Object),
        offers: expect.any(Object),
        stats: expect.any(Object),
      }),
    }));
  });

  it('does not update an offer belonging to another sponsor', async () => {
    const prismaMock = {
      sponsor: { findUnique: jest.fn().mockResolvedValue({ id: 'sponsor-one' }) },
      sponsorOffer: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const service = new SponsorsService(
      prismaMock as unknown as PrismaService,
      {} as never,
    );

    await expect(
      service.updateOwnOffer('sponsor-one-user', 'sponsor-two-offer', { title: 'Changed' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.sponsorOffer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sponsor-two-offer', sponsorId: 'sponsor-one' },
      }),
    );
  });
});
