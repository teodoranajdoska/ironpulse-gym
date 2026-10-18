import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import {
  CreateAccountInput,
  LoginInput,
  RegisterInput,
  UserRole,
} from '@ironpulse/shared';
import { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';

const ACCESS_COOKIE = 'ip_access';
const REFRESH_COOKIE = 'ip_refresh';
const INVALID_CREDENTIALS = 'Invalid email or password.';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  profile: { name: string | null } | null;
};

export type ClientMeta = {
  userAgent?: string;
  ip?: string;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

function digest(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newToken(): string {
  return randomBytes(32).toString('base64url');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly mail: MailService,
  ) {}

  async register(
    input: RegisterInput,
    locale: string,
    meta: ClientMeta,
  ): Promise<{ message: string; session?: AuthSession }> {
    const passwordHash = await argon2.hash(input.password);
    const rawToken = newToken();
    const verificationRequired = this.emailVerificationRequired();
    const verifiedAt = verificationRequired ? null : new Date();
    let user: AuthUser;
    try {
      user = await this.prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          role: 'MEMBER',
          status: verificationRequired ? 'PENDING' : 'ACTIVE',
          emailVerifiedAt: verifiedAt,
          locale,
          profile: { create: { name: input.name } },
          ...(verificationRequired
            ? {
                emailTokens: {
                  create: {
                    hashedToken: digest(rawToken),
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                  },
                },
              }
            : {}),
        },
        include: { profile: { select: { name: true } } },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('An account with this email already exists.');
      }
      throw error;
    }
    if (verificationRequired) {
      await this.mail.sendVerification(user.email, locale, rawToken);
      return { message: 'Registration successful. Check your email to verify your account.' };
    }
    return {
      message: 'Registration successful.',
      session: await this.createSession(user, meta),
    };
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = digest(rawToken);
    const now = new Date();
    const token = await this.prisma.emailVerificationToken.findFirst({
      where: { hashedToken: tokenHash, usedAt: null, expiresAt: { gt: now } },
      select: { id: true, userId: true },
    });
    if (!token) {
      throw new UnauthorizedException('Verification link is invalid or expired.');
    }

    await this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.emailVerificationToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) {
        throw new UnauthorizedException('Verification link is invalid or expired.');
      }
      await transaction.user.update({
        where: { id: token.userId },
        data: { emailVerifiedAt: now, status: 'ACTIVE' },
      });
    });
  }

  async resendVerification(email: string, locale: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, locale: true, emailVerifiedAt: true, status: true },
    });
    if (!user || user.emailVerifiedAt || user.status !== 'PENDING') {
      return;
    }

    const rawToken = newToken();
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      this.prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          hashedToken: digest(rawToken),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      }),
    ]);
    await this.mail.sendVerification(user.email, user.locale || locale, rawToken);
  }

  async login(input: LoginInput, meta: ClientMeta): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { profile: { select: { name: true } } },
    });
    if (!user) {
      await argon2.hash(input.password);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    const validPassword = await argon2.verify(user.passwordHash, input.password);
    const verificationRequired = this.emailVerificationRequired();
    if (
      !validPassword ||
      (verificationRequired && (!user.emailVerifiedAt || user.status !== 'ACTIVE')) ||
      (user.status !== 'ACTIVE' &&
        (verificationRequired || user.role !== 'MEMBER' || user.status !== 'PENDING'))
    ) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const authenticatedUser =
      !verificationRequired && user.status === 'PENDING'
        ? await this.prisma.user.update({
            where: { id: user.id },
            data: { status: 'ACTIVE', emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
            include: { profile: { select: { name: true } } },
          })
        : user;
    const authUser = this.toAuthUser(authenticatedUser);
    return this.createSession(authUser, meta);
  }

  async refresh(rawToken: string, meta: ClientMeta): Promise<AuthSession> {
    const tokenHash = digest(rawToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { hashedToken: tokenHash },
      include: { user: { include: { profile: { select: { name: true } } } } },
    });
    if (!stored) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    if (stored.revokedAt) {
      await this.prisma.$transaction([
        this.prisma.refreshToken.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        this.prisma.auditLog.create({
          data: {
            actorId: stored.userId,
            action: 'auth.refresh.reuse_detected',
            entity: 'RefreshToken',
            entityId: stored.id,
            metadata: { familyId: stored.familyId },
          },
        }),
      ]);
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    if (stored.expiresAt <= new Date() || stored.user.status !== 'ACTIVE') {
      await this.prisma.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    const nextToken = newToken();
    const now = new Date();
    const changed = await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now },
      });
      if (revoked.count !== 1) {
        await transaction.refreshToken.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: now },
        });
        await transaction.auditLog.create({
          data: {
            actorId: stored.userId,
            action: 'auth.refresh.reuse_detected',
            entity: 'RefreshToken',
            entityId: stored.id,
            metadata: { familyId: stored.familyId },
          },
        });
        return false;
      }
      await transaction.refreshToken.create({
        data: {
          userId: stored.userId,
          hashedToken: digest(nextToken),
          familyId: stored.familyId,
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          userAgent: meta.userAgent,
          ip: meta.ip,
        },
      });
      return true;
    });
    if (!changed) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    const user = this.toAuthUser(stored.user);
    return {
      user,
      refreshToken: nextToken,
      accessToken: await this.accessToken(user),
    };
  }

  async logout(rawToken?: string): Promise<void> {
    if (!rawToken) {
      return;
    }
    await this.prisma.refreshToken.updateMany({
      where: { hashedToken: digest(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async forgotPassword(email: string, locale: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, locale: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      return;
    }
    const rawToken = newToken();
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          hashedToken: digest(rawToken),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      }),
    ]);
    await this.mail.sendPasswordReset(user.email, user.locale || locale, rawToken);
  }

  async resetPassword(rawToken: string, password: string): Promise<void> {
    const now = new Date();
    const token = await this.prisma.passwordResetToken.findFirst({
      where: { hashedToken: digest(rawToken), usedAt: null, expiresAt: { gt: now } },
      select: { id: true, userId: true, purpose: true },
    });
    if (!token) {
      throw new UnauthorizedException('Password reset link is invalid or expired.');
    }
    const passwordHash = await argon2.hash(password);
    await this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.passwordResetToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) {
        throw new UnauthorizedException('Password reset link is invalid or expired.');
      }
      await transaction.user.update({
        where: { id: token.userId },
        data: {
          passwordHash,
          status: 'ACTIVE',
          ...(token.purpose === 'INVITATION' ? { emailVerifiedAt: now } : {}),
        },
      });
      await transaction.refreshToken.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await transaction.auditLog.create({
        data: {
          actorId: token.userId,
          action: token.purpose === 'INVITATION' ? 'auth.password.invitation_completed' : 'auth.password.reset',
          entity: 'User',
          entityId: token.userId,
        },
      });
    });
  }

  async createPrivilegedAccount(
    input: CreateAccountInput,
    actorId: string,
    locale: string,
  ): Promise<{ message: string }> {
    const invitationToken = newToken();
    const provisionalPasswordHash = await argon2.hash(newToken());
    let user: AuthUser;
    try {
      user = await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.user.create({
          data: {
            email: input.email.toLowerCase(),
            passwordHash: provisionalPasswordHash,
            role: input.role,
            status: 'PENDING',
            locale,
            profile: { create: { name: input.name } },
            ...(input.role === 'TRAINER'
              ? { trainerProfile: { create: { specialties: [] } } }
              : { sponsor: { create: { companyName: input.name } } }),
            passwordResetTokens: {
              create: {
                hashedToken: digest(invitationToken),
                purpose: 'INVITATION',
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
              },
            },
          },
          include: { profile: { select: { name: true } } },
        });
        await transaction.auditLog.create({
          data: {
            actorId,
            action: 'admin.account.create',
            entity: 'User',
            entityId: created.id,
            metadata: { role: input.role },
          },
        });
        return created;
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('An account with this email already exists.');
      }
      throw error;
    }
    await this.mail.sendInvitation(user.email, locale, invitationToken);
    return { message: 'Account created. The invitation email has been sent.' };
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: { select: { name: true } } },
    });
    if (
      !user ||
      user.status !== 'ACTIVE' ||
      (this.emailVerificationRequired() && !user.emailVerifiedAt)
    ) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    return this.toAuthUser(user);
  }

  private async createSession(user: AuthUser, meta: ClientMeta): Promise<AuthSession> {
    const refreshToken = newToken();
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        hashedToken: digest(refreshToken),
        familyId: newToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    });
    return { user, accessToken: await this.accessToken(user), refreshToken };
  }

  private accessToken(user: AuthUser): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, role: user.role },
      {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: '15m',
      },
    );
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    role: string;
    profile: { name: string | null } | null;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      profile: user.profile,
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  private emailVerificationRequired(): boolean {
    return this.config.get('EMAIL_VERIFICATION_REQUIRED') === true;
  }
}

export const authCookieNames = { access: ACCESS_COOKIE, refresh: REFRESH_COOKIE } as const;
