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

## Phase 3 redesign (part 1)

| Area | Status | Verification |
|---|---|---|
| Remove the previous hero direction | DONE | Deleted the old hero component/configuration and removed its references from code, docs, tests, and Copilot instructions; targeted repository search found no remaining old-direction matches. |
| Brand foundation and shell | DONE | Added the photography-led design system, display/body fonts, dark/light CSS tokens, responsive navigation, footer, cookie banner, auth panel, and role-dashboard styling. Fixed utility-class conflicts found during a 390px viewport check; mobile navigation now fits, opens, and closes with Escape. |
| Local image system | DONE / PARTIAL | Added all 14 localized manifest slots, `GymImage` fallback, server-side file availability checks, optional video gating, and `docs/IMAGES.md`. Downloaded 10 Pexels-licensed local gym images and documented their sources. PARTIAL because portraits for all three trainers, a nutrition image, and hero video are not supplied. |
| Home experience | DONE | Built the ordered story sections, API-backed plans/machines/trainers/sponsors/settings, photo-backed training zones and machine cards, marked placeholder testimonials, and trial form. Browser confirmed all 6 machine-card photos and the zone-gallery photos loaded successfully. |
| Motion, locale, and theme | DONE / PARTIAL | Fixed the pinned gallery failure: the route-transition wrapper retained a `transform`, making ScrollTrigger's fixed pin relative to the entire page instead of the viewport. The route transition is now opacity-only; the desktop gallery pins correctly and its cards stay visible through the horizontal scrub without document overflow. Mobile keeps native horizontal snap scrolling. Locale/theme controls and reduced-motion state were checked. PARTIAL because every other section has not been manually checked at every width and motion mode. |
| Auth pages, error pages, and dashboards | DONE / PARTIAL | Smoke-checked login, register, verify-email, forgot/reset password, and 404 routes. The current browser session is a member; non-member role routes were correctly redirected to `/member`, so trainer/admin/sponsor dashboard layouts were not visually inspected under their respective accounts. |
| Membership pricing helpers | DONE | Added monthly-price and savings calculations with 9 focused Vitest cases; the pricing cards are populated from the API. |
| Documentation and remaining content | DONE / PARTIAL | Added image sourcing guidance and updated README/HANDOFF. Legal pages are starter copy and need legal review; testimonial text and trust-row community numbers are explicit placeholders for replacement. |
| Workspace checks | DONE | `pnpm --filter web lint`, `pnpm --filter web typecheck`, `pnpm --filter web test` (13 tests), and `pnpm --filter web build` pass after the gallery fix; all 10 downloaded local photos passed JPEG signature checks. |
| Browser verification | PARTIAL | Checked live API card counts, loaded zone and machine photos, desktop pin at multiple scroll positions with no horizontal document overflow, and mobile snap layout with no overflow. Language/theme switching, reduced-motion preference, mobile navigation, auth routes, and role protection were also checked. Not every homepage section was inspected in every combination; remaining local slots and each role's authenticated dashboard still need review. |

### Phase 3 remaining verification

- Add the remaining local photos from `docs/IMAGES.md` (and optionally `public/video/hero.mp4`), then inspect all 14 slots, focal points, video fallback, and overlays.
- Manually scroll every home section at desktop and mobile widths in both languages and themes, including with `prefers-reduced-motion` enabled.
- Sign in as each role and visually inspect its dashboard/sidebar; submit the free-trial form once for both success and API-error states.
- Review privacy/terms copy with the appropriate legal owner and replace the explicitly marked testimonial and community-number placeholders before publishing.

## Workspace relocation / environment recovery

- Reproduced the startup error with no local `.env` files: Zod reported missing `DATABASE_URL` and `JWT_SECRET`.
- Added safe local defaults and the API port, web URL, SMTP, mail, CORS, and client URL variables to the environment examples; startup validation now names missing/invalid keys and suggests copying `.env.example`.
- Removed workspace `node_modules`, reinstalled with `pnpm install`, applied migrations, and seeded successfully from the moved `C:\Users\anton\Projects\MuscleBoost` path.
- Verified API lint, typecheck, build, and all 31 API tests; `/health` and the web home returned HTTP 200. Browser smoke check showed 2 trainer cards, 6 machine cards, and 4 membership plans loaded from the API.

