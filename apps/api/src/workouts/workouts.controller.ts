import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodError, ZodTypeAny, z } from 'zod';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { createWorkoutSchema, workoutLocaleSchema } from './workouts.schemas';
import { WorkoutsService } from './workouts.service';

@ApiTags('workouts')
@Controller('workouts')
@Roles('MEMBER')
@ApiCookieAuth('ip_access')
export class WorkoutsController {
  constructor(private readonly workouts: WorkoutsService) {}

  @Post()
  @ApiOperation({ summary: 'Log a workout with sets, reps, and weight' })
  @ApiBody({
    schema: {
      example: {
        exerciseId: 'exercise-id',
        performedAt: '2026-10-12T18:00:00.000Z',
        sets: [
          { reps: 10, weightKg: 50 },
          { reps: 9, weightKg: 50 },
        ],
      },
    },
  })
  create(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Body() body: unknown,
  ) {
    return this.workouts.create(this.memberId(user), this.parse(createWorkoutSchema, body));
  }

  @Get()
  @ApiOperation({ summary: 'List the authenticated member workout history' })
  history(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('locale') locale?: string,
  ) {
    return this.workouts.history(this.memberId(user), {
      page,
      pageSize,
      locale: this.parse(workoutLocaleSchema, locale ?? 'mk') ?? 'mk',
    });
  }

  @Get('exercises/:exerciseId/progress')
  @ApiOperation({ summary: 'Get chronological per-exercise progress points' })
  progress(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('exerciseId') exerciseId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.workouts.progress(this.memberId(user), exerciseId, { page, pageSize });
  }

  @Get('personal-records')
  @ApiOperation({ summary: 'Get best weight and volume records per exercise' })
  personalRecords(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('locale') locale?: string,
  ) {
    return this.workouts.personalRecords(this.memberId(user), {
      page,
      pageSize,
      locale: this.parse(workoutLocaleSchema, locale ?? 'mk') ?? 'mk',
    });
  }

  private memberId(user: AuthenticatedRequest['user']): string {
    if (!user) throw new BadRequestException('Authenticated member missing.');
    return user.id;
  }

  private parse<S extends ZodTypeAny>(schema: S, value: unknown): z.output<S> {
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
