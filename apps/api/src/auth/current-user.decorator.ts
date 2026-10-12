import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from './jwt-auth.guard';

export const CurrentUser = createParamDecorator<unknown, ExecutionContext, AuthenticatedRequest['user']>(
  (data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user;
  },
);
