# PROJECT RULES

## Project
Full-stack gym platform (working name "IronPulse", renameable from one config constant). Members renew membership online (payment is MOCKED), generate AI nutrition plans, and learn exercises via an animated machine/exercise library. A public guest mode shows rules, prices, trainers, sponsors, opening hours and a free-trial request form.

## Stack (do not deviate)
- pnpm workspaces monorepo: `apps/web` (Next.js App Router, TypeScript), `apps/api` (NestJS, TypeScript), `packages/shared` (zod schemas, enums, shared types).
- SQLite + Prisma for local development (migrations + seed script).
- Tailwind CSS + shadcn/ui. Animations: GSAP + ScrollTrigger + Lenis. i18n: next-intl (mk default, en).
- Auth: short-lived JWT access token + rotating refresh token (hashed in DB), both in httpOnly, Secure, SameSite cookies.
- Validation: zod from `packages/shared`, used on both sides.
- Tests: Vitest (web, shared), Jest (api), a few Playwright smoke tests later.
- Swagger/OpenAPI at `/api/docs`.

## Roles (one role per account)
MEMBER, TRAINER, ADMIN, SPONSOR. Enforce RBAC on the backend with guards + decorators and mirror it in Next middleware. Never trust the client.

## Role capabilities (for later phases)
- MEMBER: request/renew membership, workout logging with progress charts, AI nutrition plan, browse machines/exercises, request appointments with a trainer, see sponsor offers.
- TRAINER: manage assigned clients, schedule/confirm appointments, view client progress and nutrition plans, edit/approve nutrition plans.
- ADMIN: manage users, trainers, sponsors, membership plans and prices, confirm mock payments, manage machines/exercises/rules/settings, statistics, audit log.
- SPONSOR: own profile, logo, link, offers, view impressions/clicks.

## Coding rules
- Strict TypeScript, no `any`. ESLint + Prettier.
- Backend: modular NestJS, one module per domain (auth, users, memberships, machines, exercises, workouts, nutrition, trainers, appointments, sponsors, content, admin). Controller -> Service -> Prisma. zod validation pipe. Consistent error format.
- Frontend: feature-based folders, server components by default, client components only for animations/forms/interactivity. Reusable UI in `components/ui`.
- All user-facing strings go through i18n (mk + en). No hardcoded text.
- Env vars validated with zod. Provide `.env.example` for each app. Never commit secrets.

## Security (mandatory)
Argon2 password hashing, helmet, CORS allow-list, rate limiting (stricter on auth routes), CSRF protection for cookie auth, validation everywhere, Prisma only (no raw SQL), audit log for admin actions, never log passwords/tokens/PII.
GDPR: cookie consent banner, privacy policy page, data export and account deletion endpoints.

## Payments
Real payment is OUT OF SCOPE. Use a `PaymentProvider` interface with `MockPaymentProvider`: member requests a membership -> PENDING -> Admin confirms -> ACTIVE.

## Membership plans (MKD, seeded, admin-editable)
1 month = 2000, 3 months = 5500, 6 months = 10000, 12 months = 16000.

## AI nutrition
Questionnaire -> backend computes BMR/TDEE/macros (Mifflin-St Jeor) -> LLM generates a weekly meal plan as JSON validated against a zod schema (retry once if invalid) -> stored in DB. LLM behind an `AiProvider` interface (Anthropic by default, key from env). If no key is set, use a deterministic fallback generator so the app always works. Respect allergies, vegetarian/vegan, halal. Always show a "not medical advice" disclaimer.

## Design & animation
Modern, elegant, dark-first theme with one electric accent color (electric lime), large typography, generous spacing, light/dark toggle. Scroll animations where sensible, ALWAYS respecting `prefers-reduced-motion` with static fallbacks.
- Photography-led, story-driven design in the style of modern premium gyms. Scroll animations enhance photos and content. The rolling weight plate is used ONLY in the rules section.
- Rules section: a weight plate rolls horizontally as the user scrolls; each rule reveals as the plate passes it.
- Clean up all ScrollTriggers on unmount. Animate transforms/opacity only.

## Quality
WCAG 2.1 AA, semantic HTML, keyboard navigation, mobile-first, SEO metadata + sitemap + OG tags. Every phase ends with: app builds, lint passes, tests pass, README updated, PROGRESS.md updated.

## Working style
Small steps. Explain what you created and what remains. Do not invent features beyond the current phase. If a command fails, read the error, fix it, and retry before moving on.

# PHASE 1 GOAL
Create a runnable, production-quality skeleton: monorepo, database schema, authentication with RBAC, i18n, design tokens, local SQLite database, seed data. No feature pages beyond what is listed.

## 1. Monorepo
pnpm workspace with apps/web, apps/api, packages/shared. Root scripts: dev, build, lint, test, db:migrate, db:seed, db:studio. ESLint, Prettier, .editorconfig.

## 2. Infrastructure
- Local SQLite database and development email files; apps run locally via pnpm.
- `.env.example` for root, web and api, validated with zod at startup.

