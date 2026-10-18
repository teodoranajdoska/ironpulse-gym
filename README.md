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
- Login rejects inactive accounts and, only when verification is required, unverified accounts. A session uses a 15-minute signed access JWT plus a random seven-day refresh token in `HttpOnly`, `SameSite=Lax` cookies. Cookies are `Secure` only in production.
- Refresh tokens are hashed in SQLite and rotated on use. Reusing a revoked token revokes all active refresh tokens for that user and records an audit event.
- Password-reset links are hashed, one-hour, and single-use. Reset revokes all refresh sessions. Admin-created trainer/sponsor accounts receive a one-time set-password invitation.
- All state-changing requests require the double-submit `csrf_token` cookie and `x-csrf-token` header. Call `GET /auth/csrf` to obtain the initial token.
- JWT authentication is globally applied; `@Public()` opts out for public routes. `@Roles()` restrictions are checked against the current database user. Auth endpoints use stricter rate limits than the global API limit.
- CORS origins come from `CORS_ORIGINS`; the web API URL comes from `NEXT_PUBLIC_API_URL`; `WEB_URL` sets the origin for email links. Startup validation names missing or invalid variables and points to the relevant `.env.example`.
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
| `member2@ironpulse.test` | Member | Active three-month membership expiring in about three weeks and workout history. |
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

## Database and tests

