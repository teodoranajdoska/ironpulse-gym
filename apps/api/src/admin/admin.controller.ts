import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateAccountInput, createAccountSchema } from '@ironpulse/shared';
import { ZodError } from 'zod';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthService } from '../auth/auth.service';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { userStatusUpdateSchema } from './admin.schemas';

@ApiTags('admin')
@ApiCookieAuth('ip_access')
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly auth: AuthService,
  ) {}

  @Get('users')
  @ApiOperation({ summary: 'Search and filter users' })
  users(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.admin.listUsers({ page, pageSize, role, status, search });
  }

  @Patch('users/:userId/status')
  @ApiOperation({ summary: 'Activate or suspend an account' })
  @ApiBody({ schema: { example: { status: 'SUSPENDED' } } })
  status(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('userId') userId: string,
    @Body() body: unknown,
  ) {
    const { status } = this.parse(userStatusUpdateSchema, body);
    return this.admin.changeUserStatus(this.userId(user), userId, status);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Read membership, revenue, signup, machine, and pending-payment statistics' })
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('audit-log')
  @ApiOperation({ summary: 'List paginated administrative audit records' })
  auditLog(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
  ) {
    return this.admin.auditLog({ page, pageSize, action, entity });
  }

  @Post('accounts')
  @ApiOperation({ summary: 'Create a trainer or sponsor account using the existing invitation flow' })
  @ApiBody({
    schema: { example: { email: 'trainer@example.com', name: 'Trainer Name', role: 'TRAINER' } },
  })
  createAccount(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Body() body: unknown,
    @Headers('accept-language') language?: string,
  ) {
    return this.auth.createPrivilegedAccount(
      this.parse<CreateAccountInput>(createAccountSchema, body),
      this.userId(user),
      language?.toLowerCase().startsWith('mk') ? 'mk' : 'en',
    );
  }

  private userId(user: AuthenticatedRequest['user']): string {
    if (!user) throw new UnauthorizedException('Authentication required.');
    return user.id;
  }

  private parse<T>(schema: { parse(value: unknown): T }, value: unknown): T {
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
}