## Phase 3D: auth, responsive review, and copy polish

| Area | Status | Verification |
|---|---|---|
| Optional email verification | DONE | Both environment schemas/examples already default to `false`. New optional-mode registrations are verified and issued both session cookies without verification mail; required mode keeps the verification email/login gate. Successful login also activates a pending member account if the deployment has switched from required to optional mode. |
| Auth test coverage | DONE | Unit/e2e coverage exercises required and optional registration, immediate session cookies, no verification token, unverified login behavior, and activation of a previously pending member when verification becomes optional. |
| Responsive fixes | AUTOMATED WIDTH SWEEP DONE / MANUAL REVIEW REMAINS | Fixed undersized auth links, added safe-area spacing, made dashboard detail navigation a keyboard-operable full-screen mobile drawer, and constrained the mobile detail header title so it cannot overlap its menu button. Pinning/parallax are limited to fine pointers; touch swipe behavior remains and heavy imagery motion is reduced on touch layouts. Browser checks verified no header overlap at 360 and 390 px and covered public/auth/legal/404 plus the 23 MEMBER, TRAINER, ADMIN, and SPONSOR overview/detail routes at the six README widths. |
| Content and placeholder handling | DONE | Improved bilingual gym rules, empty-state/CTA copy and Macedonian spelling. Seeded trainer bios and specialties and demo opening hours now render in the selected language; old seeded specialty values are localized too. Demo testimonials/statistics and sample sponsor/contact values are marked in code and shown with a development-only badge; demo statistics and example.com partners are not exposed as production content. |
| i18n key parity | DONE | `pnpm check:i18n` reported matching `mk` and `en` catalogs (370 keys). |
| Workspace lint/typecheck | DONE | Final `pnpm lint` and `pnpm typecheck` passed across shared, API, and web. |
| Workspace tests and production build | DONE | Final `pnpm test` passed (55 tests: shared 2, web 15, API 38); `pnpm build` passed for shared, API, and web. |

### Manual responsive review still required

Use the README's F12 device-mode checklist for visual/touch review. The browser DOM sweep found no reproducible page overflow, clipped headings, or sub-44 px controls across the checked public/auth/legal/404 and authenticated routes. Seeded credentials worked for all four roles. Still inspect both locales and themes, reduced motion, real touch behavior, form keyboard behavior, safe areas/notch insets, image focal points, chart/table scrolling, and placeholder badges manually; the automated DOM checks do not constitute a full visual review.

## Phase 4A: member dashboard

| Area | Status | Verification |
|---|---|---|
| Member overview | DONE | Added live membership/expiry, appointment, latest-workout, weekly-workout and sponsor-offer summaries with loading, empty, and error states. |
| Memberships | DONE | Added plan comparison, pending mock-payment requests, request feedback, and membership history/statuses. |
| Workouts | DONE | Added membership-gated workout logging, set validation, history, per-exercise progress chart, and personal records. |
| Machines and exercises | DONE | Added searchable/filterable machine library, member-only exercise details, numbered guidance, safety/mistake lists, and click-to-load YouTube privacy-enhanced embeds. Seed video IDs explicitly marked `TODO-replace` render as unavailable placeholders. |
| Nutrition | DONE | Added validated multi-step questionnaire, calorie/macronutrient visualization, seven-day meal cards/day selection, plan status, regeneration quota handling, delete, print-only plan view, and visible non-medical-advice disclaimer. |
| Trainers and appointments | DONE | Added trainer directory, future appointment requests, conflict handling, upcoming/past lists, cancellation, and localized statuses. |
| Profile and privacy | DONE | Added shared-schema `GET/PATCH /me/profile` for profile/locale, GDPR export download, and password-confirmed account deletion warning. |
| Sponsor tracking | DONE | Added offer strip/detail cards and impression/click tracking through existing throttled API endpoints. Repeated browser route sweeps reached the expected IP rate limit; offer pages continued rendering. |
| Localization and tests | DONE | Added matching English/Macedonian member strings, including machine categories and muscle groups, and Vitest coverage for member helpers and shared request schemas. Final `pnpm check:i18n` reports 615 matching keys. |
| Workspace checks | DONE | Final `pnpm lint`, `pnpm typecheck`, `pnpm test` (63 tests: shared 2, web 21, API 40), and `pnpm build` passed. |
| Responsive browser sweep | AUTOMATED WIDTH SWEEP DONE / MANUAL REVIEW REMAINS | All ten member routes were checked at 360, 768, and 1280 px; no page-level horizontal overflow was found. Macedonian and English switching was checked previously. Manual visual review of keyboard/touch, theme, reduced motion, print output, and state-changing form flows remains. |
| Documentation | DONE | README now documents member routes, seeded test accounts, quota/lock states, and reset precautions; HANDOFF and this progress report document the new profile API and verification. |

