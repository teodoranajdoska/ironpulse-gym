import { PrismaService } from '../src/prisma/prisma.service';
import { AuditLogService } from '../src/audit/audit-log.service';
import { MembershipsService, membershipPeriod } from '../src/memberships/memberships.service';
import { MockPaymentProvider } from '../src/memberships/payment-provider';

describe('MembershipsService', () => {
  test('extends a membership from the existing future end date', () => {
    const now = new Date('2026-10-12T10:00:00.000Z');
    const previousEnd = new Date('2026-11-30T10:00:00.000Z');
    const period = membershipPeriod(3, now, previousEnd);

    expect(period.startsAt).toEqual(previousEnd);
    expect(period.endsAt).toEqual(new Date('2027-02-28T10:00:00.000Z'));
  });

  test('starts a new membership now when the previous end date has passed', () => {
    const now = new Date('2026-10-12T10:00:00.000Z');
    const period = membershipPeriod(1, now, new Date('2026-09-30T10:00:00.000Z'));

    expect(period.startsAt).toEqual(now);
    expect(period.endsAt).toEqual(new Date('2026-11-12T10:00:00.000Z'));
  });

  test('marks only expired active memberships as expired', async () => {
    const prisma = new PrismaService();
    const updateMany = jest
      .spyOn(prisma.membership, 'updateMany')
      .mockResolvedValue({ count: 2 });
    const service = new MembershipsService(
      prisma,
      new AuditLogService(prisma),
      new MockPaymentProvider(),
    );
    const cutoff = new Date('2026-10-12T00:00:00.000Z');

    await expect(service.expireMemberships(cutoff)).resolves.toBe(2);
    expect(updateMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE', endsAt: { lte: cutoff } },
      data: { status: 'EXPIRED' },
    });
    await prisma.$disconnect();
  });
});
