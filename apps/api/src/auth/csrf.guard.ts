import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    const cookie = request.cookies?.csrf_token;
    const header = request.header('x-csrf-token');
    if (!cookie || !header || cookie.length !== header.length) {
      throw new ForbiddenException('CSRF validation failed');
    }

    if (!timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) {
      throw new ForbiddenException('CSRF validation failed');
    }

    return true;
  }
}
