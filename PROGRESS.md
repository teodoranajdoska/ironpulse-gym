# Phase 1 progress

Status is based on commands and smoke tests actually run in this environment.

| Item | Status | Verification |
|---|---|---|
| 1. Monorepo | DONE | `pnpm install`, lint, typecheck, tests, and production build run successfully. Root dev script starts both workspaces after building shared output. |
| 2. Local infrastructure | DONE | SQLite local setup and file-based development mail replace external service dependencies. |
| 3. Prisma schema and migration | DONE | Prisma 6.19.3 validates the SQLite schema; fresh initial migration generated and applied successfully to `apps/api/prisma/dev.db`. |
| 4. Seed data | DONE | `pnpm db:seed` passed twice; seed users use Argon2 hashes and are verified. `pnpm db:reset` also recreated and seeded the DB successfully. |
| 5. Auth module | DONE | Unit tests and SQLite lifecycle e2e pass. Browser smoke test registered a member, used its local verification link, logged in, retained session across navigation/reload, and logged out. Seeded admin login also succeeded. |
| 6. Cross-cutting API | DONE | API starts against SQLite and `/health` returned HTTP 200; dev-mail endpoint was used to retrieve the real verification link. |
| 7. Web foundation/auth wiring | DONE | Production build passes; local web endpoint returned HTTP 200. Browser confirmed member dashboard and that `/admin` redirects a member to `/member`; signed-out access redirects to `/login?next=%2Fadmin`. |
| 8. Docs | DONE | README, ERD note, and this progress report updated for SQLite and local email. |

## Verification run

- [x] Prisma version checked: Prisma CLI and `@prisma/client` 6.19.3 (above the requested 6.2 minimum; no upgrade required).
- [x] `pnpm install` — passed; lockfile was up to date.
- [x] `pnpm db:migrate` — passed; no pending migration after the initial database setup.
- [x] `pnpm db:seed` — passed twice (also ran via `pnpm db:reset`).
- [x] `pnpm lint` — passed.
- [x] `pnpm typecheck` — passed for shared, API including seed, and web.
- [x] `pnpm test` — passed: shared 2 tests, web 4 tests, API 13 tests including SQLite e2e; API printed `Test Suites: 2 passed, Tests: 13 passed`.
- [x] `pnpm build` — passed for shared, API, and web.
- [x] `pnpm dev` — API and web started; `GET http://localhost:4000/health` returned `200 {"status":"ok"}` and `GET http://localhost:3000/` returned HTTP 200.
- [x] Browser: seeded admin logged in and saw ADMIN dashboard.
- [x] Browser: new member registered, verification email/action link retrieved, and email confirmed.
- [x] Browser: new member logged in; dashboard name and MEMBER role shown.
- [x] Browser: member session remained active after page reload; navigation to `/admin` redirected to `/member`.
- [x] Browser: member logout cleared the session; signed-out `/admin` access redirected to `/login?next=%2Fadmin`.
- [x] Test runner created/migrated/seeded `test.db`, ran e2e, and removed its database/journal afterwards.

## Remaining limitations

- Local development email files and `/dev/last-email` are intentionally development-only; production delivery requires configuring SMTP.
- SQLite is the selected local backend. Switching providers later requires a fresh provider-compatible migration and review of JSON field compatibility.
- The legacy Prisma seed configuration was migrated to `apps/api/prisma.config.ts` during Phase 2A; the seed command was verified without the deprecation warning.
- Seeded exercise video IDs remain explicit `TODO-replace` content placeholders as requested in the Phase 1 seed brief.

## Phase 2A progress

| Module / item | Status | Verification |
|---|---|---|
| Prisma seed configuration | DONE | Removed `package.json#prisma`, added `apps/api/prisma.config.ts`, and verified `pnpm db:seed` with `DATABASE_URL=file:./dev.db`. |
| Content | DONE | Public localized rules/settings and trial request, admin CRUD/status routes, Zod validation, throttling and audit events. API lint, typecheck, and 18 API tests passed. |
| Memberships | DONE | Public plans, member history/request/days remaining, mock pending payments, admin confirmation/cancellation/plan changes. Extension, UTC date behavior, expiry, and lifecycle e2e tests pass. |
| Daily expiry scheduler | PARTIAL | The Nest daily cron is registered, and the expiry service/query is unit-tested; a real midnight scheduler tick was not waited for. |
| Machines and exercises | DONE | Public locale-aware machine list/detail, membership-gated full exercise details, admin CRUD and audit events. Seeded muscle/exercise detail was validated by API e2e tests; lint/typecheck pass. |
| Workouts | DONE | Member workout logging, paginated history, per-exercise progress and personal records, with rep/weight bounds. API e2e coverage and API lint/typecheck pass. |
| Seed expansion and SQLite indexes | DONE | Seed ran successfully on `dev.db` and test database; added and applied `phase2a_domain_indexes` migration. |
| README/API overview | DONE | API route groups, authorization, pagination, mock-payment lifecycle, and workout/machine payload boundaries documented. |
| Final workspace verification | DONE | Root lint, typecheck, tests (18 API / 24 workspace total), and production build all passed. |
| Live development smoke check | DONE | `pnpm dev` started both apps; health, localized rules, settings, plans, machine search, web homepage, and Swagger returned HTTP 200. |

