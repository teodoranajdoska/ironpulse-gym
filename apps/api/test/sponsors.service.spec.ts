import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { SponsorsService } from '../src/sponsors/sponsors.service';

describe('sponsor offer ownership', () => {
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