### Phase 4A verification notes

- Current-checkout revalidation (2026-10-18): `pnpm lint`, `pnpm typecheck`, `pnpm test` (82 tests: shared 2, web 32, API 48), `pnpm build`, and `pnpm check:i18n` (883 matching keys) all passed.
- Final commands were run after the last code changes: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm check:i18n`; all succeeded.
- Browser DOM checks used the seeded member session on the alternate local web/API ports 3001/4001. No destructive form actions were submitted. Sponsor impression testing incremented local development analytics and reached the API's IP throttle during repeated route sweeps; run `pnpm db:reset` to restore seeded state before a fresh manual smoke test.
- Seeded machine-video IDs are placeholders as required by the seed brief; real exercise videos must be supplied before publishing.
- Nutrition plan meal names and some seeded partner descriptions come from the API/seed data and are not automatically translated by the member UI.
- This automated check does not replace the README's full manual responsive/accessibility review.

## Member API connectivity follow-up

| Area | Status | Verification |
|---|---|---|
| Development CORS on alternate Next ports | DONE | API now accepts HTTP localhost/loopback origins on any port only in development; production continues enforcing the exact `CORS_ORIGINS` allow-list. CORS policy has three unit cases, and a live `OPTIONS` request from `http://localhost:3001` received the matching allow-origin header from the rebuilt API. |
| Expired access-token recovery | DONE | Member GETs now share one refresh request after 401 and retry once after successful refresh. Vitest verifies concurrent requests use one refresh; existing CSRF cookie/header and credentialed requests are preserved. |
| Transient data-load recovery | DONE | Safe GET/HEAD requests retry once on network `TypeError` or 502/503/504; terminal failures still surface to the existing loading/error/retry UI. Vitest verifies network retry and `credentials: include`. |
| Seeded API/controller smoke test | DONE | Authenticated browser requests to `/auth/me`, memberships, workouts/history/records, nutrition plans, machines/detail/exercises, `/me/profile`, appointments, and sponsors returned HTTP 200 with expected JSON shapes and non-empty seeded list data where applicable. |
| Browser route smoke test | DONE | Member overview and all portal sections loaded in MK at 360 px with no generic data-fetch error or horizontal document overflow; nutrition and workout forms rendered seeded data. |
| Workspace verification | DONE | Focused auth/API-client tests (6) and CORS policy tests (3) passed; final `pnpm lint`, `pnpm typecheck`, `pnpm test` (68 total: shared 2, web 23, API 43), `pnpm build`, and `pnpm check:i18n` all passed. |

The browser repro used port 3001 against a fresh API process on 4001. The previously running API process on port 4000 was not stopped or changed; before retesting against that already-running process, restart the API so it loads the current CORS policy and profile endpoint implementation. On the standard `pnpm dev` ports (web 3000/API 4000), production code keeps the existing explicit CORS allow-list behavior.

## Phase 4B: trainer, admin, and sponsor dashboards

