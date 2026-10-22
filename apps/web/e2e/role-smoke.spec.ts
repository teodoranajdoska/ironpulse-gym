import { expect, Page, test } from '@playwright/test';

const seededAccounts = [
  { slug: 'member', role: 'MEMBER', email: 'member@ironpulse.test' },
  { slug: 'trainer', role: 'TRAINER', email: 'trainer@ironpulse.test' },
  { slug: 'admin', role: 'ADMIN', email: 'admin@ironpulse.test' },
  { slug: 'sponsor', role: 'SPONSOR', email: 'sponsor@ironpulse.test' },
] as const;

const roleRoutes: Record<(typeof seededAccounts)[number]['slug'], string[]> = {
  member: [
    '/member',
    '/member/membership',
    '/member/nutrition',
    '/member/workouts',
    '/member/machines',
    '/member/trainers',
    '/member/appointments',
    '/member/sponsors',
    '/member/profile',
  ],
  trainer: [
    '/trainer',
    '/trainer/clients',
    '/trainer/appointments',
    '/trainer/nutrition',
    '/trainer/availability',
    '/trainer/profile',
  ],
  admin: [
    '/admin',
    '/admin/users',
    '/admin/memberships',
    '/admin/machines',
    '/admin/exercises',
    '/admin/content',
    '/admin/trials',
    '/admin/sponsors',
    '/admin/analytics',
    '/admin/audit',
  ],
  sponsor: ['/sponsor', '/sponsor/offers', '/sponsor/analytics', '/sponsor/profile'],
};

const responsiveWidths = [320, 350, 360, 390, 768, 1024, 1280, 1536];

