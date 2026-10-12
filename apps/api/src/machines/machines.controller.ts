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
  Query,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@ironpulse/shared';
import { z, ZodError, ZodTypeAny } from 'zod';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import {
  exerciseSchema,
  localeSchema,
  machineCategorySchema,
  machineSearchSchema,
  machineSchema,
  updateExerciseSchema,
  updateMachineSchema,
} from './machines.schemas';
import { MachinesService } from './machines.service';

@ApiTags('machines')
@Controller()
export class MachinesController {
  constructor(private readonly machines: MachinesService) {}

  @Get('machines')
  @Public()
  @ApiOperation({ summary: 'Search public machines with localized names and muscles' })
  list(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('locale') locale?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Headers('accept-language') language?: string,
  ) {
    const parsedCategory = category ? this.parse(machineCategorySchema, category) : undefined;
    const candidateLocale = locale ?? language?.split(',')[0]?.split('-')[0] ?? 'mk';
    const parsedLocale = this.parse(localeSchema, candidateLocale) ?? 'mk';
    return this.machines.listPublic({
      category: parsedCategory,
      search: search === undefined ? undefined : this.parse(machineSearchSchema, search),
      locale: parsedLocale,
      page,
      pageSize,
    });
  }

  @Get('machines/admin')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  listAdminMachines(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.machines.listAdminMachines({ page, pageSize });
  }

  @Post('machines/admin')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  @ApiBody({
    schema: {
      example: {
        slug: 'leg-press',
        nameMk: 'Преса за нозе',
        nameEn: 'Leg press',
        category: 'LEGS',
        muscles: [{ muscleGroup: 'quadriceps', primary: true }],
      },
    },
  })
  createMachine(@CurrentUser() user: AuthenticatedRequest['user'], @Body() body: unknown) {
    return this.machines.createMachine(this.actorId(user), this.parse(machineSchema, body));
  }

  @Patch('machines/admin/:id')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  updateMachine(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.machines.updateMachine(
      this.actorId(user),
      id,
      this.parse(updateMachineSchema, body),
    );
  }

  @Delete('machines/admin/:id')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  deleteMachine(@CurrentUser() user: AuthenticatedRequest['user'], @Param('id') id: string) {
    return this.machines.hideMachine(this.actorId(user), id);
  }

  @Get('machines/:slug')
  @Public()
  @ApiOperation({ summary: 'Get public machine information without exercise details' })
  detail(
    @Param('slug') slug: string,
    @Query('locale') locale?: string,
    @Headers('accept-language') language?: string,
  ) {
    const candidate = locale ?? language?.split(',')[0]?.split('-')[0] ?? 'mk';
    return this.machines.getPublicDetail(slug, this.parse(localeSchema, candidate) ?? 'mk');
  }

  @Get('machines/:slug/exercises')
  @Roles('MEMBER', 'TRAINER', 'ADMIN')
  @ApiCookieAuth('ip_access')
  fullMachineExercises(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Query('locale') locale?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const actor = this.actor(user);
    const parsedLocale = this.parse(localeSchema, locale ?? 'mk') ?? 'mk';
    return this.machines.getExercisesForMachine(slug, parsedLocale, actor, { page, pageSize });
  }

  @Get('exercises/admin')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  listAdminExercises(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.machines.listAdminExercises({ page, pageSize });
  }

  @Get('exercises/:id')
  @Roles('MEMBER', 'TRAINER', 'ADMIN')
  @ApiCookieAuth('ip_access')
  exercise(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Query('locale') locale?: string,
  ) {
    const actor = this.actor(user);
    const parsedLocale = this.parse(localeSchema, locale ?? 'mk') ?? 'mk';
    return this.machines.getExercise(id, parsedLocale, actor);
  }

  @Post('exercises/admin')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  @ApiBody({
    schema: {
      example: {
        machineId: 'machine-id',
        nameMk: 'Вежба',
        nameEn: 'Exercise',
        stepsMk: ['Поставете ја почетната позиција.'],
        stepsEn: ['Set up the starting position.'],
        videoId: 'dQw4w9WgXcQ',
      },
    },
  })
  createExercise(@CurrentUser() user: AuthenticatedRequest['user'], @Body() body: unknown) {
    return this.machines.createExercise(this.actorId(user), this.parse(exerciseSchema, body));
  }

  @Patch('exercises/admin/:id')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  updateExercise(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.machines.updateExercise(
      this.actorId(user),
      id,
      this.parse(updateExerciseSchema, body),
    );
  }

  @Delete('exercises/admin/:id')
  @Roles('ADMIN')
  @ApiCookieAuth('ip_access')
  deleteExercise(@CurrentUser() user: AuthenticatedRequest['user'], @Param('id') id: string) {
    return this.machines.deleteExercise(this.actorId(user), id);
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

  private actorId(user: AuthenticatedRequest['user']): string {
    return this.actor(user).id;
  }

  private actor(user: AuthenticatedRequest['user']): { id: string; role: UserRole } {
    if (!user) throw new BadRequestException('Authenticated actor missing.');
    return { id: user.id, role: user.role };
  }
}
