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

The checked-in JWT secret is for local development only. `WEB_URL` sets the origin used in verification and password-reset links. The SQLite URL in the API example creates `apps/api/prisma/dev.db`; no external database is required. SMTP and the Anthropic key can remain blank for local development.

Then initialize and run the apps:

```powershell
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The web app is at <http://localhost:3000>, the API at <http://localhost:4000>, and the OpenAPI/Swagger UI at <http://localhost:4000/api/docs>. The API health check is <http://localhost:4000/health>.

`pnpm db:migrate` generates the Prisma client before applying migrations, so a fresh install does not depend on a previously generated client. `pnpm dev` builds the shared package before starting both apps. Other useful checks are `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

## Seeded development accounts

All seeded accounts are verified and share the local-only password `password123`:

| Role | Email |
| --- | --- |
| Admin | `admin@ironpulse.local` |
| Trainer | `trainer1@ironpulse.local`, `trainer2@ironpulse.local` |
| Member | `member1@ironpulse.local` through `member5@ironpulse.local` |
| Sponsor | `sponsor1@ironpulse.local`, `sponsor2@ironpulse.local` |

Do not use this password or these accounts outside a local development database.

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
- Privacy and service status: `GET /me/export`, `DELETE /me`, and `GET /health`.

Follow the Swagger operation details for HTTP methods, request schemas, pagination, roles, and response shapes rather than inferring them from route names. Auth is cookie-based: send requests with credentials enabled, obtain the double-submit CSRF token from `GET /auth/csrf`, and include its value in the `x-csrf-token` header on state-changing requests. The API origin must be in `CORS_ORIGINS`.

## Conventions

- **Localization:** use next-intl message catalogs in `apps/web/messages/mk.json` and `apps/web/messages/en.json`; Macedonian (`mk`) is the default. Keep user-facing copy localized.
- **Validation and types:** define request/response validation with Zod in `packages/shared` where it is shared; reuse those schemas in the API and web client. Keep TypeScript strict and avoid `any`.
- **Design tokens:** use the Tailwind theme and CSS custom properties. The current brand accent is electric lime (`#b7ff39`) with a dark-first palette; extend the shared tokens rather than introducing unrelated colors or ad hoc styling.
- **Animation:** use photography-led, story-driven design in the style of modern premium gyms. Scroll animations enhance photos and content; the rolling weight plate is used only in the rules section. Animate transforms and opacity only, clean up animation/scroll triggers on unmount and route changes, and provide static fallbacks when `prefers-reduced-motion` is enabled.
- **Security and API boundaries:** trust backend guards for authorization; frontend route protection is only a UX mirror. Never log passwords, tokens, or PII. Do not introduce real payment processing; use the mock provider.

## Current state and remaining work

The latest entries in `PROGRESS.md` mark the Phase 1 foundation and Phase 2A/2B API modules as done. The current implementation includes auth and role dashboards; localized web messages; seeded gym content; membership/mock-payment lifecycle; machines/exercises; workouts; nutrition plans; trainers/appointments; sponsors; admin operations; and GDPR export/deletion endpoints.

Known limitations recorded in `PROGRESS.md`:

- Replace the seeded machine exercise video IDs marked `TODO-replace` before publishing that content.
- The scheduled daily membership-expiry query is covered by tests, but the scheduler was not observed firing at midnight.
- Live Anthropic requests, production SMTP, production database deployment, and production TLS/cookie behavior have not been exercised. Without an Anthropic key, the fallback nutrition provider is used.
- The hero and rules motion should follow the current photography-led design direction; use `PROGRESS.md` for the Phase 3 verification status.
- Local email output under `apps/api/.dev-mails/` and `/dev/last-email` are development-only.

Use `PROGRESS.md` for the detailed verification history and additional environment/testing notes.

## Fresh-clone verification and local-file dependencies

The setup flow was exercised from a clean temporary copy with `node_modules`, generated build output, local databases, local mail, and actual `.env` files omitted. After copying the three `.env.example` files, `pnpm install --frozen-lockfile`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm build`, and `pnpm test` all passed. The clean-copy API health endpoint, web home page, and Swagger UI also returned HTTP 200 when started on alternate local ports. `db:migrate` generates the Prisma client, removing the hidden dependency on a client generated in a developer's existing workspace.

This workspace currently has no `.git` metadata or configured remote, so a literal `git clone` and a Git-tracked-file audit could not be run here. The clean-copy setup simulation succeeded, but it cannot prove which files will be tracked when this project is published. Before handoff, confirm that the GitHub repository includes `pnpm-lock.yaml`, all migrations, all three `.env.example` files, and the seed.

The backup script writes to `../ironpulse-backups/`, which is outside the repository root and cannot be matched by this repository's `.gitignore`. No backup files need to be committed.