async function completeSignIn(page: Page, account: { slug: string; role: string; email: string }, target?: string): Promise<void> {
  await dismissCookieConsent(page);
  await page.locator('input[type="email"]').fill(account.email);
  await page.locator('input[type="password"]').fill('password123');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(target ? new RegExp(`${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) : new RegExp(`/${account.slug}$`));
}

async function dismissCookieConsent(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      document.cookie.split('; ').some((cookie) => cookie.startsWith('user_consent=')) ||
      document.querySelector('#cookie-title') !== null,
  );
  const consentButton = page.locator('aside[aria-labelledby="cookie-title"] button').first();
  if (await consentButton.isVisible()) await consentButton.click();
}

async function signIn(page: Page, account: (typeof seededAccounts)[number]): Promise<void> {
  await page.goto('/login');
  await completeSignIn(page, account);
}

function recordBrowserErrors(page: Page, errors: string[]): void {
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
}

async function expectNoWorkspaceError(page: Page): Promise<void> {
  await expect(page.locator('main h1').first()).toBeVisible();
  const alerts = await page.locator('main [role="alert"]').allTextContents();
  expect(alerts.map((alert) => alert.trim()).filter(Boolean)).toEqual([]);
}

async function visibleContentOutsideViewport(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const selectors = 'main a[href], main button, main input, main select, main h1, main h2, main h3';
    return Array.from(document.querySelectorAll<HTMLElement>(selectors))
      .filter((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.width > 0 && (bounds.left < -1 || bounds.right > window.innerWidth + 1);
      })
      .map((element) => element.textContent?.trim() || element.tagName.toLowerCase());
  });
}

for (const account of seededAccounts) {
  test(`${account.role} can navigate every sidebar route responsively`, async ({ page }) => {
    if (account.slug === 'member') {
      await page.goto('/member/profile');
      await expect(page).toHaveURL(/\/login\?next=%2Fmember%2Fprofile$/);
      await completeSignIn(page, account, '/member/profile');
      await page.goto('/member');
    } else {
      await signIn(page, account);
    }
    const browserErrors: string[] = [];
    recordBrowserErrors(page, browserErrors);

    for (const route of roleRoutes[account.slug]) {
      if (route !== `/${account.slug}`) {
        const link = page.locator(`aside nav a[href="${route}"]`).first();
        await expect(link).toBeVisible();
        await link.click();
        await expect(page).toHaveURL(new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
      }
      await expectNoWorkspaceError(page);
      if (account.slug === 'trainer' && route === '/trainer') {
        await expect(page.locator('main article a[href="/trainer/clients"]')).toBeVisible();
        await expect(page.locator('main article a[href="/trainer/appointments"]').first()).toBeVisible();
      }

      for (const width of responsiveWidths) {
        await page.setViewportSize({ width, height: 900 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(overflow, `${route} overflows at ${width}px`).toBe(false);
        if (account.slug === 'member' && width <= 390) {
          expect(await visibleContentOutsideViewport(page), `${route} has clipped content at ${width}px`).toEqual([]);
        }
      }
      await page.setViewportSize({ width: 1280, height: 900 });
    }
    await page.goto(`/${account.slug}`);
    for (const width of [320, 350, 360, 390]) {
      await page.setViewportSize({ width, height: 568 });
      const trigger = page.locator('button[aria-controls="role-dashboard-navigation"]');
      await trigger.click();
      const menu = page.locator('#role-dashboard-navigation');
      const links = menu.locator('nav a');
      expect(await links.count()).toBe(roleRoutes[account.slug].length);

      for (let index = 0; index < await links.count(); index += 1) {
        const link = links.nth(index);
        await link.scrollIntoViewIfNeeded();
        const bounds = await link.boundingBox();
        expect(bounds, `menu item ${index} is visible at ${width}px`).not.toBeNull();
        if (!bounds) throw new Error(`Menu item ${index} has no visible bounding box at ${width}px.`);
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(568);
      }

      const controls = menu.locator('button, a[href], select');
      const first = controls.first();
      await controls.last().focus();
      await page.keyboard.press('Tab');
      await expect(first).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(trigger).toBeFocused();
    }
    const overviewTrigger = page.locator('button[aria-controls="role-dashboard-navigation"]');
    await overviewTrigger.click();
    await page.locator('#role-dashboard-navigation nav a').last().click();
    await expect(page.locator('#role-dashboard-navigation')).toHaveCount(0);

    const sectionRoute = roleRoutes[account.slug][1];
    await page.goto(sectionRoute);
    const sectionTrigger = page.locator('button[aria-controls="role-dashboard-section-navigation"]');
    await sectionTrigger.click();
    const sectionMenu = page.locator('#role-dashboard-section-navigation');
    expect(await sectionMenu.locator('nav a').count()).toBe(roleRoutes[account.slug].length);
    await page.keyboard.press('Escape');
    await expect(sectionTrigger).toHaveAttribute('aria-expanded', 'false');

    if (account.slug === 'member') {
      await page.goto('/member/machines');
      const machine = page.locator('a[href="/member/machines/leg-press"]').first();
      await expect(machine).toBeVisible();
      await machine.click();
      await expect(page.locator('main h2').filter({ hasText: /преса за нозе|leg press/i })).toBeVisible();
      await expect(page.locator('main ol li').first()).toBeVisible();
      await expect(page.getByText(/чести грешки|common mistakes/i).first()).toBeVisible();
      await expect(page.getByText(/безбедносни совети|safety tips/i).first()).toBeVisible();
      expect(await page.locator('main svg[aria-hidden="true"]').count()).toBeGreaterThan(0);
      for (const width of [320, 350, 360, 390]) {
        await page.setViewportSize({ width, height: 900 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(overflow, `/member/machines/leg-press overflows at ${width}px`).toBe(false);
        expect(await visibleContentOutsideViewport(page), `/member/machines/leg-press has clipped content at ${width}px`).toEqual([]);
      }
      await page.goto('/trainer');
      await expect(page).toHaveURL(/\/member$/);
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/member$/);
    }

    if (account.slug === 'trainer') {
      await page.goto('/trainer/nutrition');
      await page.setViewportSize({ width: 350, height: 800 });
      const memberCard = page.locator('main article:visible').filter({ hasText: 'member@ironpulse.test' });
      await memberCard.getByRole('link').click();
      const editor = page.locator('main textarea');
      await expect(editor).toBeVisible();
      await editor.fill(`${await editor.inputValue()} `);
      await page.getByRole('button', { name: /зачувај промени|save changes/i }).click();
      await expect(page.locator('main [role="status"]')).toContainText(/зачув|saved/i);
      await page.getByRole('button', { name: /зачувај и одобри|save and approve/i }).click();
      await expect(page.locator('main [role="status"]')).toContainText(/одобр|approved/i);
      await expect(page.locator('main select option').first()).toContainText('APPROVED');
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/trainer$/);
    }
    expect(browserErrors).toEqual([]);
  });
}

test('public pages render at mobile and desktop breakpoints', async ({ page }) => {
  for (const route of ['/', '/privacy', '/terms', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email']) {
    await page.goto(route);
    for (const width of responsiveWidths) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, `${route} overflows at ${width}px`).toBe(false);
    }
  }
});

test('public mobile navigation stays reachable on narrow screens', async ({ page }) => {
  for (const width of [320, 350, 360, 390]) {
    await page.setViewportSize({ width, height: 568 });
    await page.goto('/');
    await dismissCookieConsent(page);
    await page.locator('button[aria-controls="mobile-navigation"]').click();
    const menu = page.locator('#mobile-navigation');
    await expect(menu).toBeVisible();
    const links = menu.locator('a');
    for (let index = 0; index < await links.count(); index += 1) {
      const link = links.nth(index);
      await link.scrollIntoViewIfNeeded();
      const bounds = await link.boundingBox();
      expect(bounds).not.toBeNull();
      if (!bounds) throw new Error(`Public menu item ${index} has no visible bounding box at ${width}px.`);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(568);
    }
    const controls = menu.locator('button, a[href], select');
    await controls.last().focus();
    await page.keyboard.press('Tab');
    await expect(controls.first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#mobile-navigation')).toHaveCount(0);
  }
});

test('inactive member sees the membership upgrade prompt on machine detail', async ({ page }) => {
  await page.goto('/login');
  await completeSignIn(page, {
    slug: 'member',
    role: 'MEMBER',
    email: 'member11@ironpulse.test',
  });
  await page.goto('/member/machines/leg-press');
  await expect(page.getByRole('heading', { name: /потребно е активно членство|active membership is needed/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /види ги плановите за членство|view membership plans/i })).toHaveAttribute('href', '/member/membership');
  for (const width of [320, 350, 360, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, `inactive machine detail overflows at ${width}px`).toBe(false);
    expect(await visibleContentOutsideViewport(page), `inactive machine detail has clipped content at ${width}px`).toEqual([]);
  }
});
