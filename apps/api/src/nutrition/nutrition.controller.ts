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
import { nutritionQuestionnaireSchema, updateNutritionPlanSchema } from './nutrition.schemas';
import { NutritionService } from './nutrition.service';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { ZodError } from 'zod';

@ApiTags('nutrition')
@ApiCookieAuth('ip_access')
@Controller('nutrition')
export class NutritionController {
  constructor(private readonly nutrition: NutritionService) {}

  @Post('questionnaire')
  @Roles('MEMBER')
  @ApiOperation({ summary: 'Calculate nutrition targets and generate a seven-day meal plan' })
  @ApiBody({
    schema: {
      example: {
        age: 30,
        sex: 'FEMALE',
        heightCm: 165,
        weightKg: 65,
        goal: 'maintain',
        activityLevel: 'moderate',
        mealsPerDay: 3,
        dietType: 'vegetarian',
        allergies: ['peanuts'],
        dislikedFoods: [],
        trainingDaysPerWeek: 4,
      },
    },
  })
  generate(@CurrentUser() user: AuthenticatedRequest['user'], @Body() body: unknown) {
    return this.nutrition.generate(this.userId(user), this.parse(nutritionQuestionnaireSchema, body));
  }

  @Get('plans')
  @Roles('MEMBER')
  @ApiOperation({ summary: 'List the authenticated member nutrition plans' })
  list(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.nutrition.listOwn(this.userId(user), { page, pageSize });
  }

  @Get('plans/:planId')
  @Roles('MEMBER')
  @ApiOperation({ summary: 'Get an owned nutrition plan' })
  get(@CurrentUser() user: AuthenticatedRequest['user'], @Param('planId') planId: string) {
    return this.nutrition.getOwn(this.userId(user), planId);
  }

  @Post('plans/:planId/regenerate')
  @Roles('MEMBER')
  @ApiOperation({ summary: 'Regenerate a plan from its saved questionnaire' })
  regenerate(@CurrentUser() user: AuthenticatedRequest['user'], @Param('planId') planId: string) {
    return this.nutrition.regenerate(this.userId(user), planId);
  }

  @Delete('plans/:planId')
  @Roles('MEMBER')
  @ApiOperation({ summary: 'Delete an owned nutrition plan' })
  delete(@CurrentUser() user: AuthenticatedRequest['user'], @Param('planId') planId: string) {
    return this.nutrition.deleteOwn(this.userId(user), planId);
  }

  @Get('clients/:memberId/plans')
  @Roles('TRAINER')
  @ApiOperation({ summary: 'List nutrition plans for an assigned client' })
  clientPlans(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('memberId') memberId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.nutrition.listClientPlans(this.userId(user), memberId, { page, pageSize });
  }

  @Patch('clients/:memberId/plans/:planId')
  @Roles('TRAINER')
  @ApiOperation({ summary: 'Edit an assigned client nutrition plan' })
  edit(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('memberId') memberId: string,
    @Param('planId') planId: string,
    @Body() body: unknown,
  ) {
    const { plan } = this.parse(updateNutritionPlanSchema, body);
    return this.nutrition.editClientPlan(this.userId(user), memberId, planId, plan);
  }

  @Post('clients/:memberId/plans/:planId/approve')
  @Roles('TRAINER')
  @ApiOperation({ summary: 'Approve an assigned client nutrition plan' })
  approve(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Param('memberId') memberId: string,
    @Param('planId') planId: string,
  ) {
    return this.nutrition.approveClientPlan(this.userId(user), memberId, planId);
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