| Area | Status | Verification |
|---|---|---|
| Trainer workspace | IMPLEMENTED | Added searchable assigned-client list/detail with profile, workout-volume chart/history and editable/approvable nutrition plans; appointment status/notes actions; weekly availability editor; bio/specialty/photo profile editor. |
| Admin workspace | IMPLEMENTED | Added user search/role/status filters/pagination and account invitations; mock-payment confirm/reject; plan editor; machine/exercise CRUD; bilingual rule/settings editor; trial request status management; sponsor list/status/profile management; analytics and filtered audit log. |
| Sponsor workspace | IMPLEMENTED | Added company profile editor, offer create/edit/delete and active status, aggregate counts, and daily impression/click chart. |
| Responsive and state UX | IMPLEMENTED / MANUAL REVIEW REMAINS | Added localized loading skeletons, empty/error/retry states, live success/error feedback, desktop accessible tables with horizontal container overflow and mobile card layouts, and chart text alternatives. At 360px, all 20 trainer/admin/sponsor routes rendered without document overflow or generic load errors. Manual keyboard, theme, reduced-motion, and visual review remains. |
| API support | IMPLEMENTED | Added assignment-guarded trainer client profile, admin plan/sponsor listings, audit action/entity filters, sponsor offer active state, and a Prisma migration. |
| Localization/docs | IMPLEMENTED | Added matching English/Macedonian workspace strings and documented exact seeded role test accounts and reset precautions in README/HANDOFF. |
| Required workspace verification | PASSED | After the final auth-client/test changes, `pnpm lint`, `pnpm typecheck`, `pnpm test` (74 tests: shared 2, web 24, API 48), `pnpm build`, and `pnpm check:i18n` all passed; the MK and EN catalogs match at 872 keys. |
| Browser route smoke test | PASSED / MANUAL REVIEW REMAINS | Signed in as sponsor, trainer, and admin and loaded all 20 role routes at 360px; all had no page-level horizontal overflow or generic loading error. A fresh login after logout succeeded, exercising the CSRF token refresh path. No destructive CRUD actions were submitted. |
| Visual/accessibility review | PARTIAL | Automated 360px route smoke checks passed. Full manual review of both locales/themes, keyboard and touch operation, reduced motion, chart/table interaction, and form state changes remains. |

