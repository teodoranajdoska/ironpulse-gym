import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { MailService } from '../src/auth/mail.service';
import { Env } from '../src/config/env';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe('Auth lifecycle (SQLite)', () => {
  let app: INestApplication;
  let agent: ReturnType<typeof request.agent>;
  let prisma: PrismaService;
  let verificationToken = '';
  let csrfToken = '';
  const email = `auth-e2e-${Date.now()}@example.test`;
  const optionalEmail = `auth-optional-e2e-${Date.now()}@example.test`;

  beforeAll(async () => {
    if (!testDatabaseUrl) {
      throw new Error('TEST_DATABASE_URL must be set by the API test runner.');
    }
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.JWT_SECRET = 'e2e-test-secret-with-at-least-32-characters';
    process.env.EMAIL_VERIFICATION_REQUIRED = 'true';
    const { AppModule } = await import('../src/app.module');
    const testingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = testingModule.createNestApplication();
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);
    agent = request.agent(app.getHttpServer());
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { email: { in: [email, optionalEmail] } } });
    }
    await app?.close();
  });

  test('registers, verifies, signs in, refreshes, detects reuse, enforces RBAC, and logs out', async () => {
    const csrf = await agent.get('/auth/csrf').expect(200);
    csrfToken = csrf.body.csrfToken as string;
    await agent
      .post('/auth/register')
      .set('x-csrf-token', csrfToken)
      .send({ email, password: 'strong-password-123', name: 'E2E Member' })
      .expect(201);
    const devEmail = await agent.get('/dev/last-email').query({ to: email }).expect(200);
    verificationToken = new URL(devEmail.body.actionLink as string).searchParams.get('token') ?? '';
    expect(verificationToken).not.toBe('');
    expect(existsSync(devEmail.body.htmlPath as string)).toBe(true);

    await agent
      .post('/auth/verify-email')
      .set('x-csrf-token', csrfToken)
      .send({ token: verificationToken })
      .expect(200);

    const loginResponse = await agent
      .post('/auth/login')
      .set('x-csrf-token', csrfToken)
      .send({ email, password: 'strong-password-123' })
      .expect(200);
    expect(loginResponse.headers['set-cookie']).toBeDefined();
    await agent.get('/content/admin/rules').expect(403);

    await agent.get('/auth/me').expect(200);
    const profile = await agent.get('/me/profile').expect(200);
    expect(profile.body.email).toBe(email);
    expect(profile.body.profile.name).toBe('E2E Member');
    const refreshResponse = await agent
      .post('/auth/refresh')
      .set('x-csrf-token', csrfToken)
      .send({})
      .expect(200);
    expect(refreshResponse.body.user.email).toBe(email);
    await agent.get('/auth/me').expect(200);

    const cookieHeader = loginResponse.headers['set-cookie'];
    const loginCookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader ?? ''];
    const oldRefresh = loginCookies
      .find((cookie) => cookie.startsWith('ip_refresh='))
      ?.split(';', 1)[0]
      ?.slice('ip_refresh='.length);
    expect(oldRefresh).toBeDefined();
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `csrf_token=${csrfToken}; ip_refresh=${oldRefresh}`)
      .set('x-csrf-token', csrfToken)
      .send({})
      .expect(401);

    await agent
      .post('/auth/admin/accounts')
      .set('x-csrf-token', csrfToken)
      .send({ email: `trainer-${Date.now()}@example.test`, name: 'Trainer', role: 'TRAINER' })
      .expect(403);

    const reauthenticated = await agent
      .post('/auth/login')
      .set('x-csrf-token', csrfToken)
      .send({ email, password: 'strong-password-123' })
      .expect(200);
    const currentCookies = reauthenticated.headers['set-cookie'];
    const currentRefresh = (Array.isArray(currentCookies) ? currentCookies : [currentCookies ?? ''])
      .find((cookie) => cookie.startsWith('ip_refresh='))
      ?.split(';', 1)[0]
      ?.slice('ip_refresh='.length);
    expect(currentRefresh).toBeDefined();
    await agent.post('/auth/logout').set('x-csrf-token', csrfToken).send({}).expect(200);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `csrf_token=${csrfToken}; ip_refresh=${currentRefresh}`)
      .set('x-csrf-token', csrfToken)
      .send({})
      .expect(401);
  });

  test('registers and issues a session immediately when verification is optional', async () => {
    const optionalConfig = new ConfigService<Env, true>();
    optionalConfig.set('EMAIL_VERIFICATION_REQUIRED', false);
    optionalConfig.set('JWT_SECRET', 'e2e-test-secret-with-at-least-32-characters');
    optionalConfig.set('NODE_ENV', 'test');
    const optionalService = new AuthService(
      prisma,
      app.get(JwtService),
      optionalConfig,
      app.get(MailService),
    );
    const optionalModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: optionalService },
        { provide: ConfigService, useValue: optionalConfig },
      ],
    }).compile();
    const optionalApp = optionalModule.createNestApplication();
    optionalApp.use(cookieParser());
    await optionalApp.init();
    try {
      const optionalAgent = request.agent(optionalApp.getHttpServer());
      const csrf = await optionalAgent.get('/auth/csrf').expect(200);
      const token = csrf.body.csrfToken as string;
      const response = await optionalAgent
        .post('/auth/register')
        .set('x-csrf-token', token)
        .send({ email: optionalEmail, password: 'strong-password-123', name: 'Optional Member' })
        .expect(201);

      expect(response.body.user.email).toBe(optionalEmail);
      expect(response.headers['set-cookie']).toBeDefined();
      const record = await prisma.user.findUniqueOrThrow({
        where: { email: optionalEmail },
        select: { emailVerifiedAt: true, status: true, emailTokens: { select: { id: true } } },
      });
      expect(record.emailVerifiedAt).toBeInstanceOf(Date);
      expect(record.status).toBe('ACTIVE');
      expect(record.emailTokens).toHaveLength(0);
      await prisma.user.update({
        where: { email: optionalEmail },
        data: { emailVerifiedAt: null, status: 'PENDING' },
      });
      const login = await optionalAgent
        .post('/auth/login')
        .set('x-csrf-token', token)
        .send({ email: optionalEmail, password: 'strong-password-123' })
        .expect(200);
      expect(login.body.user.email).toBe(optionalEmail);
      expect(login.headers['set-cookie']).toBeDefined();
      const activated = await prisma.user.findUniqueOrThrow({
        where: { email: optionalEmail },
        select: { emailVerifiedAt: true, status: true },
      });
      expect(activated.status).toBe('ACTIVE');
      expect(activated.emailVerifiedAt).toBeInstanceOf(Date);
    } finally {
      await optionalApp.close();
    }
  });

  test('allows a seeded admin to log in and preserves the admin role', async () => {
    const adminAgent = request.agent(app.getHttpServer());
    const csrf = await adminAgent.get('/auth/csrf').expect(200);
    const adminCsrf = csrf.body.csrfToken as string;
    const login = await adminAgent
      .post('/auth/login')
      .set('x-csrf-token', adminCsrf)
      .send({ email: 'admin@ironpulse.test', password: 'password123' })
      .expect(200);
    expect(login.body.user.role).toBe('ADMIN');
    const currentUser = await adminAgent.get('/auth/me').expect(200);
    expect(currentUser.body.user.email).toBe('admin@ironpulse.test');
    expect(currentUser.body.user.role).toBe('ADMIN');
  });

  test('serves public gym content and blocks members from admin content routes', async () => {
    const guest = request.agent(app.getHttpServer());
    const rules = await guest.get('/content/rules').expect(200);
    expect(rules.body.length).toBeGreaterThan(0);
    expect(rules.body[0]).toHaveProperty('title');
    const settings = await guest.get('/content/settings').expect(200);
    expect(settings.body.map((setting: { key: string }) => setting.key)).toEqual(
      expect.arrayContaining(['opening_hours', 'address', 'phone', 'email']),
    );
    const machines = await guest.get('/machines?locale=en&category=LEGS').expect(200);
    expect(machines.body.data.map((machine: { slug: string }) => machine.slug)).toContain(
      'barbell-squat',
    );
    const machine = await guest.get('/machines/barbell-squat?locale=en').expect(200);
    expect(machine.body.description).toBeTruthy();
    expect(machine.body.muscles.length).toBeGreaterThan(0);
    expect(machine.body).not.toHaveProperty('exercises');
    const exercise = await prisma.exercise.findFirstOrThrow({
      where: { machine: { slug: 'barbell-squat' } },
      select: { id: true },
    });
    await guest.get(`/exercises/${exercise.id}`).expect(401);

    const csrf = await guest.get('/auth/csrf').expect(200);
    await guest
      .post('/content/trial-requests')
      .set('x-csrf-token', csrf.body.csrfToken as string)
      .send({ name: 'Public Guest', email: 'guest-content@example.test' })
      .expect(201);

  });

  test('requests a membership and activates it after admin payment confirmation', async () => {
    const member = request.agent(app.getHttpServer());
    const memberCsrf = await member.get('/auth/csrf').expect(200);
    const memberToken = memberCsrf.body.csrfToken as string;
    await member
      .post('/auth/login')
      .set('x-csrf-token', memberToken)
      .send({ email, password: 'strong-password-123' })
      .expect(200);
    const pending = await member
      .post('/memberships/request')
      .set('x-csrf-token', memberToken)
      .send({ planId: '1 month' })
      .expect(201);
    expect(pending.body.status).toBe('PENDING');
    expect(pending.body.paymentRecords[0].provider).toBe('mock');

    const admin = request.agent(app.getHttpServer());
    const adminCsrf = await admin.get('/auth/csrf').expect(200);
    await admin
      .post('/auth/login')
      .set('x-csrf-token', adminCsrf.body.csrfToken as string)
      .send({ email: 'admin@ironpulse.test', password: 'password123' })
      .expect(200);
    const confirmed = await admin
      .post(`/memberships/admin/${pending.body.id}/confirm`)
      .set('x-csrf-token', adminCsrf.body.csrfToken as string)
      .expect(201);
    expect(confirmed.body.status).toBe('ACTIVE');
    expect(confirmed.body.endsAt).toBeTruthy();

    const current = await member.get('/memberships/me').expect(200);
    expect(current.body.membership.id).toBe(pending.body.id);
    expect(current.body.daysRemaining).toBeGreaterThan(0);
    const exercise = await prisma.exercise.findFirstOrThrow({
      where: { machine: { slug: 'barbell-squat' } },
      select: { id: true },
    });
    const details = await member.get(`/exercises/${exercise.id}?locale=en`).expect(200);
    expect(details.body.steps.length).toBeGreaterThan(0);
    expect(details.body.commonMistakes.length).toBeGreaterThan(0);
    expect(details.body.safetyTips.length).toBeGreaterThan(0);
    expect(details.body.videoId).toMatch(/^[A-Za-z0-9_-]{11}$/);

    const logged = await member
      .post('/workouts')
      .set('x-csrf-token', memberCsrf.body.csrfToken as string)
      .send({
        exerciseId: exercise.id,
        sets: [
          { reps: 10, weightKg: 50 },
          { reps: 9, weightKg: 50 },
        ],
      })
      .expect(201);
    expect(logged.body.sets).toHaveLength(2);
    await member
      .post('/workouts')
      .set('x-csrf-token', memberCsrf.body.csrfToken as string)
      .send({ exerciseId: exercise.id, sets: [{ reps: 101, weightKg: 50 }] })
      .expect(400);
    const history = await member.get('/workouts').expect(200);
    expect(history.body.data[0].exercise.id).toBe(exercise.id);
    const progress = await member.get(`/workouts/exercises/${exercise.id}/progress`).expect(200);
    expect(progress.body.data.some((point: { id: string }) => point.id === logged.body.id)).toBe(
      true,
    );
    const records = await member.get('/workouts/personal-records').expect(200);
    expect(records.body.data.find((record: { exerciseId: string }) => record.exerciseId === exercise.id))
      .toHaveProperty('maxWeightKg', 50);
  });
});