## 3. Prisma schema (apps/api/prisma/schema.prisma)
Proper relations, indexes, enums, timestamps, soft-delete where sensible:
- User (email unique, passwordHash, role enum, emailVerifiedAt, locale, status), Profile (name, phone, birthDate, gender, heightCm, weightKg, avatarUrl)
- RefreshToken (hashed, expiresAt, revokedAt, userAgent, ip), EmailVerificationToken, PasswordResetToken
- MembershipPlan (name, durationMonths, priceMkd, isActive), Membership (user, plan, startsAt, endsAt, status PENDING|ACTIVE|EXPIRED|CANCELLED), PaymentRecord (membership, amountMkd, provider "mock", status, confirmedByAdminId)
- TrainerProfile (bio, specialties, photoUrl), TrainerClient (trainer, member, status), Appointment (trainer, member, startsAt, endsAt, status REQUESTED|CONFIRMED|CANCELLED|COMPLETED, notes)
- Machine (slug, nameMk, nameEn, category enum LEGS|CHEST|BACK|SHOULDERS|ARMS|CORE|CARDIO, descriptionMk/En, difficulty, animationKey, imageUrl, isPublic), MachineMuscle (muscle group, primary/secondary), Exercise (machine, nameMk/En, steps json mk/en, commonMistakes json, safetyTips json, recommendedSets, recommendedReps, youtubeVideoId, level)
- WorkoutLog (member, exercise, performedAt), WorkoutSet (log, setNumber, reps, weightKg)
- NutritionQuestionnaire (member, answers json, computed bmr/tdee/targetCalories/macros), NutritionPlan (member, questionnaire, planJson, source AI|FALLBACK|TRAINER, status DRAFT|APPROVED, approvedByTrainerId)
- Sponsor (user, companyName, logoUrl, websiteUrl, tier, isActive), SponsorOffer (sponsor, title, description, discountCode, validUntil), SponsorStat (impressions, clicks)
- GymRule (orderIndex, titleMk/En, bodyMk/En, icon), GymSetting (key/value: opening hours, address, phone, email), TrialRequest (name, email, phone, preferredDate, status)
- AuditLog (actor, action, entity, entityId, metadata, createdAt)

## 4. Seed (apps/api/prisma/seed.ts)
- 1 admin, 2 trainers, 5 members, 2 sponsors (dev credentials documented in README).
- 4 membership plans with the prices above.
- 12 machines across all categories with mk + en content, 1-2 exercises each (well-known YouTube video IDs as placeholders marked TODO-replace).
- 10 gym rules (mk + en), gym settings, a few sponsor offers.

## 5. Auth module (apps/api/src/auth)
Endpoints: register (MEMBER by default), login, refresh (rotation + reuse detection), logout, verify-email, resend-verification, forgot-password, reset-password, me.
- Argon2, httpOnly cookies, rate limiting, helmet, CORS allow-list, CSRF protection, zod pipe.
- JwtAuthGuard, RolesGuard, @Roles(), @CurrentUser().
- Admin-only endpoint to create TRAINER/SPONSOR accounts.
- MailService with local HTML-file delivery in development and SMTP transport when configured outside development.
- Swagger docs, unit tests for the auth service, e2e test: register -> verify -> login -> refresh -> logout.

## 6. Cross-cutting API
Global exception filter with consistent error shape, request logging without PII, health endpoint, config module, PrismaService, pagination helper, AuditLog service.

## 7. Web foundation (apps/web)
- next-intl (mk default, en), locale switcher, starter message files.
- Tailwind tokens: dark-first, electric lime accent, type scale, radii, spacing; light/dark toggle.
- shadcn/ui: Button, Input, Card, Dialog, Toast, Tabs, DropdownMenu.
- App shell: responsive navbar (guest vs logged-in), footer, cookie consent banner, 404 and error pages.
- Lenis provider + reusable `useGsap` client hook (cleanup + prefers-reduced-motion). Do NOT build hero or rules animation yet.
- Typed API client using shared zod schemas, auth context, Next middleware protecting /member, /trainer, /admin, /sponsor by role.
- Simple pages: /, /login, /register, /verify-email, /forgot-password, /reset-password, and empty role dashboards at /member, /trainer, /admin, /sponsor showing the user's name and role.

## 8. Docs
README (architecture, setup, env vars, folder structure, seeded credentials, how to run tests) and docs/erd.md with a Mermaid ERD.

# DEFINITION OF DONE
`pnpm install && pnpm db:migrate && pnpm db:seed && pnpm dev` starts both apps; I can register, follow the verification link printed by the API or open its saved HTML message, log in and see my role dashboard; lint, typecheck and tests pass.

Work step by step: after each numbered section run build/lint/tests, fix problems, tick PROGRESS.md, then continue. At the end, summarize what was created and anything unfinished.

Before starting any new phase, run `pnpm backup` and confirm it succeeded.