### Phase 4B verification notes

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm check:i18n` were rerun after the last code edits; all passed.
- Browser role checks used web port 3001 and a fresh API process on port 4001. The unrelated pre-existing API on port 4000 was left running and untouched.
- Seeded role credentials and route-by-route smoke-test instructions are documented in the Phase 4B section of the README. Do not submit payment decisions, account status changes, or CRUD forms during a read-only smoke test.

## Phase 4C: audit and fixes

This section supersedes earlier route and smoke-test completion claims where this phase found a mismatch. `DONE` means the feature and its route/API wiring are present; the listed automated checks verify route rendering and responsive layout, not every possible business-state permutation. `PARTIAL` means a specific content/manual-verification gap remains; `STUB` identifies seeded placeholder content.

### Route and link audit

| Route group | Routes checked | Page implementation | Navigation |
|---|---|---|---|
| Public | `/`, `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/privacy`, `/terms` | Dedicated App Router pages; global `app/not-found.tsx` and `app/error.tsx` handle not-found/runtime errors. | Public navbar/footer and auth links; homepage in-page links target existing sections. |
| Member | `/member`, `/member/membership`, `/member/nutrition`, `/member/workouts`, `/member/machines`, `/member/machines/:id`, `/member/trainers`, `/member/appointments`, `/member/sponsors`, `/member/profile` | Dedicated overview plus `app/[...dashboard]/page.tsx` for sections and machine detail. | Every sidebar route was clicked in Playwright; machine detail opens from its machine card. |
| Trainer | `/trainer`, `/trainer/clients`, `/trainer/clients/:memberId`, `/trainer/appointments`, `/trainer/nutrition`, `/trainer/nutrition/:memberId`, `/trainer/availability`, `/trainer/profile` | Dedicated overview plus dashboard catch-all for section and client/plan detail routes. | Every sidebar route was clicked; overview cards and client nutrition links point to real detail routes. |
| Admin | `/admin`, `/admin/users`, `/admin/memberships`, `/admin/machines`, `/admin/exercises`, `/admin/content`, `/admin/trials`, `/admin/sponsors`, `/admin/analytics`, `/admin/audit` | Dedicated overview plus dashboard catch-all. | Every sidebar route was clicked in Playwright. |
| Sponsor | `/sponsor`, `/sponsor/offers`, `/sponsor/analytics`, `/sponsor/profile` | Dedicated overview plus dashboard catch-all. | Every sidebar route was clicked in Playwright. |

The authenticated role-route test recorded browser console errors, uncaught page errors, and HTTP responses >=400 after sign-in. It asserted each page's main heading and absence of page error alerts. It also checked document overflow at 320, 350, 360, 390, 768, 1024, 1280, and 1536 px. This is a rendered-route audit, not a substitute for manually exercising every CRUD validation/error branch.

### Phase 3D / 4A / 4B specification coverage

| Feature | Status | Evidence / remaining scope |
|---|---|---|
| Phase 3D registration, verification modes, refresh/logout, recovery | DONE | Existing auth suites and manual auth instructions; role return-to-path now survives login and rejects unsafe destinations. |
| Phase 3D i18n key parity | DONE | `pnpm check:i18n`: 876 matching keys in `mk` and `en`. |
| Phase 3D responsive menus and page layout | DONE / MANUAL REVIEW REMAINS | Role and public navigation checked at 320/350/360/390; all role pages checked at the full width matrix. Notch/touch/visual/theme/reduced-motion review remains manual. |
| Member overview and API data states | DONE | Role route smoke plus workspace loading/empty/error/retry UI. |
| Membership request and mock-payment lifecycle | DONE | Real plan/membership/payment API wiring and admin queue; full payment decision flow was not submitted during this audit. |
| Workout logging, history, progress chart, personal records | DONE | Real API wiring and member route smoke; the mutation was not submitted in the final E2E run. |
| Machine search/filter and detail content / SVG animation slot | DONE | Active-member `/member/machines/leg-press` opened in E2E; description, muscles, steps, mistakes, safety, sets/reps and animation slot rendered. |
| Machine YouTube embeds | STUB (seed data) | Click-to-load privacy-enhanced embed works only for a valid video ID. Seed values remain `TODO-replace`; there are no reviewed exercise-specific IDs, so the seeded records show unavailable-video copy instead of loading an embed. |
| Inactive-member machine/exercise lock and upgrade prompt | PARTIAL | The membership-required panel links to `/member/membership`; the final browser suite did not sign in as an inactive member to assert this state. |
| Nutrition questionnaire, calculations/results, charts, seven-day plan, print view | DONE | API-backed implementation with validation and fallback generation; member route smoke. Meal-name translation from API/seed content remains incomplete as noted above. |
| Trainer directory and member appointment requests/conflicts | DONE | API-backed pages and error mapping; conflict path exists, but no conflicting request was submitted in this browser audit. |
| Profile, GDPR export, account deletion | DONE / DESTRUCTIVE FLOW NOT RUN | Profile/export are implemented; deletion requires confirmation/password. Deletion was intentionally not performed against seeded accounts. |
| Member sponsor offer strip and click/impression tracking | DONE | Uses API tracking endpoints. Repeated tracking is rate-limited by the API; no external-link conversion was asserted. |
| Trainer overview, assigned clients and client details | DONE | Cards/rows now lead to client and appointment routes; client detail is assignment-guarded. Role-route E2E covered list routes. |
| Trainer appointment actions and availability editor | DONE | Real mutation calls, pending states, cancellation confirmation, and retry/error states; mutation branches not all submitted in this audit. |
| Trainer nutrition review/edit/approve | DONE | E2E navigated from nutrition list to seeded member plan, edited/saved, then saved and approved; status and APPROVED state were asserted. |
| Trainer profile editor | DONE | Connected to trainer profile API; final route rendering was smoke-tested, but profile mutation was not submitted. |
| Admin payment queue and membership-plan editor | DONE | API-backed queue/editor and confirmation prompts; decision/create/edit mutations were not submitted in the final E2E run. |
| Admin users, machine/exercise CRUD, rules/settings, trial requests, sponsors | DONE | API-backed list/editor/actions and destructive confirmations; CRUD/status mutations were not submitted in this audit. |
| Admin analytics and filtered audit log | DONE | API-backed sections loaded in the role-route E2E sweep. |
| Sponsor dashboard, analytics, profile and offers CRUD | DONE | API-backed sections loaded; writes were not submitted in the final E2E run. |
| Forms, loading/error/empty states and destructive confirmations | PARTIAL | Role pages expose states, mutation pending guards and confirmation prompts; exhaustive form-by-form validation/retry/destructive-action testing remains. |

### Problems found and repaired

- Member machine detail URLs were rejected by the dashboard catch-all and returned 404. The member detail route is now allowed and the active-member detail route is exercised in E2E.
- Trainer overview cards/rows did not consistently navigate to useful detail routes; they now link to client and appointment sections. The review-plan list-to-detail edit/save/approve path is covered end to end.
- Login discarded the protected destination. A validated same-origin `next` path is now retained; open redirects are rejected and unit-tested.
- Seeded trainer photo URLs referenced nonexistent images; those seed values are now `null` rather than generating broken image requests.
- Homepage had fabricated community statistics/testimonials, a hardcoded plan-price fallback, and a dead sponsor `#` fallback. Those misleading fallbacks were removed; demo-only opening-hours and partner fixtures remain explicitly marked in development.
- Added the missing App Router SVG icon to avoid a missing icon request.
- Several role mutation controls lacked pending guards or destructive confirmation; pending-state and confirmation handling was added across trainer, admin, sponsor, and member actions, with shared HTTP status error messaging.
- Machine seed video IDs and seed partner/contact demo values are still explicitly marked placeholders. No external exercise videos were approved/verified as part of this audit.

