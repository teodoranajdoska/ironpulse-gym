import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ZodError } from 'zod';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import {
  sponsorCreateSchema,
  sponsorOfferSchema,
  sponsorOfferUpdateSchema,
  sponsorProfileSchema,
  sponsorStatusSchema,
} from './sponsors.schemas';
import { SponsorsService } from './sponsors.service';

@ApiTags('sponsors')
@Controller('sponsors')
export class SponsorsController {
  constructor(private readonly sponsors: SponsorsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List active sponsors and current offers' })
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.sponsors.publicList({ page, pageSize });
  }

  @Post(':sponsorId/impressions')
  @Public()
  @Throttle({ short: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Record an anonymous sponsor impression' })
  impression(@Param('sponsorId') sponsorId: string) {
    return this.sponsors.trackImpression(sponsorId);
  }

  @Post('offers/:offerId/click')
  @Public()
  @Throttle({ short: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Record an anonymous sponsor offer click' })
  click(@Param('offerId') offerId: string) {
    return this.sponsors.trackClick(offerId);
  }

  @Get('me')
  @Roles('SPONSOR')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'Read the authenticated sponsor profile and offers' })
  ownProfile(@CurrentUser() user: AuthenticatedRequest['user']) {
    return this.sponsors.ownProfile(this.userId(user));
  }

  @Patch('me')
  @Roles('SPONSOR')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'Update the authenticated sponsor profile' })
  profile(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Body() body: unknown,
  ) {
    return this.sponsors.updateOwnProfile(
      this.userId(user),
      this.parse(sponsorProfileSchema, body),
    );
  }

  @Get('me/stats')
  @Roles('SPONSOR')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'Read aggregate impression and click counts' })
  stats(@CurrentUser() user: AuthenticatedRequest['user']) {
    return this.sponsors.ownStats(this.userId(user));
  }

  @Post('me/offers')
  @Roles('SPONSOR')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'Create a sponsor offer' })
  @ApiBody({
    schema: { example: { title: 'Member discount', description: '10% off', discountCode: 'GYM10' } },
  })
  createOffer(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Body() body: unknown,
  ) {
    return this.sponsors.createOwnOffer(this.userId(user), this.parse(sponsorOfferSchema, body));
  }

  @Patch('me/offers/:offerId')
  @Roles('SPONSOR')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'Update an offer owned by the authenticated sponsor' })
  updateOffer(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('offerId') offerId: string,
    @Body() body: unknown,
  ) {
    return this.sponsors.updateOwnOffer(
      this.userId(user),
      offerId,
      this.parse(sponsorOfferUpdateSchema, body),
    );
  }

  @Delete('me/offers/:offerId')
  @Roles('SPONSOR')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'Delete an offer owned by the authenticated sponsor' })
  deleteOffer(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('offerId') offerId: string,
  ) {
    return this.sponsors.deleteOwnOffer(this.userId(user), offerId);
  }

  @Post('admin')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'Create or activate a sponsor profile for a sponsor account' })
  adminCreate(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Body() body: unknown,
  ) {
    return this.sponsors.adminCreate(this.userId(user), this.parse(sponsorCreateSchema, body));
  }

  @Get('admin')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'List sponsors and their current status' })
  adminList(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.sponsors.adminList({ page, pageSize });
  }

  @Patch('admin/:sponsorId/status')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'Activate or deactivate a sponsor' })
  adminStatus(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('sponsorId') sponsorId: string,
    @Body() body: unknown,
  ) {
    const { isActive } = this.parse(sponsorStatusSchema, body);
    return this.sponsors.adminSetActive(this.userId(user), sponsorId, isActive);
  }

  private userId(user: AuthenticatedRequest['user']): string {
    if (!user) throw new BadRequestException('Authenticated user missing.');
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
