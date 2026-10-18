# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: role-smoke.spec.ts >> SPONSOR can navigate every sidebar route responsively
- Location: e2e\role-smoke.spec.ts:94:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('main h1').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('main h1').first() with timeout 5000ms
  - waiting for locator('main h1').first()

```

```yaml
- alert
- dialog "Server Error":
  - navigation:
    - button "previous" [disabled]:
      - img "previous"
    - button "next" [disabled]:
      - img "next"
    - text: 1 of 1 error Next.js (14.2.15) is outdated
    - link "(learn more)":
      - /url: https://nextjs.org/docs/messages/version-staleness
  - heading "Server Error" [level=1]
  - paragraph: "Error: Authentication service returned 429."
  - text: This error happened while generating the page. Any console logs will be displayed in the terminal window.
  - heading "Source" [level=2]
  - link "middleware.ts (50:27) @ currentUser":
    - text: middleware.ts (50:27) @ currentUser
    - img
  - text: "48 | 49 | if (response.status === 401) return { user: null, cookies }; > 50 | if (!response.ok) throw new Error(`Authentication service returned ${response.status}.`); | ^ 51 | return { user: authMeResponseSchema.parse(await response.json()).user, cookies }; 52 | } 53 |"
  - heading "Call Stack" [level=2]
  - button "Show collapsed frames"
