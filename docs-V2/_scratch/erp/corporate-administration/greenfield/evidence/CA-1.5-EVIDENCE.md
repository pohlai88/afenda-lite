# CA-1.5 - Evidence

## Result

`DONE` - company status lifecycle backend, Server Actions, focused UI, real
package journey, demo Neon lifecycle failure-injection/race coverage, current
production build and browser-authenticated Neon-backed Phase 1 journey are
implemented and verified. The accepted Playwright journey drives the production
app from draft registration through active status, reads back Neon state and
proves cross-tenant isolation.

## Current audit - 2026-07-28

| Command | Exit | Evidence |
|---|---:|---|
| `pnpm exec biome check packages/erp/corporate-administration/src/parse-input.ts packages/erp/corporate-administration/__tests__/parse-input.test.ts packages/erp/corporate-administration/__tests__/command-identity.test.ts apps/web/lib/erp/corporate-administration-command-options.ts e2e/journey/corporate-administration-phase-1.spec.ts apps/web/app/actions/legal-company-identity-actions.ts` | 0 | 6 touched package/app/E2E files checked; no fixes applied |
| `pnpm --filter @afenda/corporate-administration check` | 0 | 152 files checked; typecheck green; 46 files passed, 11 skipped; 242 tests passed, 34 skipped |
| `pnpm --filter @afenda/web typecheck` | 0 | web TypeScript gate green after CA production composition changes |
| `pnpm --filter @afenda/web build` | 0 | Next.js 16.2.10 production build compiled, typechecked and generated 48 static pages; Neon dynamic-route messages were non-fatal build-time warnings |
| `Remove-Item Env:DATABASE_URL; Remove-Item Env:PLAYWRIGHT_REUSE_SERVER; PLAYWRIGHT_PORT=3117; PLAYWRIGHT_BASE_URL=http://localhost:3117; pnpm exec playwright test e2e/journey/corporate-administration-phase-1.spec.ts --project=journey` | 0 | 1 browser-authenticated production journey passed in 54.9s; the journey seeds Master Data prerequisites, registers the draft, records jurisdiction, legal name, legal form, company identifier, financial year, registered activity and registered office, activates the company, reads back Neon status history, and verifies cross-tenant isolation |
| demo `DATABASE_URL`, `REQUIRE_DATABASE_TESTS=1`, `AFENDA_DATABASE_TEST_TARGET=demo` + `pnpm --filter @afenda/corporate-administration test` | 0 | 56 files passed; 272 tests passed |
| demo `NEON_CA_0_4_DEMO_DATABASE_URL` loaded as `DATABASE_URL`, `REQUIRE_DATABASE_TESTS=1`, `AFENDA_DATABASE_TEST_TARGET=demo` + `pnpm --filter @afenda/corporate-administration test -- __tests__/failure-injection/company-status-lifecycle-atomicity.test.ts` | 0 | 1 file passed; 2 tests passed; proves status activation outbox failure rolls back `ca_company_status_history`, leaves no completed receipt, keeps the company in `draft`, releases the idempotency reservation and then successfully retries the same activation with the same idempotency key; also proves simultaneous activation with the same expected company version yields one persisted `active` transition and one governed failure |
| `pnpm --filter @afenda/web test -- __tests__/corporate-administration/legal-company-lifecycle.journey.test.ts` | 0 | 1 file passed; 2 tests passed; focused authenticated lifecycle journey covers session stamping, persisted reload rendering, high-risk approval failure, unauthorized denial and accessible labels/status markup |
| `pnpm --filter @afenda/web test -- __tests__/corporate-administration/phase-1-real-package.journey.test.ts` | 0 | 1 file passed; 1 test passed; seeds jurisdiction, legal name, legal form, identifier, financial year, activity and registered address through real CA package commands with app-composed memory dependencies, reloads persisted aggregate state and activates through `activateLegalCompanyAction` |
| `pnpm --filter @afenda/web test -- __tests__/corporate-administration __tests__/corporate-administration-legal-company-actions.test.ts __tests__/corporate-administration-company-identity-actions.test.ts __tests__/corporate-administration-jurisdiction-profile-form.test.ts` | 0 | 20 files passed; 64 tests passed |
| `pnpm exec biome check apps/web/app/actions/legal-company-lifecycle-actions.ts apps/web/features/corporate-administration/legal-company-lifecycle-workspace.tsx apps/web/features/corporate-administration/corporate-administration-shell.tsx apps/web/features/corporate-administration/legal-company-workspace.tsx apps/web/__tests__/corporate-administration/legal-company-lifecycle-actions.test.ts apps/web/__tests__/corporate-administration/legal-company-lifecycle-workspace.test.ts` | 0 | 6 touched CA web files checked; no fixes applied |
| `pnpm exec biome check apps/web/__tests__/corporate-administration/phase-1-real-package.journey.test.ts packages/erp/corporate-administration/src/adapters/memory/company.ts` | 0 | real-package journey test and memory adapter checked; no fixes applied |
| `pnpm exec biome check apps/web/__tests__/corporate-administration/legal-company-lifecycle.journey.test.ts` | 0 | new lifecycle journey test checked; no fixes applied |
| `pnpm --filter @afenda/web lint` | 0 | 645 files checked; no fixes applied |
| `pnpm --filter @afenda/web typecheck` | 0 | web TypeScript gate green |
| `pnpm --filter @afenda/web build` | 0 | Next.js 16.2.10 production build compiled, typechecked and generated 48 static pages; Neon dynamic-route messages were non-fatal build-time warnings |
| `pnpm --filter @afenda/events lint` | 0 | 40 files checked; no fixes applied after exposing the existing HR headcount event constants from the root barrels |
| `pnpm --filter @afenda/events typecheck` | 0 | events package compiled |
| `pnpm --filter @afenda/events test` | 0 | 8 files passed; 49 tests passed |
| `pnpm --filter @afenda/human-resources typecheck` | 0 | HR package compiled after the event barrel mismatch was cleared |
| `node packages/data-plane/db/scripts/apply-migrations.mjs 0028_ca_company_status_lifecycle` against demo `DATABASE_URL` | 0 | applied 6 statements and recorded `0028_ca_company_status_lifecycle` in `drizzle.__drizzle_migrations` |
| `pnpm --filter @afenda/db db:migration-status` against demo `DATABASE_URL` | 0 | 29 journal entries, 6 DB ledger rows, applied through `0028_ca_company_status_lifecycle`, 24 pending forward migrations remain outside this CA backend lane |
| `pnpm --filter @afenda/db lint` | 0 | 93 files checked; no fixes applied |
| `pnpm --filter @afenda/db typecheck` | 0 | DB package compiled |
| `git diff --check` | 0 | no whitespace errors |

