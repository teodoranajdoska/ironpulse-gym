import { describe, expect, test } from 'vitest';
import { registerSchema, roleEnum } from '../schemas';

describe('shared validation', () => {
  test('register schema validates a member', () => {
    const parsed = registerSchema.parse({
      email: 'member@example.com',
      password: 'password123',
      name: 'Test User',
      role: 'MEMBER',
    });

    expect(parsed.name).toBe('Test User');
  });

  test('role enum allows the project roles', () => {
    expect(roleEnum.options).toEqual(['MEMBER', 'TRAINER', 'ADMIN', 'SPONSOR']);
  });
});
