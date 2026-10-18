import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodError, ZodType } from 'zod';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import {
  membershipPlanSchema,
  membershipRequestSchema,
  updateMembershipPlanSchema,
} from './memberships.schemas';
import { MembershipsService } from './memberships.service';

@ApiTags('memberships')
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Get('plans')
  @Public()
  @ApiOperation({ summary: 'List active membership plans' })
  plans(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.memberships.listPlans({ page, pageSize });
  }

  @Get('me')
  @Roles('MEMBER')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'Get current membership and remaining days' })
  current(@CurrentUser() user: AuthenticatedRequest['user']) {
    return this.memberships.getCurrent(this.actorId(user));
  }

  @Get('me/days-remaining')
  @Roles('MEMBER')
  @ApiCookieAuth('ip_access')
  daysRemaining(@CurrentUser() user: AuthenticatedRequest['user']) {
    return this.memberships.daysRemaining(this.actorId(user));
  }

  @Get('me/history')
  @Roles('MEMBER')
  @ApiCookieAuth('ip_access')
  history(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.memberships.getHistory(this.actorId(user), { page, pageSize });
  }

  @Post('request')
  @Roles('MEMBER')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'Request a membership and create a mock pending payment' })
  @ApiBody({ schema: { example: { planId: '1 month' } } })
  request(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Body() body: unknown,
  ) {
    return this.memberships.requestMembership(
      this.actorId(user),
      this.parse(membershipRequestSchema, body),
    );
  }

  @Get('admin/pending')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  pending(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.memberships.listPending({ page, pageSize });
  }

  @Get('admin/plans')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'List all membership plans, including inactive plans' })
  adminPlans(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.memberships.listAllPlans({ page, pageSize });
  }

  @Post('admin/:id/confirm')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  confirm(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('id') id: string,
  ) {
    return this.memberships.confirmPayment(this.actorId(user), id);
  }

  @Post('admin/:id/cancel')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  cancel(@CurrentUser() user: AuthenticatedRequest['user'], @Param('id') id: string) {
    return this.memberships.cancel(this.actorId(user), id);
  }

  @Post('admin/plans')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  createPlan(@CurrentUser() user: AuthenticatedRequest['user'], @Body() body: unknown) {
    return this.memberships.createPlan(
      this.actorId(user),
      this.parse(membershipPlanSchema, body),
    );
  }

  @Patch('admin/plans/:id')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  updatePlan(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.memberships.updatePlan(
      this.actorId(user),
      id,
      this.parse(updateMembershipPlanSchema, body),
    );
  }

  @Post('admin/plans/:id/deactivate')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  deactivatePlan(@CurrentUser() user: AuthenticatedRequest['user'], @Param('id') id: string) {
    return this.memberships.deactivatePlan(this.actorId(user), id);
  }

  private parse<T>(schema: ZodType<T>, value: unknown): T {
    try {
      return schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed.',
          issues: error.issues.map(({ path, code }) => ({ path: path.join('.'), code })),
        });
      }
      throw error;
    }
  }

  private actorId(user: AuthenticatedRequest['user']): string {
    if (!user) throw new BadRequestException('Authenticated actor missing.');
    return user.id;
  }
}
