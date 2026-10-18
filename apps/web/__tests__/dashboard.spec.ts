import { describe, expect, it } from 'vitest';
import { dashboardDetailAllowed, safeReturnTo } from '../lib/dashboard';

describe('dashboard detail routes', () => {
  it('allows member machine and exercise detail pages', () => {
    expect(dashboardDetailAllowed('MEMBER', 'machines')).toBe(true);
    expect(dashboardDetailAllowed('MEMBER', 'exercises')).toBe(true);
  });

  describe('post-login redirect destination', () => {
    it('keeps internal return paths and query strings', () => {
      expect(safeReturnTo('/member/profile?tab=privacy', '/member')).toBe('/member/profile?tab=privacy');
    });

    it('falls back to the role dashboard for unsafe redirect targets', () => {
      expect(safeReturnTo('//example.com', '/member')).toBe('/member');
      expect(safeReturnTo('https://example.com', '/member')).toBe('/member');
      expect(safeReturnTo('/\\\\example.com', '/member')).toBe('/member');
      expect(safeReturnTo(null, '/member')).toBe('/member');
    });
  });

  it('allows assigned-client and nutrition review details for trainers', () => {
    expect(dashboardDetailAllowed('TRAINER', 'clients')).toBe(true);
    expect(dashboardDetailAllowed('TRAINER', 'nutrition')).toBe(true);
  });

  it('does not allow detail routes for admin or sponsor dashboards', () => {
    expect(dashboardDetailAllowed('ADMIN', 'machines')).toBe(false);
    expect(dashboardDetailAllowed('SPONSOR', 'offers')).toBe(false);
    expect(dashboardDetailAllowed('MEMBER', 'profile')).toBe(false);
  });
});
