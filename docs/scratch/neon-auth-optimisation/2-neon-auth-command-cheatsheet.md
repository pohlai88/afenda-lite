You MUST use `/using-afenda-elite-skills` to execute this mission.

# AFENDA NEON ERP — NO-MVP PROGRAM CONTROLLER

## Mission

Execute the Afenda Neon ERP development program as 18 controlled production-quality slices.

This is a NO-MVP program.

Never reduce:

- security;
- tenancy;
- authorization;
- data integrity;
- auditability;
- accessibility;
- testing;
- recovery;
- operational readiness;
- documentation evidence.

Scope may be narrowed only by executing fewer approved slices at one time. Quality may never be narrowed.

## Program slices

### Wave 0 — Neon and database foundation

- N1 — Neon environment contract
- N2 — Connection and migration discipline
- N3 — Backup and recovery
- N4 — Database performance baseline

### Wave 1 — Identity and session foundation

- N5 — Auth BFF and browser client
- N6 — Session contract
- N7 — Post-login routing
- N8 — Organization membership

### Wave 2 — Tenancy, authorization and evidence

- N9 — Hard tenancy enforcement
- N10 — Permission kernel
- N11 — Product authorization wiring
- N12 — Audit and security evidence

### Wave 3 — Verification and operations

- N13 — Authenticated E2E factory
- N14 — Security and failure verification
- N15 — Production operations

### Wave 4 — ERP product verticals

- N16 — Shared ERP platform shell
- N17 — Declarations vertical
- N18 — FFT permitted vertical

## Authority order

Before changing code, load and respect the latest applicable authorities:

1. `AGENTS.md`
2. DOC-001 documentation-control authority
3. `docs/architecture/ARCH-023-multi-tenancy.md`
4. `docs/architecture/ARCH-026-auth-session.md`
5. `docs/guides/GUIDE-018-fullstack-e2e-integration-program.md`
6. Applicable ADRs, runbooks and package-boundary documents
7. Current slice instruction
8. Existing implementation and tests
9. Vendor guidance

On conflict, higher authority wins.

Do not silently reinterpret a closed decision.

## Neon boundaries

Keep these decisions unless an explicit approved architecture mission changes them:

- Neon Serverless Postgres is the database platform.
- Product connections use the pooled `-pooler` endpoint where required.
- Product data access uses Drizzle and `@afenda/db`.
- Neon Data API is not a product data path.
- Neon Auth is wrapped through `@afenda/auth`.
- Neon organization roles are identity inputs, not full product authorization.
- Product authorization uses Afenda permission codes and policy evaluation.
- Tenant-owned data is hard-scoped by `organization_id`.
- Do not claim multi-database or project-per-tenant isolation.
- Do not enable Neon preview services merely because they exist.
- Neon Auth mail = Zoho SMTP via Neon Auth console (ARCH-026). Do not add app-side SMTP; do not revert to Neon shared without Docs reopen.
- Do not switch production branches casually.
- Secrets remain outside source control.

## Slice execution rule

Execute exactly one slice per mission.

Do not:

- implement a later slice early;
- combine adjacent slices for convenience;
- reopen frozen FFT phases;
- introduce preview Neon services;
- add speculative abstractions;
- create placeholder production behavior;
- add disabled or fake controls;
- create silent fallbacks;
- declare completion without evidence.

Adjacent work may be reported as a dependency or finding but must remain unimplemented unless strictly necessary for the current slice acceptance criteria.

## Mandatory preflight

Before writing code:

1. Identify the requested slice.
2. Read its authorities and existing implementation.
3. Inspect relevant packages, applications, tests, migrations and documentation.
4. Compare planned architecture against actual disk state.
5. Identify:
   - already complete work;
   - partial work;
   - missing work;
   - conflicting implementation;
   - obsolete implementation;
   - blocked dependencies.

6. Produce a bounded implementation plan.
7. State all files expected to change.
8. State all public contracts that may change.
9. State the verification commands that will prove completion.

Do not mutate code until the preflight is complete.

## Implementation method

For the active slice:

1. Preserve existing valid implementation.
2. Repair incorrect or incomplete implementation.
3. Close gaps between architecture and code.
4. Keep code DRY and KISS without lowering enterprise quality.
5. Prefer existing packages and governed components.
6. Do not duplicate logic across applications or packages.
7. Keep server, client and RSC boundaries explicit.
8. Fail closed for authentication, authorization and tenancy.
9. Never return silent `null`, empty success or permissive fallback where the contract requires a decision.
10. Use typed errors or explicit redirects for expected failure states.
11. Add or update tests with the implementation.
12. Update controlled documentation only when the active mission authorizes it.
13. Do not convert scratch reports into authority automatically.

## Database change policy

For every schema or migration change:

- inspect existing migrations and live schema assumptions;
- create an additive migration where possible;
- define forward and rollback consequences;
- preserve tenant scoping;
- verify indexes and constraints;
- avoid destructive migration without explicit authorization;
- test migration against the approved development environment;
- ensure generated artifacts are committed where repository policy requires;
- never modify production data manually as a substitute for a migration.

## Authentication and authorization policy

- Authentication answers who the user is.
- Membership identifies organization association.
- Role is a coarse identity signal.
- Permission policy determines allowed product behavior.
- Tenancy determines which records may be accessed.

Do not merge these concepts.

Every protected operation must prove:

1. valid session;
2. active organization membership;
3. required permission;
4. tenant-scoped data access;
5. auditable outcome where applicable.

## UI and frontend policy

When visible UI is touched:

- invoke `afenda-elite-ui-compose`;
- use `@afenda/ui-system`;
- follow AUTHORITY → CONSISTENCY → CORRECT-COMPONENT → SUITABILITY → SCALABILITY → STABILITY;
- do not create feature-local substitutes for missing reusable UI capability;
- issue a `UI-CAP-*` finding where the shared component is insufficient;
- do not invent product actions for missing backend ports.

## Verification policy

Use proportional tests, but no slice may close without:

- lint;
- type checking;
- relevant unit tests;
- relevant integration tests;
- relevant security and tenancy tests;
- consuming application verification;
- migration verification when applicable;
- browser verification when user journeys change;
- production build when package, RSC, global CSS, routing or structural behavior changes.

Prefer repository commands over ad hoc checks.

Do not treat greps, code inspection or compilation alone as full evidence.

## Required final output for every slice

Return:

### 1. Slice verdict

- COMPLETE
- PARTIAL
- BLOCKED
- NOT STARTED

### 2. Architecture-to-code gap matrix

| Requirement | Before | Implementation | Evidence | Status |
| ----------- | ------ | -------------- | -------- | ------ |

### 3. Files changed

Group by:

- application;
- package;
- migration;
- tests;
- documentation;
- operations.

### 4. Public contracts changed

Include:

- exports;
- types;
- environment variables;
- routes;
- APIs;
- database schema;
- permission codes;
- events.

### 5. Verification evidence

Show every command and actual result.

### 6. Security and tenancy evidence

State how the slice preserves:

- authentication;
- membership;
- authorization;
- tenancy;
- auditability.

### 7. Findings not implemented

List later-slice or separately owned findings without implementing them.

### 8. Residual risks

No “none” unless supported by evidence.

### 9. Completion percentage

Report:

- planned requirements;
- implemented requirements;
- verified requirements;
- percentage based on verified requirements only.

### 10. Next authorized slice

Name only the immediate next slice.

Do not start it.

## Stop condition

Stop after the active slice is implemented and verified.

Do not continue into the next slice automatically.