```

# Test source

```ts
  1   | import { expect, Page, test } from '@playwright/test';
  2   | 
  3   | const seededAccounts = [
  4   |   { slug: 'member', role: 'MEMBER', email: 'member@ironpulse.test' },
  5   |   { slug: 'trainer', role: 'TRAINER', email: 'trainer@ironpulse.test' },
  6   |   { slug: 'admin', role: 'ADMIN', email: 'admin@ironpulse.test' },
  7   |   { slug: 'sponsor', role: 'SPONSOR', email: 'sponsor@ironpulse.test' },
  8   | ] as const;
  9   | 
  10  | const roleRoutes: Record<(typeof seededAccounts)[number]['slug'], string[]> = {
  11  |   member: [
  12  |     '/member',
  13  |     '/member/membership',
  14  |     '/member/nutrition',
  15  |     '/member/workouts',
  16  |     '/member/machines',
  17  |     '/member/trainers',
  18  |     '/member/appointments',
  19  |     '/member/sponsors',
  20  |     '/member/profile',
  21  |   ],
  22  |   trainer: [
  23  |     '/trainer',
  24  |     '/trainer/clients',
  25  |     '/trainer/appointments',
  26  |     '/trainer/nutrition',
  27  |     '/trainer/availability',
  28  |     '/trainer/profile',
  29  |   ],
  30  |   admin: [
  31  |     '/admin',
  32  |     '/admin/users',
  33  |     '/admin/memberships',
  34  |     '/admin/machines',
  35  |     '/admin/exercises',
  36  |     '/admin/content',
  37  |     '/admin/trials',
  38  |     '/admin/sponsors',
  39  |     '/admin/analytics',
  40  |     '/admin/audit',
  41  |   ],
  42  |   sponsor: ['/sponsor', '/sponsor/offers', '/sponsor/analytics', '/sponsor/profile'],
  43  | };
  44  | 
  45  | const responsiveWidths = [320, 350, 360, 390, 768, 1024, 1280, 1536];
  46  | 
  47  | async function completeSignIn(page: Page, account: { slug: string; role: string; email: string }, target?: string): Promise<void> {
  48  |   await dismissCookieConsent(page);
  49  |   await page.locator('input[type="email"]').fill(account.email);
  50  |   await page.locator('input[type="password"]').fill('password123');
  51  |   await page.locator('form button[type="submit"]').click();
  52  |   await expect(page).toHaveURL(target ? new RegExp(`${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) : new RegExp(`/${account.slug}$`));
  53  | }
  54  | 
  55  | async function dismissCookieConsent(page: Page): Promise<void> {
  56  |   const consentButton = page.locator('aside[aria-label="Твојата приватност е важна"] button');
  57  |   if (await consentButton.isVisible()) await consentButton.click();
  58  | }
  59  | 
  60  | async function signIn(page: Page, account: (typeof seededAccounts)[number]): Promise<void> {
  61  |   await page.goto('/login');
  62  |   await completeSignIn(page, account);
  63  | }
  64  | 
  65  | function recordBrowserErrors(page: Page, errors: string[]): void {
  66  |   page.on('console', (message) => {
  67  |     if (message.type() === 'error') errors.push(message.text());
  68  |   });
  69  |   page.on('pageerror', (error) => errors.push(error.message));
  70  |   page.on('response', (response) => {
  71  |     if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  72  |   });
  73  | }
  74  | 
  75  | async function expectNoWorkspaceError(page: Page): Promise<void> {
> 76  |   await expect(page.locator('main h1').first()).toBeVisible();
      |                                                 ^ Error: expect(locator).toBeVisible() failed
  77  |   const alerts = await page.locator('main [role="alert"]').allTextContents();
  78  |   expect(alerts.map((alert) => alert.trim()).filter(Boolean)).toEqual([]);
  79  | }
  80  | 
  81  | async function visibleContentOutsideViewport(page: Page): Promise<string[]> {
  82  |   return page.evaluate(() => {
  83  |     const selectors = 'main a[href], main button, main input, main select, main h1, main h2, main h3';
  84  |     return Array.from(document.querySelectorAll<HTMLElement>(selectors))
  85  |       .filter((element) => {
  86  |         const bounds = element.getBoundingClientRect();
  87  |         return bounds.width > 0 && (bounds.left < -1 || bounds.right > window.innerWidth + 1);
  88  |       })
  89  |       .map((element) => element.textContent?.trim() || element.tagName.toLowerCase());
  90  |   });
  91  | }
  92  | 
  93  | for (const account of seededAccounts) {
  94  |   test(`${account.role} can navigate every sidebar route responsively`, async ({ page }) => {
  95  |     if (account.slug === 'member') {
  96  |       await page.goto('/member/profile');
  97  |       await expect(page).toHaveURL(/\/login\?next=%2Fmember%2Fprofile$/);
  98  |       await completeSignIn(page, account, '/member/profile');
  99  |       await page.goto('/member');
  100 |     } else {
  101 |       await signIn(page, account);
  102 |     }
  103 |     const browserErrors: string[] = [];
  104 |     recordBrowserErrors(page, browserErrors);
  105 | 
  106 |     for (const route of roleRoutes[account.slug]) {
  107 |       if (route !== `/${account.slug}`) {
  108 |         const link = page.locator(`aside nav a[href="${route}"]`).first();
  109 |         await expect(link).toBeVisible();
  110 |         await link.click();
  111 |         await expect(page).toHaveURL(new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  112 |       }
  113 |       await expectNoWorkspaceError(page);
  114 |       if (account.slug === 'trainer' && route === '/trainer') {
  115 |         await expect(page.locator('main article a[href="/trainer/clients"]')).toBeVisible();
  116 |         await expect(page.locator('main article a[href="/trainer/appointments"]').first()).toBeVisible();
  117 |       }
  118 | 
  119 |       for (const width of responsiveWidths) {
  120 |         await page.setViewportSize({ width, height: 900 });
  121 |         const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  122 |         expect(overflow, `${route} overflows at ${width}px`).toBe(false);
  123 |         if (account.slug === 'member' && width <= 390) {
  124 |           expect(await visibleContentOutsideViewport(page), `${route} has clipped content at ${width}px`).toEqual([]);
  125 |         }
  126 |       }
  127 |       await page.setViewportSize({ width: 1280, height: 900 });
  128 |     }
  129 |     await page.goto(`/${account.slug}`);
  130 |     for (const width of [320, 350, 360, 390]) {
  131 |       await page.setViewportSize({ width, height: 568 });
  132 |       const trigger = page.locator('button[aria-controls="role-dashboard-navigation"]');
  133 |       await trigger.click();
  134 |       const menu = page.locator('#role-dashboard-navigation');
  135 |       const links = menu.locator('nav a');
  136 |       expect(await links.count()).toBe(roleRoutes[account.slug].length);
  137 | 
  138 |       for (let index = 0; index < await links.count(); index += 1) {
  139 |         const link = links.nth(index);
  140 |         await link.scrollIntoViewIfNeeded();
  141 |         const bounds = await link.boundingBox();
  142 |         expect(bounds, `menu item ${index} is visible at ${width}px`).not.toBeNull();
  143 |         if (!bounds) throw new Error(`Menu item ${index} has no visible bounding box at ${width}px.`);
  144 |         expect(bounds.height).toBeGreaterThanOrEqual(44);
  145 |         expect(bounds.x).toBeGreaterThanOrEqual(0);
  146 |         expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
  147 |         expect(bounds.y).toBeGreaterThanOrEqual(0);
  148 |         expect(bounds.y + bounds.height).toBeLessThanOrEqual(568);
  149 |       }
  150 | 
  151 |       const controls = menu.locator('button, a[href], select');
  152 |       const first = controls.first();
  153 |       await controls.last().focus();
  154 |       await page.keyboard.press('Tab');
  155 |       await expect(first).toBeFocused();
  156 |       await page.keyboard.press('Escape');
  157 |       await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  158 |       await expect(trigger).toBeFocused();
  159 |     }
  160 |     const overviewTrigger = page.locator('button[aria-controls="role-dashboard-navigation"]');
  161 |     await overviewTrigger.click();
  162 |     await page.locator('#role-dashboard-navigation nav a').last().click();
  163 |     await expect(page.locator('#role-dashboard-navigation')).toHaveCount(0);
  164 | 
  165 |     const sectionRoute = roleRoutes[account.slug][1];
  166 |     await page.goto(sectionRoute);
  167 |     const sectionTrigger = page.locator('button[aria-controls="role-dashboard-section-navigation"]');
  168 |     await sectionTrigger.click();
  169 |     const sectionMenu = page.locator('#role-dashboard-section-navigation');
  170 |     expect(await sectionMenu.locator('nav a').count()).toBe(roleRoutes[account.slug].length);
  171 |     await page.keyboard.press('Escape');
  172 |     await expect(sectionTrigger).toHaveAttribute('aria-expanded', 'false');
  173 | 
  174 |     if (account.slug === 'member') {
  175 |       await page.goto('/member/machines');
  176 |       const machine = page.locator('a[href="/member/machines/leg-press"]').first();
```