### Phase 4C verification

| Check | Result |
|---|---|
| `pnpm lint` | PASS (shared, web, API) |
| `pnpm typecheck` | PASS (shared, web, API) |
| `pnpm test` | PASS (79 tests: shared 2, web 29, API 48) |
| `pnpm build` | PASS (shared, API, web) |
| `pnpm check:i18n` | PASS (876 matching message keys) |
| Playwright E2E | PASS (6 tests: all 4 seeded roles through every sidebar route; role menus, guards, responsive widths; trainer nutrition review/edit/approve; active-member machine detail; public routes/navigation) |

The Playwright run used `http://localhost:3002` and the current API on port 4001. A pre-existing API process on port 4000 was not stopped or modified. Tests used seeded `password123` accounts. Earlier E2E attempts exposed a consent-banner pointer interception and a test's incorrect Macedonian success-text matcher; the test now explicitly accepts consent before navigation and checks the actual localized copy. These were test setup/assertion failures, not application route failures.

### Remaining limitations

- Perform the README's manual F12/device-mode sweep at 320/350/360/390/768/1024/1280/1536 px, including both locales/themes, reduced motion, keyboard/touch behavior, safe-area insets, chart/table interactions, and real form states. Automated DOM dimensions do not verify visual polish or actual device behavior.
- Replace `TODO-replace` machine video IDs with reviewed, exercise-appropriate IDs before expecting seeded video buttons to load a YouTube embed or publishing the library.
- The E2E suite verifies all sidebar destinations and the requested trainer/machine flows, but does not submit every admin/member/sponsor CRUD action, destructive action, 409 conflict, or all validation branches. Those remain covered by implementation/API tests where applicable and should be manually checked with a resettable local database.
- Production SMTP, live AI provider behavior, production TLS/cookie settings, and a scheduled midnight membership-expiry run were not exercised.

## Phase 4A-FAST: member Machines and Workouts connections

