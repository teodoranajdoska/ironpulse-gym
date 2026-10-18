import { z } from 'zod';

export const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(['mk', 'en']).default('mk'),
  NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export const webEnv = webEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED: process.env.NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED,
});
