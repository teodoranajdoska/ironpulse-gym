# Developer Handoff

## Architecture

IronPulse is a pnpm 9.15.2 workspace. Node.js 20 or newer is required.

- `apps/web` is a Next.js 14 App Router application using TypeScript, React, Tailwind CSS, and next-intl.
- `apps/api` is a NestJS API. Its domain modules use controllers, services, and Prisma with a local SQLite database. Auth uses Argon2, JWT access cookies, rotating refresh tokens, CSRF protection, and backend role guards.
- `packages/shared` contains shared Zod schemas, role types, and app configuration consumed by the API and web app.
- `apps/api/prisma/schema.prisma` and the Prisma migration files define the database. `apps/api/prisma/seed.ts` creates local sample data.

Payments are intentionally mocked. Membership requests create pending records until an admin confirms them. Nutrition uses the deterministic fallback provider when no Anthropic key is configured.

## Fresh checkout setup

From a fresh clone, in PowerShell at the repository root:

```powershell
corepack enable
corepack prepare pnpm@9.15.2 --activate
pnpm install

Copy-Item .env.example .env
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

The checked-in JWT secret is for local development only. `WEB_URL` sets the origin used in verification and password-reset links. The SQLite URL in the API example creates `apps/api/prisma/dev.db`; no external database is required. SMTP and the Anthropic key can remain blank for local development. Email verification is optional by default: keep `EMAIL_VERIFICATION_REQUIRED` in the API environment and `NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED` in the web environment aligned. Both examples default to `false`; setting both to `true` restores the email-verification gate.

Then initialize and run the apps:

```powershell
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The web app is at <http://localhost:3000>, the API at <http://localhost:4000>, and the OpenAPI/Swagger UI at <http://localhost:4000/api/docs>. The API health check is <http://localhost:4000/health>.

`pnpm db:migrate` generates the Prisma client before applying migrations, so a fresh install does not depend on a previously generated client. `pnpm dev` builds the shared package before starting both apps. Other useful checks are `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm check:i18n`.

## Seeded development accounts

All 19 seeded accounts are verified and share the local-only password `password123`:

| Role | Email |
| --- | --- |
| Admin | `admin@ironpulse.test` |
| Trainer | `trainer@ironpulse.test`, `trainer2@ironpulse.test`, `trainer3@ironpulse.test` |
| Member | `member@ironpulse.test`, `member2@ironpulse.test` through `member12@ironpulse.test` |
| Sponsor | `sponsor@ironpulse.test`, `sponsor2@ironpulse.test`, `sponsor3@ironpulse.test` |

Do not use this password or these accounts outside a local development database.
The account-by-account dashboard contents and the laptop/phone responsive checklist are maintained in the README's [Development seed accounts](../README.md#development-seed-accounts) and [Responsive review checklist](../README.md#responsive-review-checklist) sections.

## Phase 3D changes

- Registration supports both verification modes. In optional mode, new members are verified and signed in immediately; existing pending member accounts are activated after a successful login if verification is switched off. In required mode, the existing verification email and login gate remain active. Password-reset and development-mail flows remain available in either mode.
- The role overview pages now load live member, trainer, admin, and sponsor summaries from their respective API endpoints, including workout/membership/nutrition/appointment data, operational queues, popularity, revenue/signup trends, and sponsor activity.
- The demo seed is upsert-based, date-relative, production-guarded, and includes role-specific histories, appointments, workouts, nutrition plans, content, sponsor analytics, and audit activity. `pnpm db:reset` rebuilds and reseeds the local database.
- Use `pnpm check:i18n` to verify that the `mk` and `en` message keys match. Demo testimonials and statistics are development-only; seeded contact and partner examples are marked as demo content.
- Responsive navigation drawers lock background scrolling, trap keyboard focus, close on Escape, restore focus, respect safe areas, and use the dynamic viewport height on mobile. Zone pinning and parallax are limited to fine-pointer layouts; touch layouts retain swipeable cards and reduce motion layers.
- Mobile dashboard detail titles wrap beside, rather than under, the navigation action. Dashboard dates use the Skopje time zone and explicitly localized Macedonian weekday/month labels; seeded trainer copy and demo opening hours select the active language.
- Final Phase 3D gate passed: `pnpm lint`, `pnpm typecheck`, `pnpm test` (55 tests), `pnpm build`, and `pnpm check:i18n`. Browser DOM checks covered the listed public/auth/legal routes and 23 authenticated dashboard routes at the six README widths; retain the manual locale/theme, reduced-motion, touch, keyboard, and safe-area review before calling the visual review complete.

The exact code-check and visual-review result for this phase is recorded in [PROGRESS.md](../PROGRESS.md). The checklist in the README is still a required manual review: do not report all six viewport widths or every authenticated role's visual review as complete unless those browser checks have actually been run.

## Phase 4A: member dashboard

