import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env';
import { AuditLogModule } from '../audit/audit-log.module';
import {
  AI_PROVIDER,
  AnthropicNutritionProvider,
  FALLBACK_PROVIDER,
  FallbackNutritionProvider,
} from './nutrition-ai.provider';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './nutrition.service';

@Module({
  imports: [AuditLogModule],
  controllers: [NutritionController],
  providers: [
    NutritionService,
    FallbackNutritionProvider,
    AnthropicNutritionProvider,
    {
      provide: FALLBACK_PROVIDER,
      useExisting: FallbackNutritionProvider,
    },
    {
      provide: AI_PROVIDER,
      inject: [ConfigService, AnthropicNutritionProvider, FallbackNutritionProvider],
      useFactory: (
        config: ConfigService<Env, true>,
        anthropic: AnthropicNutritionProvider,
        fallback: FallbackNutritionProvider,
      ) => (config.get('ANTHROPIC_API_KEY') ? anthropic : fallback),
    },
  ],
})
export class NutritionModule {}
