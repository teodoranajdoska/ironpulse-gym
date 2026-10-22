import { z } from 'zod';
import { APP_NAME } from '@ironpulse/shared';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  EMAIL_VERIFICATION_REQUIRED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  AUTO_SEED_DEMO_USERS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM: z.string().default('noreply@ironpulse.local'),
  DEV_MAIL_DIR: z.string().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  WEB_URL: z.string().url().optional(),
  WEB_APP_URL: z.string().url().default('http://localhost:3000'),
  APP_NAME: z.string().default(APP_NAME),
  ANTHROPIC_API_KEY: z.string().default(''),
  ANTHROPIC_MODEL: z.string().min(1).default('claude-3-5-haiku-latest'),
});

export type Env = z.infer<typeof envSchema>;
