# IronPulse

IronPulse is a pnpm workspace for a gym platform. Payments are intentionally mocked; authentication, sessions, verification, and password recovery use Prisma-backed local data.

## Workspace

- `apps/web`: Next.js App Router, TypeScript, Tailwind, next-intl, client auth context, protected role dashboards.
- `apps/api`: NestJS API, Prisma/SQLite, Argon2, cookie JWT sessions, RBAC, CSRF, throttling, local development mail, and Swagger.
- `packages/shared`: shared Zod request and response schemas and role types.

## Web imagery and design

The public homepage uses a photography-led, dark-first design with a working light/dark toggle and Macedonian/English copy. Add locally licensed image files to `apps/web/public/images/`; filenames, localized alt text, aspect ratios, and focal points are listed in [docs/IMAGES.md](./docs/IMAGES.md). Missing files render designed placeholders. An optional `apps/web/public/video/hero.mp4` is only used when reduced motion and the browser's data-saver setting allow it.

The homepage's scroll effects are progressively enhanced and disabled for reduced-motion preferences. Image slots and the optional video are local-only; do not substitute hotlinked image URLs.

## Local setup

Requirements: Node.js 20+ and pnpm 9.

1. Install dependencies:

   ```powershell
   pnpm install
   ```
2. Copy `.env.example` to `.env`, `apps/api/.env.example` to `apps/api/.env`, and `apps/web/.env.example` to `apps/web/.env.local`.
3. The matching `JWT_SECRET` values in the examples are development-only. Keep them only for local development; use a private random secret of at least 32 characters in any shared or deployed environment.
4. Create and seed the local SQLite database:

   ```powershell
   pnpm db:migrate
   pnpm db:seed
   ```
5. Start the applications:

   ```powershell
   pnpm dev
   ```

   Web: http://localhost:3000 · API: http://localhost:4000 · Swagger: http://localhost:4000/api/docs

SQLite is the local development database and requires no separate database service. The database file is `apps/api/prisma/dev.db`. To switch to PostgreSQL later, change the Prisma datasource provider and `DATABASE_URL`, replace the SQLite-only JSON representation for trainer specialties with a compatible scalar list or relation as appropriate, generate a new migration, and apply it to the new database.

## Development email

With empty `SMTP_HOST` (the default), or whenever `NODE_ENV=development`, email is written locally instead of requiring an SMTP server. Each message is printed in the API console with its recipient, subject, plain-text content, and action link, and saved as an HTML file under `apps/api/.dev-mails/`. Open the generated HTML file in a browser to inspect it. The development-only `GET /dev/last-email?to=address` endpoint returns the latest message and action link for that recipient. It is disabled in production.

