import { describe, expect, it } from 'vitest';
import { contactFormSchema } from '../lib/contact-schema';

const validMessage = {
  name: 'Alex Example',
  email: 'alex@example.com',
  phone: '',
  subject: 'Membership question',
  message: 'Could you tell me more about the available plans?',
};

describe('contact form validation', () => {
  it('accepts valid required fields and an empty optional phone', () => {
    expect(contactFormSchema.safeParse(validMessage).success).toBe(true);
  });

  it('rejects invalid emails and fields outside the sensible length bounds', () => {
    const result = contactFormSchema.safeParse({
      ...validMessage,
      name: 'A',
      email: 'not-an-email',
      subject: 'Hi',
      message: 'Short',
      phone: '1'.repeat(31),
    });

    expect(result.success).toBe(false);
  });

  it('trims values before returning the typed payload', () => {
    const result = contactFormSchema.parse({
      ...validMessage,
      name: '  Alex Example  ',
      email: ' alex@example.com ',
      subject: ' Membership question ',
    });

    expect(result.name).toBe('Alex Example');
    expect(result.email).toBe('alex@example.com');
    expect(result.subject).toBe('Membership question');
  });
});