- The member dashboard now includes membership requests/history, workout logging/history/progress/records, searchable machines and exercise details, nutrition questionnaires/plans, trainer discovery and appointment requests, profile/privacy tools, and sponsor offers with impression/click tracking.
- Member profile and locale use authenticated `GET|PATCH /me/profile`; the existing GDPR export/deletion endpoints remain under `/me`. Request schemas are shared from `packages/shared`.
- Follow the README's [Member dashboard smoke test](../README.md#member-dashboard-smoke-test-phase-4a) for the seeded-member credentials, locked-state account, daily nutrition quota, and local reset precautions.
- Phase 4A final checks passed: workspace lint, typecheck, tests, production build, and i18n parity. Automated route checks at 360, 768, and 1280 px found no horizontal document overflow. This is not a full manual visual, keyboard, reduced-motion, theme, or touch review; see the Phase 4A entry in [PROGRESS.md](../PROGRESS.md).

## Frontend API integration

Use `NEXT_PUBLIC_API_URL` from `apps/web/.env.local` as the API origin (default `http://localhost:4000`). The API exposes its full, authoritative request/response definitions and authorization requirements at `/api/docs` (locally: <http://localhost:4000/api/docs>).

Frontend route families include:

- Auth/session: `GET /auth/csrf`, `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password`, and `GET /auth/me`.
- Public content: `GET /content/rules`, `/content/settings`, `/memberships/plans`, `/machines`, `/machines/:slug`, `/trainers`, and `/sponsors`; `POST /content/trial-requests`.
- Memberships: `GET /memberships/me`, `/memberships/me/history`, `/memberships/me/days-remaining`; `POST /memberships/request`.
- Training: `GET /machines/:slug/exercises`, `/exercises/:id`, workout history/progress/personal-records under `/workouts`, trainer client/profile/availability routes under `/trainers`, and member/trainer bookings under `/appointments`.
- Nutrition: `POST /nutrition/questionnaire`; member plan list/detail/regenerate/delete under `/nutrition/plans`; assigned-client trainer review and approval under `/nutrition/clients/:memberId/plans`.
- Sponsor portal: sponsor-owned profile, offers, and stats under `/sponsors/me`; public offer impression/click counters under `/sponsors`.
- Admin portal: user search/status, dashboard, audit log, and invitation endpoints under `/admin`; content, plan, machine/exercise, and sponsor management endpoints are under their respective `/admin` route families.
- Privacy and service status: `GET|PATCH /me/profile`, `GET /me/export`, `DELETE /me`, and `GET /health`.

Follow the Swagger operation details for HTTP methods, request schemas, pagination, roles, and response shapes rather than inferring them from route names. Auth is cookie-based: send requests with credentials enabled, obtain the double-submit CSRF token from `GET /auth/csrf`, and include its value in the `x-csrf-token` header on state-changing requests. Production browser origins must be in `CORS_ORIGINS`; development also accepts HTTP localhost/loopback origins on alternate ports for Next.js port fallback.

## Conventions

- **Localization:** use next-intl message catalogs in `apps/web/messages/mk.json` and `apps/web/messages/en.json`; Macedonian (`mk`) is the default. Keep user-facing copy localized.
- **Validation and types:** define request/response validation with Zod in `packages/shared` where it is shared; reuse those schemas in the API and web client. Keep TypeScript strict and avoid `any`.
- **Design tokens:** use the Tailwind theme and CSS custom properties. The current brand accent is electric lime (`#b7ff39`) with a dark-first palette; extend the shared tokens rather than introducing unrelated colors or ad hoc styling.
- **Animation:** use photography-led, story-driven design in the style of modern premium gyms. Scroll animations enhance photos and content; the rolling weight plate is used only in the rules section. Animate transforms and opacity only, clean up animation/scroll triggers on unmount and route changes, and provide static fallbacks when `prefers-reduced-motion` is enabled.
- **Security and API boundaries:** trust backend guards for authorization; frontend route protection is only a UX mirror. Never log passwords, tokens, or PII. Do not introduce real payment processing; use the mock provider.

## Current state and remaining work

The latest entries in `PROGRESS.md` record the Phase 4A member dashboard on top of the Phase 1 foundation and Phase 2A/2B API modules. The current implementation includes auth and role dashboards; localized web messages; seeded gym content; membership/mock-payment lifecycle; machines/exercises; workouts; nutrition plans; trainers/appointments; sponsors; admin operations; GDPR profile/export/deletion endpoints; and functional member workflows.

Known limitations recorded in `PROGRESS.md`:

- The machine library has 14 locally illustrated entries and seeded technique-demo video IDs; review video ownership, availability, and suitability before publishing that content.
- The scheduled daily membership-expiry query is covered by tests, but the scheduler was not observed firing at midnight.
- Live Anthropic requests, production SMTP, production database deployment, and production TLS/cookie behavior have not been exercised. Without an Anthropic key, the fallback nutrition provider is used.
- The hero and rules motion should follow the current photography-led design direction; use `PROGRESS.md` for the Phase 3 verification status.
- Local email output under `apps/api/.dev-mails/` and `/dev/last-email` are development-only.

Use `PROGRESS.md` for the detailed verification history and additional environment/testing notes.

## Fresh-clone verification and local-file dependencies

The setup flow was exercised from a clean temporary copy with `node_modules`, generated build output, local databases, local mail, and actual `.env` files omitted. After copying the three `.env.example` files, `pnpm install --frozen-lockfile`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm build`, and `pnpm test` all passed. The clean-copy API health endpoint, web home page, and Swagger UI also returned HTTP 200 when started on alternate local ports. `db:migrate` generates the Prisma client, removing the hidden dependency on a client generated in a developer's existing workspace.

This workspace currently has no `.git` metadata or configured remote, so a literal `git clone` and a Git-tracked-file audit could not be run here. The clean-copy setup simulation succeeded, but it cannot prove which files will be tracked when this project is published. Before handoff, confirm that the GitHub repository includes `pnpm-lock.yaml`, all migrations, all three `.env.example` files, and the seed.

The backup script writes to `../ironpulse-backups/`, which is outside the repository root and cannot be matched by this repository's `.gitignore`. No backup files need to be committed.

## Phase 4B: trainer, admin, and sponsor dashboards

- Trainer, admin, and sponsor section routes now render functional workspace forms, tables/cards, charts, loading skeletons, empty/error states, localized feedback, and responsive phone layouts. Trainer client details are available under `/trainer/clients/:memberId`; nutrition review links open `/trainer/nutrition/:memberId`.
- Admin operations use the existing role-protected API and `/admin/:path*` middleware. The admin API now lists inactive membership plans and sponsors, supports audit-log action/entity filters, and exposes sponsors' active offers. `SponsorOffer.isActive` is persisted by migration `phase4b_sponsor_offer_status`.
- Trainer assigned-client detail is guarded by the trainer-client assignment before returning profile fields. The rest of trainer plan/workout reads and writes retain existing assignment checks.
- See the README's [Phase 4B role smoke test](../README.md#trainer-admin-and-sponsor-dashboard-smoke-test-phase-4b) for exact seeded accounts and destructive-test/reset notes.
- Do not mark manual visual/accessibility review complete from automated builds or route checks alone. Review both locales, light/dark themes, reduced motion, keyboard flows, and 360px phone behavior for all three roles.

## Phase 4C: audit and fixes

- Machine detail was a 404 because the dashboard catch-all rejected member machine IDs. It now renders `/member/machines/:id`; an active-member Playwright test opens the seeded Leg Press detail and checks its exercise content and SVG slot.
- Trainer overview cards/rows now link to client/appointment pages. The E2E path follows the nutrition review link, edits/saves the plan, and saves/approves it. Login now preserves a safe same-origin `next` route.
- Role and public menus were checked at 320, 350, 360, and 390 px for reachable 44px+ links, focus cycling, Escape, and close-on-navigation; all role routes were checked for page overflow at 320, 350, 360, 390, 768, 1024, 1280, and 1536 px.
- Other audit repairs: remove fabricated homepage testimonials/statistics, hardcoded membership price fallback, and dead sponsor link; remove broken seeded trainer photo paths; add app icon; add pending guards and confirmation prompts for mutations.
- Latest validation: `pnpm lint`, `pnpm typecheck`, `pnpm test` (79 tests), `pnpm build`, and `pnpm check:i18n` (876 matching keys) pass. `pnpm test:e2e` passes all 6 Chromium tests across the 4 seeded roles and public site.
- Full manual visual testing across locale/theme/reduced-motion, real device touch/safe-area, every mutation/validation branch, and destructive action remains outstanding. Seed machine video IDs still read `TODO-replace`; they are not real videos and will show the unavailable state until reviewed IDs are supplied.
- Current development browser/API used ports 3002/4001. A pre-existing API process on port 4000 was left untouched. For normal fresh-checkout walkthroughs see [README Phase 4C audit and manual role walkthrough](../README.md#phase-4c-audit-and-manual-role-walkthrough); run `pnpm db:reset` only when it is safe to replace the local database with seed data.

## Phase 3 presentation audit follow-up

- The existing `next-intl` App Router setup, `mk`/`en` catalogs, locale persistence, translated application UI, and responsive navigation were retained. Current catalogs have 969 matching keys; do not duplicate or replace this setup.
- Consent is stored in the `user_consent` cookie as `accepted` or `rejected` for one year. The client-rendered banner supports both choices, and external map/video embeds are gated on accepted consent. No analytics or advertising scripts are present.
- Homepage counts and public membership prices use the active locale for number formatting.
- The 2026-10-22 Phase 3 checks passed web lint, typecheck, Vitest (37), production build, and i18n parity. Public routes had no page-level overflow at 360/768/1280 in both locales; responsive role checks covered all four seeded roles. See the Phase 3 entry in [PROGRESS.md](../PROGRESS.md) for the detailed audit and test results.
- Known limitations remain unchanged: nutrition meal-plan content is API-owned and not translated per locale, blog posts use local fallback data, and contact submission lacks an API endpoint. Production external-embed behavior and complete physical-device/theme/reduced-motion visual review remain follow-ups.