## Delivered backend surface

- Table and migration: `ca_company_status_history` plus widened
  `ca_legal_company.state` constraint for `draft`, `active`, `suspended`,
  `struck_off`, `in_liquidation`, `dissolved`, `restored` and `archived`.
- Commands: `activateLegalCompany`, `suspendLegalCompany`,
  `markCompanyStruckOff`, `enterLiquidation`, `dissolveLegalCompany`,
  `restoreLegalCompany`, `archiveLegalCompany`.
- Queries: `findCompanyStatusAsOf`, `listCompaniesByStatus`,
  `getCompanyCompletenessForActivation`.
- Events:
  `corporate_administration.legal_company.activated.v1`,
  `suspended.v1`, `struck_off_marked.v1`, `liquidation_entered.v1`,
  `dissolved.v1`, `restored.v1`, `archived.v1`.
- Store/adapters: memory and Drizzle status history persistence, as-of status
  lookup, status listing and timeline entries.
- Rules: explicit legal-company transition matrix and high-risk approval
  detection.
- Activation guard: checks jurisdiction profile, English legal name, legal form,
  company registration identifier, financial year, registered activity and
  company registered office.

## Delivered app surface

- Server Actions:
  `activateLegalCompanyAction`, `suspendLegalCompanyAction`,
  `markCompanyStruckOffAction`, `enterLiquidationAction`,
  `dissolveLegalCompanyAction`, `restoreLegalCompanyAction`,
  `archiveLegalCompanyAction`.
- Action boundary: Zod validation rejects browser-controlled tenant fields,
  stamps organization/actor/correlation/idempotency from the authenticated
  session, maps package `Result` to `ActionResult`, and revalidates CA routes
  only after successful package writes.
- UI: `LegalCompanyLifecycleWorkspace` renders activation completeness,
  current status/version and status-relevant transition forms from the package
  matrix.
- Shell composition: `CorporateAdministrationShell` now loads
  `getCompanyCompletenessForActivation` through Model B dependencies and passes
  the result to the lifecycle workspace.
- Focused tests: lifecycle action coverage for tenant rejection, session
  stamping, dependency passing, route revalidation and high-risk approval
  coordinates; lifecycle UI coverage for readiness, disabled activation and
  transition matrix rendering.
- Focused journey/accessibility test:
  `legal-company-lifecycle.journey.test.ts` covers authenticated activation,
  persisted status reload rendering, high-risk approval failure, unauthorized
  denial before package mutation, hidden tenant protection, labelled controls,
  status feedback and readiness table labelling.
- Real-package app-composition journey:
  `phase-1-real-package.journey.test.ts` seeds the complete Phase 1 company
  through real package commands using app-composed memory dependencies, reloads
  persisted aggregate state after each mutation, renders the activation-ready
  UI, activates through `activateLegalCompanyAction` and verifies the reloaded
  active-state markup.
- Demo Neon lifecycle failure-injection:
  `company-status-lifecycle-atomicity.test.ts` seeds a complete Phase 1 company
  through Drizzle-backed package commands, injects an activation outbox failure,
  proves status history and completed receipts roll back while the company
  remains `draft`, then retries the same activation idempotency key to persist
  the `active` status.
- Demo Neon lifecycle race:
  the same focused test starts two simultaneous activation commands with the
  same expected company version and distinct idempotency keys, proving the
  Drizzle status transaction persists exactly one status-history row and leaves
  the aggregate at `active` with one version bump.
- Browser Playwright journey scaffold:
  `e2e/journey/corporate-administration-phase-1.spec.ts` is implemented as a
  browser-only authenticated journey that seeds Master Data prerequisites,
  drives the Corporate Administration UI through Phase 1 activation, reads back
  Neon state and checks cross-tenant isolation.
- Production composition fixes:
  `createCorporateAdministrationCompanyDependencies` now resolves CA
  language/country/currency and party address reference reads through CA-owned
  read ports over `@afenda/db`, avoiding synthetic Master Data actors at the CA
  command boundary.
- Canonical input fix:
  `parseCorporateAdministrationInput` omits parsed `undefined` object fields
  before command fingerprinting while preserving strict canonical JSON rejection
  for unsupported values.

## Remaining gap

No CA-1.5 acceptance gap remains in this evidence file. Phase 2 can start from
the Phase 1 `DONE` state recorded in `03-ROADMAP-INDEX.md`.
