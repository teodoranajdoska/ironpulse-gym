import { z } from 'zod';

export const contactFormSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(5000),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
export type ContactField = keyof ContactFormValues;
