import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UserRole } from '@ironpulse/shared';
import { PrismaService } from '../prisma/prisma.service';
import { Env } from '../config/env';
import { IS_PUBLIC_KEY } from './public.decorator';

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    profile: { name: string | null } | null;
  };
};

type JwtPayload = { sub: string };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.ip_access as string | undefined;
    if (!token) {
      throw new UnauthorizedException('Authentication required.');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Authentication required.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        profile: { select: { name: true } },
      },
    });
    if (!user || user.status !== 'ACTIVE' || !user.emailVerifiedAt) {
      throw new UnauthorizedException('Authentication required.');
    }
    request.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile,
    };
    return true;
  }
}
