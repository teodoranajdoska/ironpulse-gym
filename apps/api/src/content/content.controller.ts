import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z, ZodError, ZodType } from 'zod';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import {
  gymRuleSchema,
  gymSettingSchema,
  localeSchema,
  trialRequestSchema,
  trialStatusSchema,
  updateGymRuleSchema,
} from './content.schemas';
import { ContentService } from './content.service';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('rules')
  @Public()
  @ApiOperation({ summary: 'Get gym rules in the requested locale' })
  rules(
    @Query('locale') requestedLocale?: string,
    @Headers('accept-language') language?: string,
  ) {
    const candidate = requestedLocale ?? language?.split(',')[0]?.split('-')[0] ?? 'mk';
    return this.content.getRules(this.parse(localeSchema, candidate) ?? 'mk');
  }

  @Get('settings')
  @Public()
  @ApiOperation({ summary: 'Get public gym contact and opening-hour settings' })
  settings() {
    return this.content.getSettings();
  }

  @Post('trial-requests')
  @Public()
  @Throttle({ short: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request a free trial' })
  @ApiBody({
    schema: {
      example: {
        name: 'Alex Example',
        email: 'alex@example.com',
        phone: '+38970123456',
        preferredDate: '2026-11-01T10:00:00.000Z',
      },
    },
  })
  createTrialRequest(@Body() body: unknown) {
    return this.content.createTrialRequest(this.parse(trialRequestSchema, body));
  }

  @Get('admin/rules')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  listRules(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.content.listRules({ page, pageSize });
  }

  @Post('admin/rules')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  createRule(@CurrentUser() user: AuthenticatedRequest['user'], @Body() body: unknown) {
    return this.content.createRule(this.actorId(user), this.parse(gymRuleSchema, body));
  }

  @Patch('admin/rules/:id')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  updateRule(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.content.updateRule(this.actorId(user), id, this.parse(updateGymRuleSchema, body));
  }

  @Delete('admin/rules/:id')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  deleteRule(@CurrentUser() user: AuthenticatedRequest['user'], @Param('id') id: string) {
    return this.content.deleteRule(this.actorId(user), id);
  }

  @Put('admin/settings')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  @ApiBody({ schema: { example: { key: 'opening_hours', value: 'Mon-Fri 06:00-22:00' } } })
  upsertSetting(@CurrentUser() user: AuthenticatedRequest['user'], @Body() body: unknown) {
    return this.content.upsertSetting(this.actorId(user), this.parse(gymSettingSchema, body));
  }

  @Get('admin/trial-requests')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  listTrialRequests(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    return this.content.listTrialRequests({ page, pageSize, status });
  }

  @Patch('admin/trial-requests/:id')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  @ApiBody({ schema: { example: { status: 'CONTACTED' } } })
  updateTrialRequest(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = this.parseObject(body);
    return this.content.updateTrialStatus(
      this.actorId(user),
      id,
      this.parse(trialStatusSchema, input.status),
    );
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

  private parseObject(value: unknown): Record<string, unknown> {
    return this.parse(z.record(z.unknown()), value);
  }

  private actorId(user: AuthenticatedRequest['user']): string {
    if (!user) throw new BadRequestException('Authenticated actor missing.');
    return user.id;
  }
}