For a later production SMTP setup, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`.

## Authentication and security

- Registration accepts MEMBER accounts only. Argon2 hashes passwords. `EMAIL_VERIFICATION_REQUIRED` (API) and `NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED` (web) must match: both default to `false`, which verifies new accounts immediately and signs them in; set both to `true` to require the existing 24-hour emailed verification link before sign-in.
- Login rejects inactive accounts and, only when verification is required, unverified accounts. If verification is switched off, a pending member account created under the required mode is activated after a successful password check. A session uses a 15-minute signed access JWT plus a random seven-day refresh token in `HttpOnly`, `SameSite=Lax` cookies. Cookies are `Secure` only in production.
- Refresh tokens are hashed in SQLite and rotated on use. Reusing a revoked token revokes all active refresh tokens for that user and records an audit event.
- Password-reset links are hashed, one-hour, and single-use. Reset revokes all refresh sessions. Admin-created trainer/sponsor accounts receive a one-time set-password invitation.
- All state-changing requests require the double-submit `csrf_token` cookie and `x-csrf-token` header. Call `GET /auth/csrf` to obtain the initial token.
- JWT authentication is globally applied; `@Public()` opts out for public routes. `@Roles()` restrictions are checked against the current database user. Auth endpoints use stricter rate limits than the global API limit.
- CORS origins come from `CORS_ORIGINS`; the web API URL comes from `NEXT_PUBLIC_API_URL`; `WEB_URL` sets the origin for email links. In development, HTTP origins on `localhost`, `127.0.0.1`, and `::1` are accepted on any port so Next.js port fallback (for example, 3001 when 3000 is occupied) keeps working. Production still uses only the exact configured allow-list. Startup validation names missing or invalid variables and points to the relevant `.env.example`.
- Nutrition uses `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` when configured. With no key, a deterministic local meal-plan provider is used. Meal-plan generation is limited to one successful plan per user per UTC day.

## Development seed accounts

All 19 demo accounts are email-verified and use the same local-only password, `password123`. Each dashboard loads role-specific seed data immediately after sign-in.

| Email | Role | What to look at |
| --- | --- | --- |
| `admin@ironpulse.test` | Admin | Pending mock payments, trial requests, recent audit activity, popular machines, monthly new-member and revenue charts. |
| `trainer@ironpulse.test` | Trainer | Four assigned clients, today's request, upcoming sessions, and client list. |
| `trainer2@ironpulse.test` | Trainer | Four assigned clients, confirmed and requested appointments, weekly availability. |
| `trainer3@ironpulse.test` | Trainer | Four assigned clients, appointment history, cancellations, and future sessions. |
| `member@ironpulse.test` | Member | Active one-month plan expiring in five days, 10 weeks of logged progress, draft meal plan, and an upcoming trainer appointment. |
| `member2@ironpulse.test` | Member | No membership (locked-state test account) and workout history. |
| `member3@ironpulse.test` | Member | Active six-month membership, workout history, and trainer-approved vegetarian plan. |
| `member4@ironpulse.test` | Member | Active 12-month membership and workout history. |
| `member5@ironpulse.test` | Member | Active three-month membership, workout history, and trainer-approved halal plan. |
| `member6@ironpulse.test` | Member | Active six-month membership and workout history. |
| `member7@ironpulse.test` | Member | Pending membership request and a draft vegetarian nutrition plan. |
| `member8@ironpulse.test` | Member | Pending membership request waiting for admin review. |
| `member9@ironpulse.test` | Member | Expired membership and trainer assignment. |
| `member10@ironpulse.test` | Member | Expired membership and trainer assignment. |
| `member11@ironpulse.test` | Member | No membership; assigned trainer client with no workout history. |
| `member12@ironpulse.test` | Member | No membership; assigned trainer client with no workout history. |
| `sponsor@ironpulse.test` | Sponsor | Active offers, profile summary, and 30 days of impression/click analytics. |
| `sponsor2@ironpulse.test` | Sponsor | Sponsor profile, current and expired offers, and daily analytics. |
| `sponsor3@ironpulse.test` | Sponsor | Sponsor profile, offer list, and daily analytics. |

Never use seeded credentials outside a local development database. `pnpm db:seed` is idempotent and refuses to run with `NODE_ENV=production`; `pnpm db:reset` recreates the local database from migrations before seeding.

## Member dashboard smoke test (Phase 4A)

For a clean local test state, run `pnpm db:reset` from the repository root, then start the apps with `pnpm dev`. Open <http://localhost:3000/login> and sign in as `member@ironpulse.test` with `password123`. This seeded member has an active membership, workout history, a draft nutrition plan, and an upcoming appointment.

Use the member navigation or open these routes directly:

- `/member` — membership summary, next appointment, latest workout, weekly activity, and sponsor offers.
- `/member/membership` — compare the four seeded MKD plans, request one, and confirm it appears as PENDING until an admin confirms the simulated payment.
- `/member/workouts` — review workout history/progress/records and log a workout.
- `/member/machines` and `/member/machines/leg-press` — search/filter the library and inspect machine exercises. The library has local SVG pictures and exercise details require an active membership. Click a video card to load its privacy-enhanced YouTube embed.
- `/member/nutrition` — review the seeded plan, print it, create a new questionnaire, or delete a plan. Generation is limited to one successful plan per member per UTC day; use `member2@ironpulse.test` for a first-time plan-generation test.
- `/member/trainers` and `/member/appointments` — browse trainers, request future appointments, and cancel eligible requests.
- `/member/profile` — edit profile/language and download the GDPR export. Do not use account deletion on a seeded account.
- `/member/sponsors` — view partner offers; impression/click tracking updates development analytics and is IP-throttled.

To test the membership-locked workout and exercise-detail states, sign in as `member2@ironpulse.test` (no membership). `member@ironpulse.test` remains the active-member test account. Profile, appointment, export, and membership-request actions change local seed data; use `pnpm db:reset` to restore the baseline between destructive or repeatable smoke tests. The reset deletes the local development database before recreating and reseeding it.

## Trainer, admin, and sponsor dashboard smoke test (Phase 4B)

Start from a clean development database when you want the seeded queues, profiles, and analytics restored:

```powershell
pnpm db:reset
pnpm dev
```

At <http://localhost:3000/login>, use `password123` with the account for the role being tested. Log out before switching accounts; role dashboards are protected both by Next middleware and API RBAC.

### Trainer

Use `trainer@ironpulse.test` (or `trainer2@ironpulse.test` / `trainer3@ironpulse.test` to compare their appointment histories):

- `/trainer` — check assigned-client, today's appointment, and pending-request counts.
- `/trainer/clients` — search the assigned-client list and open a client. The detail view shows profile fields, workout-volume chart/history, and nutrition plan review. Edit the JSON, save it as a draft, or save and approve it.
- `/trainer/appointments` — enter notes, confirm a REQUESTED appointment, or cancel/complete an eligible appointment.
- `/trainer/availability` — add or remove UTC weekday slots and save the schedule. Overlapping slots are rejected.
- `/trainer/profile` — edit the trainer bio, comma-separated specialties, and photo URL.

These writes alter local seeded appointments, availability, profile, and nutrition plans. Re-run `pnpm db:reset` to restore them.

### Admin

Use `admin@ironpulse.test`:

- `/admin` and `/admin/analytics` — verify member/membership/revenue/pending-payment totals, monthly registration and revenue charts, and popular machines.
- `/admin/memberships` — confirm or reject a pending mock payment; switch to Membership plans to create plans, edit prices/durations, and activate/deactivate plans.
- `/admin/users` — search, filter, paginate, suspend/activate accounts, and invite TRAINER or SPONSOR accounts. Do not suspend the account you are currently using. A sent invitation is written to the local development mail folder.
- `/admin/machines` and `/admin/exercises` — create/edit/hide machines and create/edit/delete exercises, including animation keys and YouTube video IDs. Exercises referenced by workout history cannot be deleted.
- `/admin/content` — create/edit/delete bilingual gym rules and edit opening hours, address, phone, and email.
- `/admin/trials` — filter requests and update their NEW / CONTACTED / CONVERTED status.
- `/admin/sponsors` — activate/deactivate sponsors or create a sponsor profile for a SPONSOR user ID shown in Users.
- `/admin/audit` — filter the paginated audit history by action or entity.

These operations change seeded or newly invited accounts and gym records. For a repeatable baseline, reset the local database. A pending payment rejection cancels the associated membership request; it does not perform a real payment.

### Sponsor

Use `sponsor@ironpulse.test` (or `sponsor2@ironpulse.test` / `sponsor3@ironpulse.test`):

- `/sponsor` and `/sponsor/analytics` — inspect aggregate impressions/clicks and the daily chart. Opening the public site or member sponsor area can increment local counters; tracking is IP-throttled.
- `/sponsor/profile` — edit company name, logo URL, and website URL.
- `/sponsor/offers` — create/edit offers, set a discount code and expiry, toggle active status, or delete an offer.

Sponsor writes and analytics tracking change the local seed state. Run `pnpm db:reset` to restore it.

## Database and tests

- `pnpm db:migrate`: apply the committed initial SQLite migration.
- `pnpm db:seed`: idempotently seed development accounts and gym content.
- `pnpm db:reset`: delete the local development DB, recreate it from migrations, and seed it.
- `pnpm db:studio`: open Prisma Studio.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm check:i18n`: run workspace checks; the i18n check fails when the Macedonian and English message-key sets differ.
- `pnpm test:e2e`: run Playwright role-route, responsive navigation, trainer nutrition review, active-member machine detail, and public navigation smoke tests. It starts `pnpm dev` on ports 3000/4000 unless `PLAYWRIGHT_BASE_URL` is set; set that variable when testing already-running apps.
- `pnpm test` automatically creates a separate `test.db`, applies migrations and seed data, runs API unit/e2e tests, and deletes the test DB and journal afterwards.

