import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { TrainersService } from '../src/trainers/trainers.service';
import { AuditLogService } from '../src/audit/audit-log.service';

describe('trainer and appointment access', () => {
  const database = new PrismaService();

  beforeAll(async () => {
    await database.$connect();
  });

  afterAll(async () => {
    await database.$disconnect();
  });

  it('rejects an appointment whose time overlaps an existing request', async () => {
    const prismaMock = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'trainer-id',
          trainerProfile: { id: 'trainer-profile-id' },
        }),
      },
      $transaction: jest.fn(async (operation: (transaction: unknown) => Promise<unknown>) =>
        operation({
          trainerProfile: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
          trainerAvailability: {
            count: jest.fn().mockResolvedValue(0),
            findFirst: jest.fn(),
          },
          appointment: {
            findFirst: jest.fn().mockResolvedValue({ id: 'existing-appointment' }),
            create: jest.fn(),
          },
        }),
      ),
    };
    const service = new TrainersService(
      prismaMock as unknown as PrismaService,
      {} as never,
    );
    const startsAt = new Date(Date.now() + 86_400_000);

    await expect(
      service.requestAppointment('member-id', {
        trainerId: 'trainer-id',
        startsAt,
        endsAt: new Date(startsAt.getTime() + 3_600_000),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not query workout data when the trainer is not assigned to the member', async () => {
    const prismaMock = {
      trainerClient: { findUnique: jest.fn().mockResolvedValue(null) },
      workoutLog: { findMany: jest.fn() },
    };
    const service = new TrainersService(
      prismaMock as unknown as PrismaService,
      {} as never,
    );

    await expect(
      service.clientWorkoutProgress('trainer-id', 'other-member-id', {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.workoutLog.findMany).not.toHaveBeenCalled();
  });

  it('returns a client profile only after confirming the trainer assignment', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'member-id',
      email: 'member@example.test',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      profile: { name: 'Member', phone: null },
    });
    const prismaMock = {
      trainerClient: { findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE' }) },
      user: { findFirst },
    };
    const service = new TrainersService(
      prismaMock as unknown as PrismaService,
      {} as never,
    );

    await expect(service.clientProfile('trainer-id', 'member-id')).resolves.toMatchObject({
      id: 'member-id',
      profile: { name: 'Member' },
    });
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'member-id', role: 'MEMBER', status: 'ACTIVE' },
    }));
  });

  it('serializes two concurrent bookings so only one can reserve an overlapping slot', async () => {
    const trainer = await database.user.findUniqueOrThrow({
      where: { email: 'trainer@ironpulse.test' },
      select: { id: true },
    });
    const [memberOne, memberTwo] = await Promise.all([
      database.user.findUniqueOrThrow({
        where: { email: 'member2@ironpulse.test' },
        select: { id: true },
      }),
      database.user.findUniqueOrThrow({
        where: { email: 'member3@ironpulse.test' },
        select: { id: true },
      }),
    ]);
    const startsAt = new Date();
    startsAt.setUTCDate(startsAt.getUTCDate() + 30);
    while (startsAt.getUTCDay() === 0 || startsAt.getUTCDay() === 6) {
      startsAt.setUTCDate(startsAt.getUTCDate() + 1);
    }
    startsAt.setUTCHours(12, 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    const service = new TrainersService(
      database,
      { record: jest.fn() } as unknown as AuditLogService,
    );

    const outcomes = await Promise.allSettled([
      service.requestAppointment(memberOne.id, { trainerId: trainer.id, startsAt, endsAt }),
      service.requestAppointment(memberTwo.id, { trainerId: trainer.id, startsAt, endsAt }),
    ]);

    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
    expect(rejected?.status).toBe('rejected');
    if (rejected?.status === 'rejected') {
      expect(rejected.reason).toBeInstanceOf(ConflictException);
    }
    expect(
      await database.appointment.count({ where: { trainerId: trainer.id, startsAt } }),
    ).toBe(1);
    await database.appointment.deleteMany({ where: { trainerId: trainer.id, startsAt } });
  });
});