- [x] Machine detail actions open `/member/workouts` with the selected exercise prefilled; workout history and personal records link back to the machine guide.
- [x] The member overview links the latest session to Workouts and its machine guide; dashboard labels identify Machines and Workouts.
- [x] Public home machine cards link to their machine detail, and home/navbar member links target Machines and Workouts. Protected routes retain their destination through the login redirect.
- [x] Existing membership gating, form validation, SVG animations, loading/error/empty states, and click-to-load YouTube embeds were retained.
- [x] `pnpm typecheck` passed across shared, API, seed, and web workspaces. Tests were intentionally not run per the phase request.

## Public presentation Phase 1: home, team, services, and navigation

| Area | Status | Verification |
|---|---|---|
| Home hero, mission, highlights, services, and membership plans | ALREADY IMPLEMENTED | Existing API-backed homepage includes the hero/CTA, mission, four highlight cards, training features, and membership cards with benefits and registration CTAs; retained without redesign. |
| Trainer directory | COMPLETED | Public `/trainers` API data now includes `photoUrl` in the web response schema and uses available profile photos. Missing or failed photos display an accessible avatar fallback. The API currently exposes trainers only, not general employees. |
| Header and footer navigation | COMPLETED / PARTIAL | Team and Services links target existing homepage sections; Home and Contact target existing home/footer content. Blog links target `/blog`, which remains unimplemented for Phase 2; no placeholder route was added. |
| Web quality checks | PASSED | `pnpm --filter web lint`, `pnpm --filter web typecheck`, `pnpm --filter web test` (34 tests), `pnpm --filter web build`, and `pnpm check:i18n` (886 matching keys) passed. |
| Responsive browser review | PASSED | Live page checked at 360px and 1280px with no horizontal document overflow. Trainer and pricing cards rendered at both widths; null and failed trainer photos showed avatar fallbacks, and a supplied local image loaded. |

## Public presentation Phase 2: blog, contact, and trainer profiles

| Area | Status | Verification |
|---|---|---|
| Blog/news list and category filters | IMPLEMENTED / LOCAL FALLBACK | Added localized sample articles, image/title/excerpt/date/category cards, accessible category links reflected in `?category=`, a deliberate empty Nutrition category, and a visible local-content notice because no posts API/model exists. |
| Blog article details and states | IMPLEMENTED | Added dynamic slug pages with full localized article text, back links, loading skeletons, retry error boundary, and the existing site not-found page for unknown slugs. |
| Contact page and form | IMPLEMENTED / SUBMISSION API MISSING | Added all requested fields, Zod validation and inline accessible errors, pending/double-submit guards, reset and success-toast behavior, and error-toast behavior. `GET /content/settings` supplies the context block; the contact form calls an isolated frontend service for the missing `POST /content/contact-messages` contract. |
| Public trainer profile details | IMPLEMENTED | Added dynamic profiles using the existing public trainer list API, loading/error/not-found states, and profile links from homepage and member trainer cards. No API detail endpoint was added. |
| Shared feedback | IMPLEMENTED / REUSED | Reused existing skeleton and empty-state components and added a global accessible toast provider. |
| Localization and web checks | PASSED | English and Macedonian catalogs match at 966 keys. Web lint, type-check, production build, and all 37 Vitest tests passed. |
| Browser smoke/responsive checks | PASSED | Tested all category controls, URL persistence after reload, the empty category, valid and invalid detail navigation, invalid/valid form paths and mocked success reset, actual API failure toast, and 360px/1280px layouts without horizontal overflow. |

### Phase 2 limitations

- The API has no blog/news/category model or listing/detail endpoints; the blog intentionally uses clearly labeled local fallback data.
- The API has no contact-message endpoint. A valid form submission reaches the frontend service and receives the expected unavailable/error toast from the current API; the success/reset branch was exercised with a mocked successful response. Backend work was intentionally not made.
- Seeded address, phone, email, and hours are marked demo-only by the existing seed. The page hides these values outside development rather than presenting them as real gym details; approved contact details still need to be supplied.
- The existing public trainer endpoint is list-only, so profile detail pages locate IDs from its paginated list. Add an API detail endpoint if the trainer directory grows beyond the current page size.
- Unknown dynamic post/trainer routes render the localized site 404 page through Next.js `notFound()`. The production browser streamed these not-found pages with HTTP 200, consistent with App Router streaming behavior; status-code handling may need a non-streaming route strategy if strict HTTP 404 responses are required.

