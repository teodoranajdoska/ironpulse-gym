import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const demoEmail = { endsWith: '@ironpulse.test' };

describe('Phase 3D demo seed', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates the documented role counts and a complete set of role demos', async () => {
    const [admins, trainers, members, sponsors, machines, exercises, plans, auditEntries] =
      await Promise.all([
        prisma.user.count({ where: { role: 'ADMIN', email: demoEmail } }),
        prisma.user.count({ where: { role: 'TRAINER', email: demoEmail } }),
        prisma.user.count({ where: { role: 'MEMBER', email: demoEmail } }),
        prisma.user.count({ where: { role: 'SPONSOR', email: demoEmail } }),
        prisma.machine.count(),
        prisma.exercise.count(),
        prisma.nutritionPlan.count({
          where: { member: { email: demoEmail } },
        }),
        prisma.auditLog.count({ where: { id: { startsWith: 'demo-audit-' } } }),
      ]);

    expect({ admins, trainers, members, sponsors }).toEqual({
      admins: 1,
      trainers: 3,
      members: 12,
      sponsors: 3,
    });
    expect(machines).toBe(14);
    expect(exercises).toBe(28);
    const seededMachines = await prisma.machine.findMany({
      include: { muscles: true, exercises: true },
    });
    for (const machine of seededMachines) {
      expect(machine.animationKey).toBe(machine.slug);
      expect(machine.imageUrl).toBe(`/machines/${machine.slug}.svg`);
      expect(machine.muscles.length).toBeGreaterThan(0);
      expect(machine.exercises).toHaveLength(2);
      for (const exercise of machine.exercises) {
        expect(exercise.stepsEn).toEqual(expect.arrayContaining([expect.any(String)]));
        expect(exercise.commonMistakesEn).toEqual(expect.arrayContaining([expect.any(String)]));
        expect(exercise.safetyTipsEn).toEqual(expect.arrayContaining([expect.any(String)]));
        expect(exercise.recommendedSets).toBeGreaterThan(0);
        expect(exercise.recommendedReps).toBeGreaterThan(0);
        expect(exercise.youtubeVideoId).toMatch(/^[A-Za-z0-9_-]{11}$/);
      }
    }
    expect(plans).toBe(4);
    expect(auditEntries).toBeGreaterThanOrEqual(20);
  });

  it('seeds the membership mix, trainer relationships and workout progress', async () => {
    const [active, pending, firstExpired, secondExpired, memberHistory, noMemberships, trainerClients, workouts] =
      await Promise.all([
        prisma.membership.count({
          where: { status: 'ACTIVE', user: { email: demoEmail } },
        }),
        prisma.membership.count({
          where: { status: 'PENDING', user: { email: demoEmail } },
        }),
        prisma.membership.findUniqueOrThrow({
          where: { id: 'demo-expired-1' },
          select: { endsAt: true },
        }),
        prisma.membership.findUniqueOrThrow({
          where: { id: 'demo-expired-2' },
          select: { endsAt: true },
        }),
        prisma.membership.groupBy({
          by: ['userId'],
          where: { user: { email: demoEmail } },
        }),
        prisma.user.count({
          where: {
            email: { in: ['member2@ironpulse.test', 'member11@ironpulse.test', 'member12@ironpulse.test'] },
            memberships: { none: {} },
          },
        }),
        prisma.trainerClient.count({
          where: { member: { email: demoEmail }, status: 'ACTIVE' },
        }),
        prisma.workoutLog.count({
          where: {
            id: { startsWith: 'demo-workout-' },
            member: { email: demoEmail },
          },
        }),
      ]);

    expect(active).toBe(5);
    expect(pending).toBe(2);
    expect(firstExpired.endsAt?.getTime()).toBeLessThan(Date.now());
    expect(secondExpired.endsAt?.getTime()).toBeLessThan(Date.now());
    expect(memberHistory).toHaveLength(9);
    expect(noMemberships).toBe(3);
    expect(trainerClients).toBe(12);
    expect(workouts).toBe(480);
    expect(await prisma.paymentRecord.count({
      where: { id: { startsWith: 'demo-pending-payment-' }, status: 'PENDING' },
    })).toBe(2);
  });

  it('keeps dashboard dates current and supplies 30 days of sponsor activity', async () => {
    const now = new Date();
    const oldestWorkoutDay = new Date(now);
    oldestWorkoutDay.setUTCDate(oldestWorkoutDay.getUTCDate() - 70);
    const oldestSponsorDay = new Date(now);
    oldestSponsorDay.setUTCDate(oldestSponsorDay.getUTCDate() - 30);
    const futureLimit = new Date(now);
    futureLimit.setUTCDate(futureLimit.getUTCDate() + 1);

    const [activeMemberships, workoutLogs, stats, trialStatuses, memberCreatedAt, revenuePaymentDates] = await Promise.all([
      prisma.membership.findMany({
        where: { id: { startsWith: 'demo-active-' } },
        orderBy: { id: 'asc' },
        select: { endsAt: true },
      }),
      prisma.workoutLog.findMany({
        where: { id: { startsWith: 'demo-workout-' } },
        select: { performedAt: true },
      }),
      prisma.sponsorStatDaily.findMany({
        where: { sponsor: { user: { email: demoEmail } } },
        orderBy: { day: 'asc' },
        select: { day: true, impressions: true, clicks: true },
      }),
      prisma.trialRequest.groupBy({
        by: ['status'],
        where: { id: { startsWith: 'demo-trial-' } },
        _count: { status: true },
      }),
      prisma.user.findMany({
        where: { role: 'MEMBER', email: demoEmail },
        select: { createdAt: true },
      }),
      prisma.paymentRecord.findMany({
        where: { id: { startsWith: 'demo-revenue-payment-' } },
        select: { confirmedAt: true },
      }),
    ]);

    const fiveDayExpiry = activeMemberships[0]?.endsAt;
    expect(fiveDayExpiry).toBeDefined();
    expect(fiveDayExpiry!.getTime()).toBeGreaterThan(now.getTime());
    expect(fiveDayExpiry!.getTime()).toBeLessThan(Date.now() + 6 * 24 * 60 * 60 * 1000);
    expect(activeMemberships[1]?.endsAt?.getTime()).toBeGreaterThan(
      Date.now() + 20 * 24 * 60 * 60 * 1000,
    );
    expect(activeMemberships[1]?.endsAt?.getTime()).toBeLessThan(
      Date.now() + 22 * 24 * 60 * 60 * 1000,
    );
    expect(workoutLogs.every(({ performedAt }) => performedAt <= futureLimit)).toBe(true);
    expect(workoutLogs.every(({ performedAt }) => performedAt >= oldestWorkoutDay)).toBe(true);
    expect(stats).toHaveLength(90);
    expect(stats.every(({ impressions, clicks }) => impressions > 0 && clicks > 0)).toBe(true);
    expect(stats[0]?.day >= oldestSponsorDay.toISOString().slice(0, 10)).toBe(true);
    expect(stats[stats.length - 1]?.day <= futureLimit.toISOString().slice(0, 10)).toBe(true);
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setUTCDate(1);
    sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);
    expect(memberCreatedAt.every(({ createdAt }) =>
      createdAt >= sixMonthsAgo && createdAt <= futureLimit,
    )).toBe(true);
    expect(revenuePaymentDates).toHaveLength(27);
    expect(revenuePaymentDates.every(({ confirmedAt }) =>
      confirmedAt !== null && confirmedAt >= sixMonthsAgo && confirmedAt <= futureLimit,
    )).toBe(true);
    expect(trialStatuses).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 'NEW', _count: { status: 4 } }),
      expect.objectContaining({ status: 'CONTACTED', _count: { status: 4 } }),
      expect.objectContaining({ status: 'CONVERTED', _count: { status: 4 } }),
    ]));
  });
});