- `pnpm db:migrate`: apply the committed initial SQLite migration.
- `pnpm db:seed`: idempotently seed development accounts and gym content.
- `pnpm db:reset`: delete the local development DB, recreate it from migrations, and seed it.
- `pnpm db:studio`: open Prisma Studio.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm check:i18n`: run workspace checks; the i18n check fails when the Macedonian and English message-key sets differ.
- `pnpm test` automatically creates a separate `test.db`, applies migrations and seed data, runs API unit/e2e tests, and deletes the test DB and journal afterwards.

## API overview (Phase 2B)

All endpoints are documented in Swagger at `/api/docs`. Protected write requests continue to require the `csrf_token` cookie and matching `x-csrf-token` header. Lists accept `page` and `pageSize` (1-based, maximum page size 100).

- **Authentication and account administration:** `/auth` provides registration, verification, login, rotating refresh/logout, password recovery, `/auth/me`, and the existing `POST /auth/admin/accounts` invitation flow. Admins can also create trainer/sponsor accounts via `POST /admin/accounts`, which delegates to that same invitation flow.
- **Content:** public `GET /content/rules?locale=mk|en`, `GET /content/settings`, and throttled `POST /content/trial-requests`. Admins manage rules at `/content/admin/rules`, update a setting with `PUT /content/admin/settings`, and list/update trial requests at `/content/admin/trial-requests`.
- **Memberships:** public `GET /memberships/plans`; members use `GET /memberships/me`, `/memberships/me/history`, `/memberships/me/days-remaining`, and `POST /memberships/request`. Requests create a PENDING membership and mock PENDING payment. Admins list `/memberships/admin/pending`, confirm or cancel by membership ID, and create/edit/deactivate plans under `/memberships/admin/plans`. Confirmed periods use calendar-month durations and extend after an existing active or scheduled membership. A daily job marks elapsed active memberships EXPIRED.
- **Machines and exercises:** public `GET /machines` supports `category`, `search`, and locale filters; `GET /machines/:slug` returns only public machine information and muscles. Full exercise information (including JSON steps and `videoId`, never an embed URL) is available at `/exercises/:id` and `/machines/:slug/exercises` to trainers/admins or members with an active membership. Admin CRUD is under `/machines/admin` and `/exercises/admin`.
- **Workouts:** members `POST /workouts` with an exercise and 1–20 sets (1–100 reps and 0–500 kg each), read paginated `GET /workouts` history, retrieve chart points at `/workouts/exercises/:exerciseId/progress`, and read per-exercise best weight/volume at `/workouts/personal-records`.
- **Nutrition:** members submit `POST /nutrition/questionnaire`; the API calculates Mifflin-St Jeor BMR/TDEE and target macros, generates a schema-validated seven-day plan, and returns the non-medical-advice disclaimer. Members use `GET /nutrition/plans`, `GET /nutrition/plans/:planId`, `POST /nutrition/plans/:planId/regenerate`, and `DELETE /nutrition/plans/:planId` (regeneration uses the same one-plan-per-UTC-day limit). Trainers use `GET /nutrition/clients/:memberId/plans`, `PATCH /nutrition/clients/:memberId/plans/:planId`, and `POST /nutrition/clients/:memberId/plans/:planId/approve`, restricted to active assigned clients.
- **Trainers:** public `GET /trainers` lists active profiles. Trainers use `PUT /trainers/me/profile`, `GET /trainers/me/clients`, `POST /trainers/me/clients`, `POST /trainers/me/clients/:memberId/remove`, `GET /trainers/me/clients/:memberId/workouts`, and `GET|PUT /trainers/me/availability`. Availability uses UTC weekdays (`0` Sunday through `6` Saturday) and minutes after midnight. Members use `POST /appointments`, `GET /appointments/me`, and `PATCH /appointments/:appointmentId/cancel`; trainers use `GET /appointments/trainer` and `PATCH /appointments/trainer/:appointmentId`. Requests must be future-dated, fit a defined availability window when one exists, and cannot overlap another REQUESTED or CONFIRMED appointment. Booking uses a serialized SQLite transaction.
- **Sponsors:** public `GET /sponsors` lists active sponsors and current offers. Anonymous, IP-throttled `POST /sponsors/:sponsorId/impressions` and `POST /sponsors/offers/:offerId/click` increment aggregate counters without storing request PII. Sponsors manage `/sponsors/me`, `/sponsors/me/offers`, and `/sponsors/me/stats`; offer updates/deletes are scoped to the owner. Admin sponsor profile creation/activation is at `/sponsors/admin`, and activation state is updated at `/sponsors/admin/:sponsorId/status`.
- **Admin:** `/admin/users` supports paginated search/role/status filters; `PATCH /admin/users/:userId/status` activates or suspends accounts. `GET /admin/dashboard` reports member/membership counts, confirmed mock-payment revenue by confirmation month, monthly new members, popular machines, and pending payments. `GET /admin/audit-log` returns paginated audit records.
- **Privacy:** authenticated users can download `GET /me/export` as JSON and request `DELETE /me` with `{ "password": "..." }`. Deletion anonymizes the account, removes personal profile/workout/nutrition/appointment/token data, detaches financial records, and preserves non-personal payment and sponsor aggregates.

The development seed includes the full role mix above, 12 machines with bilingual instructions, 10 gym rules, membership/payment history, 10 weeks of progressive workouts for eight members, four seven-day meal plans, trainer availability and appointments, sponsor offers and 30 days of analytics, trial requests, and audit entries. Seed dates are generated relative to the current date.

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
| 360 px | compact phone | No horizontal page overflow or clipped headings; 44 px controls; forms and consent banner fit; safe-area spacing. |
| 390 px | phone | Full-screen navigation opens/closes, traps page scrolling while open, closes with Escape, and leaves the page usable after closing. |
| 768 px | tablet | Navigation and card grids reflow cleanly; no overlapping hero, card, form, or footer content. |
| 1024 px | small laptop/tablet landscape | Sidebar and dashboard columns fit without squeezing cards or page-level overflow. |
| 1280 px | laptop | Homepage sections, dashboard charts, and image focal points are balanced. |
| 1536 px | large desktop | Content stays within the intended max-width; wide layouts do not leave excessively long text lines. |

At every width, inspect `/`, `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, and each role's dashboard. Verify the homepage story and machine sections do not pin or overflow on touch-sized screens; dashboard side navigation collapses to the mobile drawer; tables (where present) scroll inside their own container; headings and long names wrap; buttons/inputs remain keyboard-usable; and mobile browser height uses the visible viewport. On a phone, also test the notch/safe area, form keyboard scrolling, drawer dismissal, and consent banner dismissal. In each language, check that no message key is missing and that seeded names/statuses remain readable.

## Phase 1 fixture note

Seeded machine video IDs intentionally remain `TODO-replace` placeholders, as the Phase 1 content request calls for placeholder video references. Replace these with reviewed exercise-specific video IDs before shipping machine content.
