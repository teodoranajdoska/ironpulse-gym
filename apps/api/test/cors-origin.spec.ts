import { isAllowedCorsOrigin } from '../src/config/cors-origin';

describe('CORS origin policy', () => {
  const configuredOrigins = ['http://localhost:3000'];

  it('allows configured origins in every environment', () => {
    expect(isAllowedCorsOrigin('http://localhost:3000', configuredOrigins, false)).toBe(true);
  });

  it('allows local development origins on alternate ports', () => {
    expect(isAllowedCorsOrigin('http://localhost:3001', configuredOrigins, true)).toBe(true);
    expect(isAllowedCorsOrigin('http://127.0.0.1:3100', configuredOrigins, true)).toBe(true);
    expect(isAllowedCorsOrigin('http://[::1]:3100', configuredOrigins, true)).toBe(true);
  });

  it('does not broaden production CORS beyond the configured allow-list', () => {
    expect(isAllowedCorsOrigin('http://localhost:3001', configuredOrigins, false)).toBe(false);
    expect(isAllowedCorsOrigin('https://attacker.example', configuredOrigins, true)).toBe(false);
    expect(isAllowedCorsOrigin('http://localhost.evil.example', configuredOrigins, true)).toBe(false);
    expect(isAllowedCorsOrigin(undefined, configuredOrigins, false)).toBe(true);
  });
});
