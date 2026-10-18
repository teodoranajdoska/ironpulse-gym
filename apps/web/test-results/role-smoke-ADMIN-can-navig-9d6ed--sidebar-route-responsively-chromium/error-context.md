# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: role-smoke.spec.ts >> ADMIN can navigate every sidebar route responsively
- Location: e2e\role-smoke.spec.ts:94:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button[aria-controls="role-dashboard-navigation"]')

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - link "Прескокни до главната содржина" [ref=f1e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f1e3]:
    - generic [ref=f1e4]:
      - link "IronPulse" [ref=f1e5] [cursor=pointer]:
        - /url: /
        - text: IronPulse
        - generic [ref=f1e6]: .
      - generic [ref=f1e7]:
        - button "Префрли на светла тема" [ref=f1e8] [cursor=pointer]
        - button "Отвори навигација" [ref=f1e15] [cursor=pointer]
  - main [ref=f1e18]: Се вчитува сметката…
  - contentinfo [ref=f1e19]:
    - generic [ref=f1e20]:
      - generic [ref=f1e21]:
        - link "IronPulse ." [ref=f1e22] [cursor=pointer]:
          - /url: /
          - text: IronPulse
          - generic [ref=f1e23]: .
        - paragraph [ref=f1e24]: Тренирај со цел. Изгради за живот.
      - generic [ref=f1e25]:
        - heading "Посети нѐ и контактирај" [level=2] [ref=f1e26]
        - generic [ref=f1e27]: Само за развој
        - paragraph [ref=f1e28]:
          - strong [ref=f1e29]: "Работно време:"
          - text: DEMO · Понеделник–петок 06:00–23:00; сабота–недела 08:00–20:00
        - paragraph [ref=f1e30]:
          - strong [ref=f1e31]: "Адреса:"
          - text: DEMO · Скопје, Северна Македонија
        - paragraph [ref=f1e32]:
          - strong [ref=f1e33]: "Телефон:"
          - text: DEMO · +389 70 000 000
        - paragraph [ref=f1e34]:
          - strong [ref=f1e35]: "Е-пошта:"
          - text: DEMO · hello@ironpulse.test
      - navigation "Информации" [ref=f1e36]:
        - heading "Информации" [level=2] [ref=f1e37]
        - link "Приватност" [ref=f1e38] [cursor=pointer]:
          - /url: /privacy
        - link "Услови" [ref=f1e39] [cursor=pointer]:
          - /url: /terms
    - generic [ref=f1e40]:
      - generic [ref=f1e41]: © 2026 IronPulse
      - generic [ref=f1e42]: Тренирај со цел. Изгради за живот.
      - generic [ref=f1e43]:
        - generic [ref=f1e44]:
          - generic [ref=f1e45]: Избери јазик
          - combobox "Избери јазик" [ref=f1e46] [cursor=pointer]:
            - option "MK" [selected]
            - option "EN"
        - button "Префрли на светла тема" [ref=f1e47] [cursor=pointer]
  - alert [ref=f1e54]
```

# Test source

```ts
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
  76  |   await expect(page.locator('main h1').first()).toBeVisible();
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
> 133 |       await trigger.click();
      |                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  177 |       await expect(machine).toBeVisible();
  178 |       await machine.click();
  179 |       await expect(page.locator('main h2').filter({ hasText: /преса за нозе|leg press/i })).toBeVisible();
  180 |       await expect(page.locator('main ol li').first()).toBeVisible();
  181 |       await expect(page.getByText(/чести грешки|common mistakes/i).first()).toBeVisible();
  182 |       await expect(page.getByText(/безбедносни совети|safety tips/i).first()).toBeVisible();
  183 |       expect(await page.locator('main svg[aria-hidden="true"]').count()).toBeGreaterThan(0);
  184 |       for (const width of [320, 350, 360, 390]) {
  185 |         await page.setViewportSize({ width, height: 900 });
  186 |         const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  187 |         expect(overflow, `/member/machines/leg-press overflows at ${width}px`).toBe(false);
  188 |         expect(await visibleContentOutsideViewport(page), `/member/machines/leg-press has clipped content at ${width}px`).toEqual([]);
  189 |       }
  190 |       await page.goto('/trainer');
  191 |       await expect(page).toHaveURL(/\/member$/);
  192 |       await page.goto('/admin');
  193 |       await expect(page).toHaveURL(/\/member$/);
  194 |     }
  195 | 
  196 |     if (account.slug === 'trainer') {
  197 |       await page.goto('/trainer/nutrition');
  198 |       await page.setViewportSize({ width: 350, height: 800 });
  199 |       const memberCard = page.locator('main article:visible').filter({ hasText: 'member@ironpulse.test' });
  200 |       await memberCard.getByRole('link').click();
  201 |       const editor = page.locator('main textarea');
  202 |       await expect(editor).toBeVisible();
  203 |       await editor.fill(`${await editor.inputValue()} `);
  204 |       await page.getByRole('button', { name: /зачувај промени|save changes/i }).click();
  205 |       await expect(page.locator('main [role="status"]')).toContainText(/зачув|saved/i);
  206 |       await page.getByRole('button', { name: /зачувај и одобри|save and approve/i }).click();
  207 |       await expect(page.locator('main [role="status"]')).toContainText(/одобр|approved/i);
  208 |       await expect(page.locator('main select option').first()).toContainText('APPROVED');
  209 |       await page.goto('/admin');
  210 |       await expect(page).toHaveURL(/\/trainer$/);
  211 |     }
  212 |     expect(browserErrors).toEqual([]);
  213 |   });
  214 | }
  215 | 
  216 | test('public pages render at mobile and desktop breakpoints', async ({ page }) => {
  217 |   for (const route of ['/', '/privacy', '/terms', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email']) {
  218 |     await page.goto(route);
  219 |     for (const width of responsiveWidths) {
  220 |       await page.setViewportSize({ width, height: 900 });
  221 |       const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  222 |       expect(overflow, `${route} overflows at ${width}px`).toBe(false);
  223 |     }
  224 |   }
  225 | });
  226 | 
  227 | test('public mobile navigation stays reachable on narrow screens', async ({ page }) => {
  228 |   for (const width of [320, 350, 360, 390]) {
  229 |     await page.setViewportSize({ width, height: 568 });
  230 |     await page.goto('/');
  231 |     await dismissCookieConsent(page);
  232 |     await page.locator('button[aria-controls="mobile-navigation"]').click();
  233 |     const menu = page.locator('#mobile-navigation');
```