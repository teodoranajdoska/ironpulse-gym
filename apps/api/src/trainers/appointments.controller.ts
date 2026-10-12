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
import { ZodError } from 'zod';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import {
  appointmentRequestSchema,
  appointmentUpdateSchema,
} from './trainers.schemas';
import { TrainersService } from './trainers.service';

@ApiTags('appointments')
@ApiCookieAuth('ip_access')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly trainers: TrainersService) {}

  @Post()
  @Roles('MEMBER')
  @ApiOperation({ summary: 'Request a future appointment with a trainer' })
  @ApiBody({
    schema: {
      example: {
        trainerId: 'trainer-id',
        startsAt: '2026-11-02T10:00:00.000Z',
        endsAt: '2026-11-02T11:00:00.000Z',
      },
    },
  })
  request(@CurrentUser() user: AuthenticatedRequest['user'], @Body() body: unknown) {
    return this.trainers.requestAppointment(this.userId(user), this.parse(appointmentRequestSchema, body));
  }

  @Get('me')
  @Roles('MEMBER')
  @ApiOperation({ summary: 'List the authenticated member appointments' })
  memberList(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.trainers.listMemberAppointments(this.userId(user), { page, pageSize });
  }

  @Patch(':appointmentId/cancel')
  @Roles('MEMBER')
  @ApiOperation({ summary: 'Cancel an appointment owned by the authenticated member' })
  cancelMember(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.trainers.cancelMemberAppointment(this.userId(user), appointmentId);
  }

  @Get('trainer')
  @Roles('TRAINER')
  @ApiOperation({ summary: 'List appointments for the authenticated trainer' })
  trainerList(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.trainers.listTrainerAppointments(this.userId(user), { page, pageSize });
  }

  @Patch('trainer/:appointmentId')
  @Roles('TRAINER')
  @ApiOperation({ summary: 'Confirm, cancel, or complete an appointment' })
  updateTrainer(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('appointmentId') appointmentId: string,
    @Body() body: unknown,
  ) {
    return this.trainers.updateTrainerAppointment(
      this.userId(user),
      appointmentId,
      this.parse(appointmentUpdateSchema, body),
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