## Phase 3: presentation audit, localization, consent, and responsive QA

### Audit checklist

- [x] Existing and retained: App Router with `next-intl`, Macedonian and English message catalogs, cookie-persisted `ip_locale`, and `<html lang>` from the active locale (`apps/web/i18n/request.ts`, `apps/web/app/layout.tsx`, and `apps/web/messages/{mk,en}.json`).
- [x] Existing and retained: accessible MK/EN language selectors in desktop/mobile navigation and footer (`apps/web/components/language-switch.tsx`, `apps/web/components/site-navbar.tsx`, `apps/web/components/site-footer.tsx`).
- [x] Existing and retained: translated home, team, services, blog, contact, authentication, legal, and role-workspace UI, including form errors, notifications, and loading/empty/error states.
- [x] Existing and retained: responsive navigation drawer, keyboard handling, safe-area support, and responsive role workspaces (`apps/web/components/site-navbar.tsx`, `apps/web/components/role-dashboard.tsx`, `apps/web/app/globals.css`).
- [x] Completed gap: consent was localStorage-only and offered no rejection choice. It now reads/writes `user_consent=accepted|rejected` for one year, stays hidden after either choice, returns after cookie removal, and is rendered after client mount.
- [x] Completed gap: external Google Maps and YouTube embeds are not loaded unless consent is accepted; the map is also gated until acceptance.
- [x] Completed gap: homepage counters and pricing cards now format numbers using the active locale.
- [x] Existing API and fallback content remains localized where supplied by locale-specific API fields or `localizedSeedCopy`; no API changes were made.

### Verification and manual QA

- [x] `pnpm --filter web lint`, `pnpm --filter web typecheck`, `pnpm --filter web test` (37 tests), `pnpm --filter web build`, and `pnpm check:i18n` all passed; the catalogs contain 969 matching keys.
- [x] Locale switching from mobile and desktop selectors updates `<html lang>`, persists through refresh, and retains the active selection.
- [x] Fresh-visit consent, Accept, Reject, persistence after reload, reappearance after clearing the cookie, and keyboard-visible focus on both banner buttons were checked in the browser.
- [x] The contact map was absent with no consent, loaded after Accept, persisted after refresh, and stopped loading after the consent cookie was cleared or rejected.
- [x] Eleven public/auth/legal/blog/contact routes were checked at 360, 768, and 1280 px in both locales: 66 route/viewport checks with no document overflow.
- [x] Responsive browser tests passed for all four seeded roles and the public mobile menu. The member route sweep and inactive-member detail test passed on isolated retries after the initial full run hit the API auth rate limit; TRAINER, ADMIN, SPONSOR, public responsive, and mobile-navigation tests passed in the initial run.
- [x] Contact keyboard focus and inline validation were rechecked at 360 px. The earlier Phase 2 browser verification of blog filters/detail, contact validation, mocked success, and API error feedback remains applicable; those surfaces were not changed in this phase.

### Limitations and follow-up

- The API does not provide translated nutrition meal-plan content for each locale. That API-owned content remains unchanged.
- The blog remains local fallback content and contact submission remains unavailable until their respective API contracts exist; these Phase 2 limitations are unchanged.
- This task's new browser sweep covers public routes in both locales and authenticated dashboard responsiveness in the seeded-role E2E checks. Full visual review of themes, reduced motion, physical-device touch/safe-area behavior, and every mutation remains a separate manual review.
- The initial all-at-once E2E run encountered a transient API 429 in the inactive-member case and a cookie-banner interception in the member case. The banner test helper was made hydration-safe; the affected tests passed individually after restarting the local API.