## Phase 4C audit and manual role walkthrough

The Playwright suite clicks every role sidebar destination and checks all role pages at 320, 350, 360, 390, 768, 1024, 1280, and 1536 px. It also follows the trainer nutrition review/edit/approve flow and opens `/member/machines/leg-press` as an active member. To run it against an already-running app, for example:

```powershell
$env:PLAYWRIGHT_BASE_URL='http://localhost:3000'
pnpm test:e2e
```

For a predictable manual test database, run `pnpm db:reset` then `pnpm dev`. Reset deletes the local development database and recreates the seeded data; do not run it against valuable local data. All listed seeded accounts use `password123`.

1. **Active member — `member@ironpulse.test`:** Sign in, then click Overview → Membership → Nutrition → Workouts → Machines. In Machines search/filter the grid, open Leg Press, and check its image, description, muscle groups, numbered instructions, mistakes, safety, sets/reps, animation, and click-to-load video. Use Workouts to log sets, reps, and weight, then inspect history, progress, and personal records.
2. **Locked member — `member2@ironpulse.test`:** Sign in and open Workouts and a machine detail. Both should show the membership lock and link to Membership; the public machine list and machine details remain browsable.
3. **Trainer — `trainer@ironpulse.test`:** Sign in, click Overview → Clients → open the seeded member → Review nutrition. Edit the plan and click **Save changes**, then **Save and approve**; confirm the approved status. Return and click Appointments → Availability → Profile. This changes seeded nutrition/availability/profile data; reset the local DB to restore it.
4. **Admin — `admin@ironpulse.test`:** Sign in, then click Overview → Users → Memberships → Machines → Exercises → Content → Trials → Sponsors → Analytics → Audit. Verify the pending mock-payment queue and the plan editor in Memberships. To test destructive/status-changing operations, confirm the dialogs and reset the local DB afterward.
5. **Sponsor — `sponsor@ironpulse.test`:** Sign in, then click Overview → Offers → Analytics → Profile. Offer/profile edits change seeded data; reset the local DB afterward.
6. **Public/auth:** Visit Home, Login, Register, Verify email, Forgot password, Reset password, Privacy, and Terms. Test registration/email flows using the steps in [Manual auth smoke test](#manual-auth-smoke-test).

For each role, open browser F12 → device toolbar, set the viewport to **350 × 568**, and open the role menu from both the overview and a detail page. Scroll the entire menu and verify the final item is visible and reachable, all links have at least 44 px height, navigation closes the menu, Escape closes it and restores focus, and there is no horizontal overflow. Repeat at 320, 360, and 390 px. In F12 Console and Network, check for red console errors and failed requests; manually test a validation error, loading/success feedback, empty/error retry state where available, keyboard operation, and destructive-action confirmation. Repeat visual checks in both locales, light/dark themes, and with reduced motion enabled.

## API overview (Phase 2B)

All endpoints are documented in Swagger at `/api/docs`. Protected write requests continue to require the `csrf_token` cookie and matching `x-csrf-token` header. Lists accept `page` and `pageSize` (1-based, maximum page size 100).

- **Authentication and account administration:** `/auth` provides registration, verification, login, rotating refresh/logout, password recovery, `/auth/me`, and the existing `POST /auth/admin/accounts` invitation flow. Admins can also create trainer/sponsor accounts via `POST /admin/accounts`, which delegates to that same invitation flow.
- **Content:** public `GET /content/rules?locale=mk|en`, `GET /content/settings`, and throttled `POST /content/trial-requests`. Admins manage rules at `/content/admin/rules`, update a setting with `PUT /content/admin/settings`, and list/update trial requests at `/content/admin/trial-requests`.
- **Memberships:** public `GET /memberships/plans`; members use `GET /memberships/me`, `/memberships/me/history`, `/memberships/me/days-remaining`, and `POST /memberships/request`. Requests create a PENDING membership and mock PENDING payment. Admins list `/memberships/admin/pending`, confirm or cancel by membership ID, list all plans at `GET /memberships/admin/plans`, and create/edit/deactivate plans under `/memberships/admin/plans`. Confirmed periods use calendar-month durations and extend after an existing active or scheduled membership. A daily job marks elapsed active memberships EXPIRED.
- **Machines and exercises:** public `GET /machines` supports `category`, `search`, and locale filters; `GET /machines/:slug` returns only public machine information and muscles. Full exercise information (including JSON steps and `videoId`, never an embed URL) is available at `/exercises/:id` and `/machines/:slug/exercises` to trainers/admins or members with an active membership. Admin CRUD is under `/machines/admin` and `/exercises/admin`.
- **Workouts:** members `POST /workouts` with an exercise and 1–20 sets (1–100 reps and 0–500 kg each), read paginated `GET /workouts` history, retrieve chart points at `/workouts/exercises/:exerciseId/progress`, and read per-exercise best weight/volume at `/workouts/personal-records`.
- **Nutrition:** members submit `POST /nutrition/questionnaire`; the API calculates Mifflin-St Jeor BMR/TDEE and target macros, generates a schema-validated seven-day plan, and returns the non-medical-advice disclaimer. Members use `GET /nutrition/plans`, `GET /nutrition/plans/:planId`, `POST /nutrition/plans/:planId/regenerate`, and `DELETE /nutrition/plans/:planId` (regeneration uses the same one-plan-per-UTC-day limit). Trainers use `GET /nutrition/clients/:memberId/plans`, `PATCH /nutrition/clients/:memberId/plans/:planId`, and `POST /nutrition/clients/:memberId/plans/:planId/approve`, restricted to active assigned clients.
- **Trainers:** public `GET /trainers` lists active profiles. Trainers use `PUT /trainers/me/profile`, `GET /trainers/me/clients`, `GET /trainers/me/clients/:memberId` (assigned-client profile only), `POST /trainers/me/clients`, `POST /trainers/me/clients/:memberId/remove`, `GET /trainers/me/clients/:memberId/workouts`, and `GET|PUT /trainers/me/availability`. Availability uses UTC weekdays (`0` Sunday through `6` Saturday) and minutes after midnight. Members use `POST /appointments`, `GET /appointments/me`, and `PATCH /appointments/:appointmentId/cancel`; trainers use `GET /appointments/trainer` and `PATCH /appointments/trainer/:appointmentId`. Requests must be future-dated, fit a defined availability window when one exists, and cannot overlap another REQUESTED or CONFIRMED appointment. Booking uses a serialized SQLite transaction.
- **Sponsors:** public `GET /sponsors` lists active sponsors and active, unexpired offers. Anonymous, IP-throttled `POST /sponsors/:sponsorId/impressions` and `POST /sponsors/offers/:offerId/click` increment aggregate counters without storing request PII. Sponsors manage `/sponsors/me`, `/sponsors/me/offers`, and `/sponsors/me/stats`; offer updates/deletes are scoped to the owner and offers have an `isActive` flag. Admins list/create sponsors at `/sponsors/admin` and set sponsor status at `/sponsors/admin/:sponsorId/status`.
- **Admin:** `/admin/users` supports paginated search/role/status filters; `PATCH /admin/users/:userId/status` activates or suspends accounts. `GET /admin/dashboard` reports member/membership counts, confirmed mock-payment revenue by confirmation month, monthly new members, popular machines, and pending payments. `GET /admin/audit-log` returns paginated audit records and accepts `action` and `entity` filters.
- **Privacy:** authenticated users can read/update their profile and preferred locale with `GET|PATCH /me/profile`, download `GET /me/export` as JSON, and request `DELETE /me` with `{ "password": "..." }`. Deletion anonymizes the account, removes personal profile/workout/nutrition/appointment/token data, detaches financial records, and preserves non-personal payment and sponsor aggregates.

The development seed includes the full role mix above, 14 machines with bilingual instructions, local SVG pictures, and exercise technique videos, 10 gym rules, membership/payment history, 10 weeks of progressive workouts for eight members, four seven-day meal plans, trainer availability and appointments, sponsor offers and 30 days of analytics, trial requests, and audit entries. Seed dates are generated relative to the current date.

## Manual auth smoke test

1. With both verification flags `false`, register at http://localhost:3000/register. Registration should sign in immediately and open the member dashboard without sending a verification email.
2. For the required-verification path, set both flags to `true`, restart the apps, register a fresh address, and open its link from the API console or `apps/api/.dev-mails/`. The UI should show the check-email step and block login until verification.
3. Request a password reset from http://localhost:3000/forgot-password and follow the local email link. Confirm reset, then sign in with the new password.
4. Reload a dashboard to verify cookie-backed session refresh, then use **Log out**.
5. While signed in as a member, navigate to http://localhost:3000/admin. Middleware redirects to `/member`; protected API operations are independently checked by backend RBAC.

## Responsive review checklist

Use browser F12 device mode and inspect each width below in both `mk` and `en`, with the dark and light themes:

| Width | Device class | Check |
| ---: | --- | --- |
| 320 px | narrow phone | Menu items remain scrollable and reachable; no horizontal page overflow, clipped text, or controls narrower than 44 px. |
| 350 px | compact phone | Check the full menu, long labels, forms, consent banner, safe-area spacing, and 44 px tap targets. |
| 360 px | compact phone | No horizontal page overflow or clipped headings; 44 px controls; forms and consent banner fit; safe-area spacing. |
| 390 px | phone | Full-screen navigation opens/closes, traps page scrolling while open, closes with Escape, and leaves the page usable after closing. |
| 768 px | tablet | Navigation and card grids reflow cleanly; no overlapping hero, card, form, or footer content. |
| 1024 px | small laptop/tablet landscape | Sidebar and dashboard columns fit without squeezing cards or page-level overflow. |
| 1280 px | laptop | Homepage sections, dashboard charts, and image focal points are balanced. |
| 1536 px | large desktop | Content stays within the intended max-width; wide layouts do not leave excessively long text lines. |

Use **F12 → device toolbar** and check these exact flows:

- **360 px and 390 px phone:** Open and close the full-screen site menu; confirm background scrolling locks, Escape closes it, focus returns to the menu button, and menu links remain tappable. Swipe the training-zone cards (they must not pin on touch), open a dashboard menu, scroll each auth form with the on-screen keyboard, and dismiss the cookie banner. Check headings, long names, safe-area/notch padding, and every control's 44 × 44 px minimum.
- **768 px tablet:** Confirm the navigation, card grids, pricing cards, footer, and auth forms reflow without clipping. Check that no horizontal scroll escapes the gallery or any table container.
- **1024 px tablet landscape / small laptop:** Check the wider navigation and dashboard grid; emulate touch and verify the horizontal zone gallery remains swipeable rather than pinned. Check long dashboard headings and chart cards.
- **1280 px and 1536 px laptop/desktop:** Check the fixed navbar as you scroll, the pinned zone gallery with a fine pointer, its cleanup after leaving the section, image focal points, max-width alignment, and the dashboard sidebar/chart layout.
- **Every width:** Inspect `/`, `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/privacy`, `/terms`, and signed-in overview/detail routes for MEMBER, TRAINER, ADMIN, and SPONSOR. Repeat in `mk` and `en`, in dark and light themes, and with reduced motion enabled. Confirm no visible placeholder statistic, testimonial, partner, or contact detail is presented as real content; development-only samples must carry their badge. Check keyboard focus, form validation, success/error states, and table-local horizontal scrolling where tables are present.

For the auth-mode smoke test, keep both verification flags `false` for immediate dashboard access, then set both to `true` and restart to check the email step and login gate. Verify forgot-password/reset-password with the local HTML mail in both configurations. `pnpm check:i18n` checks catalog key parity, but does not replace the visual language review.

## Phase 1 fixture note

Seeded machine exercises use public technique-demo video IDs and load videos only after the visitor activates each video card. Review video ownership, availability, and suitability before publishing the machine library.