## Phase 2A verification

- [x] `pnpm db:seed` — succeeded using the new `prisma.config.ts`; no legacy seed-config warning.
- [x] `pnpm --filter api lint` and `pnpm --filter api typecheck` — passed after domain changes.
- [x] `pnpm --filter api test` — 3 suites / 18 tests passed, including the e2e content, RBAC, payment confirmation, exercise access, and workout flows.
- [x] `pnpm lint` — passed for shared, web, and API workspaces.
- [x] `pnpm typecheck` — passed for shared, web, API, and API seed.
- [x] `pnpm test` — passed: 24 tests across shared, web, and API.
- [x] `pnpm build` — passed for shared, API, and web.
- [x] `pnpm dev` — API and web started locally. Public API checks returned HTTP 200: `/health`, `/content/rules?locale=en`, `/content/settings`, `/memberships/plans?pageSize=2`, `/machines?category=LEGS&locale=en&pageSize=2`; web homepage and `/api/docs` also returned HTTP 200.

## Phase 2A remaining verification

- The daily expiration query and update count are unit-tested, but the cron was not observed firing at midnight.
- Production database deployment, SMTP delivery, and production cookie/TLS behavior were not exercised in this local SQLite development run.

## Phase 2B progress

| Module / item | Status | Verification |
|---|---|---|
| SQLite schema and migrations | DONE | Added trainer availability, persistent UTC-day nutrition quotas, and payment confirmation timestamps; all six migrations apply on a fresh test database and the development database. |
| Nutrition | DONE | Shared Zod meal-plan schema, Mifflin-St Jeor targets/macros, Anthropic provider, deterministic diet/allergy-aware fallback, schema retry/fallback, one-success-per-user-per-UTC-day quota, member CRUD, trainer client-scoped editing/approval, and response disclaimer. Unit tests cover calculation, schema, fallback, and quota enforcement. |
| Trainers and appointments | DONE | Public profiles, trainer profile/client/availability management, assigned-client workout/nutrition access, future bookings, state transitions, notes, and overlap checks. SQLite test verifies simultaneous conflicting bookings result in one reservation; trainer non-client access is denied. |
| Sponsors | DONE | Public active sponsor/offer listing, anonymous IP-throttled aggregate impression/click counters, sponsor profile/offers/stats ownership, and admin sponsor profile activation. Unit test verifies cross-sponsor offer edits are rejected. |
| Admin | DONE | Paginated user search/filter/status, existing trainer/sponsor invitation flow, dashboard statistics using payment confirmation month, and paginated audit log. Live smoke checks exercised admin login, dashboard, and user search. |
| GDPR | DONE | JSON export omits credentials/tokens and includes associated records/trial requests. Password-confirmed anonymization removes personal records and tokens, detaches memberships/payments, clears actor references, and retains aggregate payment/sponsor stats. Tests cover export, deletion, and wrong-password rejection. |
| Seed and docs | DONE | Seed adds trainer-client links, UTC availability, a confirmed appointment, a sample nutrition plan, and sponsor stats/offers. README includes the API/RBAC overview; ERD reflects new relations. |
| Full workspace verification | DONE | `pnpm lint`, `pnpm typecheck`, `pnpm test` (37 total: shared 2, web 4, API 31), and `pnpm build` all passed. |
| Live development smoke checks | DONE | With local development environment values set, `pnpm dev` started API and web. Health, public trainer/sponsor lists, Swagger, and web returned HTTP 200; admin login/dashboard/search succeeded; member fallback generation returned a seven-day DRAFT and disclaimer; `/me/export` omitted `passwordHash`. |

## Phase 2B remaining limitations

- An Anthropic API request was not made because `ANTHROPIC_API_KEY` is unset; fallback generation was tested by unit test and live API call.
- `pnpm dev` requires the documented environment values (for example, copy the root and app `.env.example` files); no local `.env` files were present during this run, so smoke testing supplied the local development values directly.
- The live member smoke test generated one plan for the seeded first member and consumed that member's one-plan-per-UTC-day quota; this is a development database change, not part of the seed.
- Production SMTP, external Anthropic availability, and production database deployment were not exercised.
