import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AppConfigService } from './config/app-config.service';
import { envSchema } from './config/env';
import { ContentModule } from './content/content.module';
import { MembershipsModule } from './memberships/memberships.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MachinesModule } from './machines/machines.module';
import { WorkoutsModule } from './workouts/workouts.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { TrainersModule } from './trainers/trainers.module';
import { SponsorsModule } from './sponsors/sponsors.module';
import { AdminModule } from './admin/admin.module';
import { PrivacyModule } from './privacy/privacy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60_000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    ContentModule,
    MembershipsModule,
    MachinesModule,
    WorkoutsModule,
    NutritionModule,
    TrainersModule,
    SponsorsModule,
    AdminModule,
    PrivacyModule,
    PrismaModule,
  ],
  controllers: [HealthController],
  providers: [
    AppConfigService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
