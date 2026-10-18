import { describe, expect, it } from 'vitest';
import { localizedSeedCopy } from '../lib/localized-copy';

describe('localizedSeedCopy', () => {
  it('selects the requested translation from seeded content', () => {
    const value = 'Понеделник–петок / Monday–Friday';

    expect(localizedSeedCopy(value, 'mk')).toBe('Понеделник–петок');
    expect(localizedSeedCopy(value, 'en')).toBe('Monday–Friday');
  });

  it('preserves the development-only prefix for both locales', () => {
    const value = 'DEMO · Скопје / Skopje';

    expect(localizedSeedCopy(value, 'mk')).toBe('DEMO · Скопје');
    expect(localizedSeedCopy(value, 'en')).toBe('DEMO · Skopje');
  });
});
