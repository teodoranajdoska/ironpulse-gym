import { z } from 'zod';
import { apiPostParsed } from '@/lib/api-client';
import type { ContactFormValues } from '@/lib/contact-schema';

const contactMessageResponseSchema = z.object({ id: z.string() });

// This frontend contract is ready to connect when the API adds this missing endpoint.
export function submitContactMessage(values: ContactFormValues): Promise<{ id: string }> {
  return apiPostParsed('/content/contact-messages', values, contactMessageResponseSchema);
}
