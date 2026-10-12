import { PrismaClient, Role, MachineCategory, ExerciseLevel, SponsorTier, MembershipStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash = await argon2.hash('password123');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ironpulse.local' },
    update: {
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
      profile: { upsert: { update: { name: 'Админ Корисник' }, create: { name: 'Админ Корисник' } } },
    },
    create: {
      email: 'admin@ironpulse.local',
      passwordHash,
      role: Role.ADMIN,
      locale: 'mk',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      profile: {
        create: { name: 'Админ Корисник' },
      },
    },
  });

  const trainerOne = await prisma.user.upsert({
    where: { email: 'trainer1@ironpulse.local' },
    update: {
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
      profile: { upsert: { update: { name: 'Тренер Алекс' }, create: { name: 'Тренер Алекс' } } },
      trainerProfile: {
        upsert: {
          update: { specialties: ['Strength training'] },
          create: { specialties: ['Strength training'] },
        },
      },
    },
    create: {
      email: 'trainer1@ironpulse.local',
      passwordHash,
      role: Role.TRAINER,
      locale: 'mk',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      profile: { create: { name: 'Тренер Алекс' } },
      trainerProfile: { create: { specialties: ['Strength training'] } },
    },
  });

  const trainerTwo = await prisma.user.upsert({
    where: { email: 'trainer2@ironpulse.local' },
    update: {
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
      profile: { upsert: { update: { name: 'Тренер Марина' }, create: { name: 'Тренер Марина' } } },
      trainerProfile: {
        upsert: {
          update: { specialties: ['Personal training'] },
          create: { specialties: ['Personal training'] },
        },
      },
    },
    create: {
      email: 'trainer2@ironpulse.local',
      passwordHash,
      role: Role.TRAINER,
      locale: 'mk',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      profile: { create: { name: 'Тренер Марина' } },
      trainerProfile: { create: { specialties: ['Personal training'] } },
    },
  });

  const members = await Promise.all(
    ['member1@ironpulse.local', 'member2@ironpulse.local', 'member3@ironpulse.local', 'member4@ironpulse.local', 'member5@ironpulse.local'].map(
      async (email, index) => {
        return prisma.user.upsert({
          where: { email },
          update: {
            emailVerifiedAt: new Date(),
            status: 'ACTIVE',
            profile: {
              upsert: {
                update: { name: `Член ${index + 1}` },
                create: { name: `Член ${index + 1}` },
              },
            },
          },
          create: {
            email,
            passwordHash,
            role: Role.MEMBER,
            locale: 'mk',
            status: 'ACTIVE',
            emailVerifiedAt: new Date(),
            profile: { create: { name: `Член ${index + 1}` } },
          },
        });
      },
    ),
  );

  const sponsorOne = await prisma.user.upsert({
    where: { email: 'sponsor1@ironpulse.local' },
    update: {
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
      profile: { upsert: { update: { name: 'Спонзор One' }, create: { name: 'Спонзор One' } } },
    },
    create: {
      email: 'sponsor1@ironpulse.local',
      passwordHash,
      role: Role.SPONSOR,
      locale: 'mk',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      profile: { create: { name: 'Спонзор One' } },
    },
  });

  const sponsorTwo = await prisma.user.upsert({
    where: { email: 'sponsor2@ironpulse.local' },
    update: {
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
      profile: { upsert: { update: { name: 'Спонзор Two' }, create: { name: 'Спонзор Two' } } },
    },
    create: {
      email: 'sponsor2@ironpulse.local',
      passwordHash,
      role: Role.SPONSOR,
      locale: 'mk',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      profile: { create: { name: 'Спонзор Two' } },
    },
  });

  const plans = [
    { name: '1 month', durationMonths: 1, priceMkd: 2000 },
    { name: '3 months', durationMonths: 3, priceMkd: 5500 },
    { name: '6 months', durationMonths: 6, priceMkd: 10000 },
    { name: '12 months', durationMonths: 12, priceMkd: 16000 },
  ];

  for (const plan of plans) {
    await prisma.membershipPlan.upsert({
      where: { id: plan.name },
      update: {},
      create: {
        id: plan.name,
        name: plan.name,
        durationMonths: plan.durationMonths,
        priceMkd: plan.priceMkd,
        isActive: true,
      },
    });
  }

  const machines = [
      { slug: 'barbell-squat', nameMk: 'Штанга клечка', nameEn: 'Barbell squat', category: MachineCategory.LEGS, descriptionMk: 'Класично потисок.', descriptionEn: 'Classic lower-body powerhouse.', difficulty: 2, isPublic: true },
      { slug: 'leg-press', nameMk: 'Прес за нозе', nameEn: 'Leg press', category: MachineCategory.LEGS, descriptionMk: 'Нозе со стабилна контрола.', descriptionEn: 'Controlled leg drive.', difficulty: 1, isPublic: true },
      { slug: 'bench-press', nameMk: 'Лежење', nameEn: 'Bench press', category: MachineCategory.CHEST, descriptionMk: 'Горен дел на телото.', descriptionEn: 'Upper-body pressing.', difficulty: 2, isPublic: true },
      { slug: 'pec-deck', nameMk: 'Пек дек', nameEn: 'Pec deck', category: MachineCategory.CHEST, descriptionMk: 'Изолација на гради.', descriptionEn: 'Chest isolation movement.', difficulty: 1, isPublic: true },
      { slug: 'lat-pulldown', nameMk: 'Лат пулдаун', nameEn: 'Lat pulldown', category: MachineCategory.BACK, descriptionMk: 'Задни мускули.', descriptionEn: 'Back-focused pull.', difficulty: 1, isPublic: true },
      { slug: 'seated-row', nameMk: 'Седечки ред', nameEn: 'Seated row', category: MachineCategory.BACK, descriptionMk: 'Изградба на грб.', descriptionEn: 'Back rowing pattern.', difficulty: 2, isPublic: true },
      { slug: 'overhead-press', nameMk: 'Прес над глава', nameEn: 'Overhead press', category: MachineCategory.SHOULDERS, descriptionMk: 'Работи на раменици.', descriptionEn: 'Shoulder press.', difficulty: 2, isPublic: true },
      { slug: 'lateral-raise', nameMk: 'Латерален повдиг', nameEn: 'Lateral raise', category: MachineCategory.SHOULDERS, descriptionMk: 'Изолација на рамената.', descriptionEn: 'Deltoid isolation.', difficulty: 1, isPublic: true },
      { slug: 'bicep-curl', nameMk: 'Куд цица', nameEn: 'Bicep curl', category: MachineCategory.ARMS, descriptionMk: 'Вработување на бицепсите.', descriptionEn: 'Arm flexion pattern.', difficulty: 1, isPublic: true },
      { slug: 'tricep-pushdown', nameMk: 'Трицепс пушдаун', nameEn: 'Tricep pushdown', category: MachineCategory.ARMS, descriptionMk: 'Изолација на трицепс.', descriptionEn: 'Tricep isolation.', difficulty: 1, isPublic: true },
      { slug: 'plank-station', nameMk: 'Планк станција', nameEn: 'Plank station', category: MachineCategory.CORE, descriptionMk: 'Стабилност на коремните мускули.', descriptionEn: 'Core stability tool.', difficulty: 1, isPublic: true },
      { slug: 'treadmill', nameMk: 'Тредмил', nameEn: 'Treadmill', category: MachineCategory.CARDIO, descriptionMk: 'Кардио работа.', descriptionEn: 'Cardiovascular conditioning.', difficulty: 1, isPublic: true },
    ];
  const muscleAssignments: Record<string, [string, string]> = {
    'barbell-squat': ['quadriceps', 'glutes'],
    'leg-press': ['quadriceps', 'glutes'],
    'bench-press': ['pectorals', 'triceps'],
    'pec-deck': ['pectorals', 'shoulders'],
    'lat-pulldown': ['latissimus dorsi', 'biceps'],
    'seated-row': ['middle back', 'biceps'],
    'overhead-press': ['shoulders', 'triceps'],
    'lateral-raise': ['shoulders', 'trapezius'],
    'bicep-curl': ['biceps', 'forearms'],
    'tricep-pushdown': ['triceps', 'shoulders'],
    'plank-station': ['abdominals', 'obliques'],
    treadmill: ['cardiovascular', 'calves'],
  };
  for (const machine of machines) {
    await prisma.machine.upsert({
      where: { slug: machine.slug },
      update: machine,
      create: machine,
    });
  }

  const machineRecords = await prisma.machine.findMany({
    where: { slug: { in: machines.map(({ slug }) => slug) } },
  });
  for (const machine of machineRecords) {
    const muscleGroups = muscleAssignments[machine.slug];
    if (!muscleGroups) throw new Error(`Missing seeded muscles for machine "${machine.slug}".`);
    for (const [index, muscleGroup] of muscleGroups.entries()) {
      await prisma.machineMuscle.upsert({
        where: { machineId_muscleGroup: { machineId: machine.id, muscleGroup } },
        update: { primary: index === 0 },
        create: { machineId: machine.id, muscleGroup, primary: index === 0 },
      });
    }
    await prisma.exercise.upsert({
      where: { machineId_nameEn: { machineId: machine.id, nameEn: `${machine.nameEn} starter` } },
      update: {
        nameMk: `${machine.nameMk} основен`,
        recommendedSets: 3,
        recommendedReps: 10,
        stepsMk: ['Поставете се во стабилна почетна позиција.', 'Изведете го движењето контролирано.'],
        stepsEn: ['Set a stable starting position.', 'Perform the movement with control.'],
        commonMistakesMk: ['Не користете замав.'],
        commonMistakesEn: ['Avoid using momentum.'],
        safetyTipsMk: ['Започнете со тежина што можете безбедно да ја контролирате.'],
        safetyTipsEn: ['Start with a load you can control safely.'],
      },
      create: {
          machineId: machine.id,
          nameMk: `${machine.nameMk} основен`,
          nameEn: `${machine.nameEn} starter`,
          stepsMk: ['Поставете се во стабилна почетна позиција.', 'Изведете го движењето контролирано.'],
          stepsEn: ['Set a stable starting position.', 'Perform the movement with control.'],
          commonMistakesMk: ['Не користете замав.'],
          commonMistakesEn: ['Avoid using momentum.'],
          safetyTipsMk: ['Започнете со тежина што можете безбедно да ја контролирате.'],
          safetyTipsEn: ['Start with a load you can control safely.'],
          recommendedSets: 3,
          recommendedReps: 10,
          // TODO-replace: install a verified exercise video ID for this machine.
          youtubeVideoId: 'TODO-replace',
          level: ExerciseLevel.BEGINNER,
      },
    });
  }

  const gymRules = [
      { orderIndex: 1, titleMk: 'Почитување на редот', titleEn: 'Respect the queue', bodyMk: 'Кажете ги вашите цели пред тренингот.', bodyEn: 'Set your priorities before each workout.', icon: 'check' },
      { orderIndex: 2, titleMk: 'Заштита на опремата', titleEn: 'Respect equipment', bodyMk: 'Чистете и враќајте опрема.', bodyEn: 'Clean and return equipment after use.', icon: 'shield' },
      { orderIndex: 3, titleMk: 'Руководство за безопасност', titleEn: 'Safety guidance', bodyMk: 'Исполнете техники и безбедносни насоки.', bodyEn: 'Follow technique and safety guidance.', icon: 'warning' },
      { orderIndex: 4, titleMk: 'Лични текови', titleEn: 'Personal flow', bodyMk: 'Оставете простор за други.', bodyEn: 'Leave room for the next athlete.', icon: 'flow' },
      { orderIndex: 5, titleMk: 'Лична хигиена', titleEn: 'Personal hygiene', bodyMk: 'Постојан гигиенски пристап.', bodyEn: 'Use hygiene standards at all times.', icon: 'spark' },
      { orderIndex: 6, titleMk: 'Соработка и почит', titleEn: 'Support and respect', bodyMk: 'Поддржувајте го секој тренинг.', bodyEn: 'Support every training session.', icon: 'heart' },
      { orderIndex: 7, titleMk: 'Соодветна облека', titleEn: 'Wear suitable clothing', bodyMk: 'Носете соодветна облека и обувки за тренинг.', bodyEn: 'Wear appropriate training clothes and shoes.', icon: 'shirt' },
      { orderIndex: 8, titleMk: 'Без стакло', titleEn: 'No glass containers', bodyMk: 'Не внесувајте стаклени шишиња во салата.', bodyEn: 'Do not bring glass containers into the gym.', icon: 'glass' },
      { orderIndex: 9, titleMk: 'Побарајте помош', titleEn: 'Ask for help', bodyMk: 'Прашајте тренер ако не сте сигурни за вежба.', bodyEn: 'Ask a trainer if you are unsure about an exercise.', icon: 'help' },
      { orderIndex: 10, titleMk: 'Уживајте во тренингот', titleEn: 'Enjoy your training', bodyMk: 'Тренирајте одговорно и уживајте во процесот.', bodyEn: 'Train responsibly and enjoy the process.', icon: 'smile' },
    ];
  for (const rule of gymRules) {
    await prisma.gymRule.upsert({
      where: { orderIndex: rule.orderIndex },
      update: {},
      create: rule,
    });
  }

  const settings = [
      { key: 'opening_hours', value: 'Mon-Fri 06:00-22:00, Sat-Sun 08:00-18:00' },
      { key: 'address', value: 'Булевар 12, Скопје' },
      { key: 'phone', value: '+389 02 123 456' },
      { key: 'email', value: 'hello@ironpulse.local' },
  ];
  for (const setting of settings) {
    await prisma.gymSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  const sponsors = [
    { userId: sponsorOne.id, companyName: 'LiftFuel', logoUrl: 'https://example.com/logo1.png', websiteUrl: 'https://example.com', tier: SponsorTier.GOLD, isActive: true },
    { userId: sponsorTwo.id, companyName: 'PureForm', logoUrl: 'https://example.com/logo2.png', websiteUrl: 'https://example.com', tier: SponsorTier.SILVER, isActive: true },
  ];
  for (const sponsor of sponsors) {
    await prisma.sponsor.upsert({
      where: { userId: sponsor.userId },
      update: { companyName: sponsor.companyName, tier: sponsor.tier, isActive: sponsor.isActive },
      create: sponsor,
    });
  }

  const sponsorRecords = await prisma.sponsor.findMany({
    where: { userId: { in: [sponsorOne.id, sponsorTwo.id] } },
  });
  for (const sponsor of sponsorRecords) {
    const discountCode = `${sponsor.companyName.toLowerCase().replace(/\s+/g, '-')}-offer`;
    await prisma.sponsorOffer.upsert({
      where: { discountCode },
      update: { title: `${sponsor.companyName} offer` },
      create: {
        sponsorId: sponsor.id,
        title: `${sponsor.companyName} offer`,
        description: 'Exclusive membership discount for IronPulse members.',
        discountCode,
        validUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      },
    });
    await prisma.sponsorStat.upsert({
      where: { sponsorId: sponsor.id },
      update: {},
      create: { sponsorId: sponsor.id, impressions: 120, clicks: 24 },
    });
  }

  const trainerClients = [
    { trainerId: trainerOne.id, memberId: members[0].id },
    { trainerId: trainerOne.id, memberId: members[1].id },
    { trainerId: trainerTwo.id, memberId: members[2].id },
  ];
  for (const client of trainerClients) {
    await prisma.trainerClient.upsert({
      where: { trainerId_memberId: client },
      update: { status: 'ACTIVE' },
      create: { ...client, status: 'ACTIVE' },
    });
  }

  for (const trainer of [trainerOne, trainerTwo]) {
    for (const weekday of [1, 2, 3, 4, 5]) {
      await prisma.trainerAvailability.upsert({
        where: {
          trainerId_weekday_startsAt: { trainerId: trainer.id, weekday, startsAt: 540 },
        },
        update: { endsAt: 1020 },
        create: { trainerId: trainer.id, weekday, startsAt: 540, endsAt: 1020 },
      });
    }
  }

  const appointmentStart = new Date();
  appointmentStart.setUTCDate(appointmentStart.getUTCDate() + 1);
  while (appointmentStart.getUTCDay() === 0 || appointmentStart.getUTCDay() === 6) {
    appointmentStart.setUTCDate(appointmentStart.getUTCDate() + 1);
  }
  appointmentStart.setUTCHours(10, 0, 0, 0);
  const appointmentEnd = new Date(appointmentStart.getTime() + 60 * 60 * 1000);
  const seededAppointment = await prisma.appointment.findFirst({
    where: {
      trainerId: trainerOne.id,
      memberId: members[0].id,
      startsAt: appointmentStart,
    },
    select: { id: true },
  });
  if (!seededAppointment) {
    await prisma.appointment.create({
      data: {
        trainerId: trainerOne.id,
        memberId: members[0].id,
        startsAt: appointmentStart,
        endsAt: appointmentEnd,
        status: 'CONFIRMED',
        notes: 'Seeded introductory session.',
      },
    });
  }

  const sampleNutritionPlan = await prisma.nutritionPlan.findFirst({
    where: { memberId: members[0].id, source: 'FALLBACK' },
    select: { id: true },
  });
  if (!sampleNutritionPlan) {
    const questionnaire = await prisma.nutritionQuestionnaire.create({
      data: {
        memberId: members[0].id,
        answers: {
          age: 28,
          sex: 'MALE',
          heightCm: 180,
          weightKg: 80,
          goal: 'maintain',
          activityLevel: 'moderate',
          mealsPerDay: 3,
          dietType: 'omnivore',
          allergies: [],
          dislikedFoods: [],
          trainingDaysPerWeek: 4,
        },
        computedBmr: 1805,
        computedTdee: 2798,
        targetCalories: 2798,
        macros: { calories: 2798, proteinG: 144, carbsG: 369, fatG: 64 },
      },
    });
    await prisma.nutritionPlan.create({
      data: {
        memberId: members[0].id,
        questionnaireId: questionnaire.id,
        source: 'FALLBACK',
        status: 'DRAFT',
        planJson: {
          days: Array.from({ length: 7 }, (_, index) => ({
            day: index + 1,
            meals: [
              {
                name: 'Chicken and brown rice bowl',
                ingredients: ['chicken breast', 'brown rice', 'spinach'],
                instructions: ['Cook thoroughly and serve together.'],
                calories: 933,
                proteinG: 48,
                carbsG: 123,
                fatG: 21,
              },
            ],
          })),
        },
      },
    });
  }

  const oneMonthPlan = await prisma.membershipPlan.findUniqueOrThrow({ where: { id: '1 month' } });
  for (const member of members) {
    const activeMembership = await prisma.membership.findFirst({
      where: { userId: member.id, planId: oneMonthPlan.id, status: MembershipStatus.ACTIVE },
      select: { id: true },
    });
    if (!activeMembership) {
      await prisma.membership.create({
        data: {
          userId: member.id,
          planId: oneMonthPlan.id,
          startsAt: new Date(),
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: MembershipStatus.ACTIVE,
        },
      });
    }
  }

  const pendingMember = members[3];
  const pendingPlan = await prisma.membershipPlan.findUniqueOrThrow({ where: { id: '3 months' } });
  const pendingMembership = await prisma.membership.findFirst({
    where: {
      userId: pendingMember.id,
      planId: pendingPlan.id,
      status: MembershipStatus.PENDING,
    },
    select: { id: true },
  });
  if (!pendingMembership) {
    await prisma.membership.create({
      data: {
        userId: pendingMember.id,
        planId: pendingPlan.id,
        startsAt: new Date(),
        status: MembershipStatus.PENDING,
        paymentRecords: {
          create: {
            amountMkd: pendingPlan.priceMkd,
            provider: 'mock',
            status: 'PENDING',
          },
        },
      },
    });
  }

  const squatMachine = await prisma.machine.findUniqueOrThrow({ where: { slug: 'barbell-squat' } });
  const squatExercise = await prisma.exercise.findFirstOrThrow({
    where: { machineId: squatMachine.id },
  });
  const workoutMember = members[0];
  const today = new Date();
  for (let week = 0; week < 8; week += 1) {
    for (let session = 0; session < 2; session += 1) {
      const performedAt = new Date(today);
      performedAt.setDate(performedAt.getDate() - week * 7 - session * 3);
      performedAt.setHours(17, 0, 0, 0);
      const dayStart = new Date(performedAt);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const existingLog = await prisma.workoutLog.findFirst({
        where: {
          memberId: workoutMember.id,
          exerciseId: squatExercise.id,
          performedAt: { gte: dayStart, lt: dayEnd },
        },
        select: { id: true },
      });
      if (!existingLog) {
        await prisma.workoutLog.create({
          data: {
            memberId: workoutMember.id,
            exerciseId: squatExercise.id,
            performedAt,
            sets: {
              create: [1, 2, 3].map((setNumber) => ({
                setNumber,
                reps: 10,
                weightKg: 40 + (7 - week) * 2,
              })),
            },
          },
        });
      }
    }
  }

  const trials = [
      { name: 'Мила Иванова', email: 'mila@example.com', phone: '070123456', preferredDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), status: 'OPEN' as const },
      { name: 'Никола Димитров', email: 'nikola@example.com', phone: '070654321', preferredDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10), status: 'REVIEW' as const },
  ];
  for (const trial of trials) {
    const existingTrial = await prisma.trialRequest.findFirst({
      where: { email: trial.email },
      select: { id: true },
    });
    if (!existingTrial) await prisma.trialRequest.create({ data: trial });
  }

  const seedLog = await prisma.auditLog.findFirst({
    where: { entityId: 'initial-seed' },
    select: { id: true },
  });
  if (!seedLog) {
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: 'seed',
        entity: 'system',
        entityId: 'initial-seed',
        metadata: { source: 'prisma-seed' },
      },
    });
  }

  console.log('Seed completed.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
