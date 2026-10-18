import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { ZodError } from 'zod';
import {
  trainerAvailabilitySchema,
  trainerClientSchema,
  trainerProfileSchema,
} from './trainers.schemas';
import { TrainersService } from './trainers.service';

@ApiTags('trainers')
@Controller('trainers')
export class TrainersController {
  constructor(private readonly trainers: TrainersService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List public trainer profiles' })
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.trainers.publicList({ page, pageSize });
  }

  @Put('me/profile')
  @Roles('TRAINER')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'Update the authenticated trainer profile' })
  @ApiBody({
    schema: { example: { bio: 'Strength coach', specialties: ['Strength'], photoUrl: null } },
  })
  profile(@CurrentUser() user: AuthenticatedRequest['user'], @Body() body: unknown) {
    return this.trainers.updateOwnProfile(
      this.userId(user),
      this.parse(trainerProfileSchema, body),
    );
  }

  @Get('me/clients')
  @Roles('TRAINER')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'List the authenticated trainer clients' })
  clients(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.trainers.listClients(this.userId(user), { page, pageSize });
  }

  @Post('me/clients')
  @Roles('TRAINER')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'Assign a member to the authenticated trainer' })
  addClient(@CurrentUser() user: AuthenticatedRequest['user'], @Body() body: unknown) {
    const { memberId } = this.parse(trainerClientSchema, body);
    return this.trainers.addClient(this.userId(user), memberId);
  }

  @Post('me/clients/:memberId/remove')
  @Roles('TRAINER')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'Remove an assigned member from the trainer client list' })
  removeClient(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('memberId') memberId: string,
  ) {
    return this.trainers.removeClient(this.userId(user), memberId);
  }

  @Get('me/clients/:memberId')
  @Roles('TRAINER')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'View basic profile information for an assigned client' })
  clientProfile(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('memberId') memberId: string,
  ) {
    return this.trainers.clientProfile(this.userId(user), memberId);
  }

  @Get('me/clients/:memberId/workouts')
  @Roles('TRAINER')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'View paginated workout progress for an assigned client' })
  clientWorkouts(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('memberId') memberId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.trainers.clientWorkoutProgress(this.userId(user), memberId, { page, pageSize });
  }

  @Get('me/availability')
  @Roles('TRAINER')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'Read the authenticated trainer weekly UTC availability' })
  availability(@CurrentUser() user: AuthenticatedRequest['user']) {
    return this.trainers.getOwnAvailability(this.userId(user));
  }

  @Put('me/availability')
  @Roles('TRAINER')
  @ApiCookieAuth('ip_access')
  @ApiOperation({ summary: 'Replace the authenticated trainer weekly UTC availability' })
  @ApiBody({
    schema: {
      example: { availability: [{ weekday: 1, startsAt: 540, endsAt: 1020 }] },
    },
  })
  setAvailability(@CurrentUser() user: AuthenticatedRequest['user'], @Body() body: unknown) {
    return this.trainers.setAvailability(
      this.userId(user),
      this.parse(trainerAvailabilitySchema, body),
    );
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
