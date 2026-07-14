# ARCH-031 Technology Stack Catalogue

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ARCH-031     |
| **Category**      | Architecture |
| **Version**       | 1.3.14       |
| **Status**        | Living       |
| **Control State** | Closed       |
| **Owner**         | Platform     |
| **Updated**       | 2026-07-15   |

---

# 1. Purpose

Provide one status-aware discovery catalogue for the Afenda-Lite technology stack without taking authority away from the architecture, API, module, and runbook documents that own individual decisions.

**Audience:** engineers, architects, release operators, and agents planning or reviewing Afenda-Lite changes.

**Action enabled:** identify whether a technology is current, approved Target, conditional, manifest-only, retired, rejected, or not verifiable in this checkout before using it in implementation plans.

---

# 2. Scope

## 2.1 In Scope

- Runtime, application framework, workspace, build, UI, data, authentication, API-contract, testing, quality, hosting, operations, and module-support technologies.
- Lifecycle posture derived from controlled documentation.
- Implementation evidence derived from repository manifests, configuration, scripts, generated artifacts, and source-tree presence.
- Decision guardrails that prevent rejected or retired choices from returning as recommendations.

## 2.2 Out of Scope

- Replacing the owning decisions in ARCH, API, REST, OPEN, Module, or Runbook documents.
- Treating an installed dependency as approved architecture without documentary authority.
- Selecting unrelated new vendors or expanding Feed Farm Trade phases.
- Claiming runtime behavior when the relevant product or test source is absent from this checkout.
- Publishing dependency versions as a substitute for lockfiles or package manifests.

---

# 3. Technology Stack Catalogue

## 3.1 Reading model

### Lifecycle posture

| Posture | Meaning |
| ------- | ------- |
| **Current / Living** | Binding current architecture or operations. |
| **Target** | Approved future state; authoritative for forward writing but not necessarily on disk. |
| **Conditional / Draft** | Optional, program-gated, contract-only, or awaiting promotion. |
| **Manifest-only** | Present in dependency metadata but not independently adopted by a controlled decision. |
| **Retired / Rejected** | Must not be restored or recommended without an explicit superseding decision. |

### Implementation evidence

| Evidence | Meaning |
| -------- | ------- |
| **Source verified** | Relevant source, script, or generated artifact was directly inspected in this checkout. |
| **Configured** | A manifest or configuration file actively configures the technology; full runtime behavior may still be unavailable. |
| **Manifest only** | Dependency declaration exists, but product use is not proven. |
| **Documented Target** | Controlled Target documentation selects the technology; implementation is not required to exist yet. |
| **Not verifiable in this checkout** | The controlled docs reference product or test paths that are absent on disk. |

A row may combine evidence values. Repository evidence never overrides the lifecycle or decision authority of controlled documentation.

## 3.2 Source ledger

The full documentation-integrity baseline inspected **97/97 primary files**: 93 Markdown documents and four artifacts, plus 12 referenced dependencies. Coverage was complete with no parser or dependency failures. The baseline contained 52 pre-existing findings: six High and 46 Medium (24 broken references, one structure drift, and 27 version drifts). The registered archived-guide baseline accounts for 29 of those findings and remains out of scope.

| Evidence group | Inspected evidence | Result |
| -------------- | ------------------ | ------ |
| Governed documentation | Entire `docs/` validator scope | Primary evidence for Living/Target decisions |
| Runtime and dependency manifests | [`package.json`](../../package.json), [`pnpm-lock.yaml`](../../pnpm-lock.yaml), [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) | Dependency declarations present; most Collapse-era script bodies are **absent** and gate via [`collapse-script-unavailable.mjs`](../../scripts/collapse-script-unavailable.mjs) |
| Framework configuration | [`apps/web/next.config.ts`](../../apps/web/next.config.ts), [`apps/web/tsconfig.json`](../../apps/web/tsconfig.json), [`apps/web/postcss.config.mjs`](../../apps/web/postcss.config.mjs) | Target Next shell (S7.1) — React Compiler, transpilePackages, Tailwind PostCSS |
| UI tooling | `packages/ui/components.json` | Target `@afenda/ui` (S5.1 / Checkpoint E); root Collapse `components.json` remains absent |
| Hosting and CI | [`apps/web/vercel.json`](../../apps/web/vercel.json), [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) | Vercel `sin1`; Project Root Directory **`apps/web`** + `sourceFilesOutsideRootDirectory=true` (verified 2026-07-15); install `cd ../.. && pnpm install --frozen-lockfile`; GitHub Actions Node 24 · `turbo run lint typecheck test` + `TURBO_TOKEN`/`TURBO_TEAM` remote cache (S8.1) |
| Quality and testing | [`biome.jsonc`](../../biome.jsonc), [`testing/vitest.config.ts`](../../testing/vitest.config.ts), [`playwright.config.ts`](../../playwright.config.ts) | Biome + Ultracite + Vitest wired through turbo; Playwright optional (`test:e2e`) |
| Contract / docs gates | [`OPEN-001-openapi.yaml`](../api/OPEN-001-openapi.yaml), [`generate-openapi.mts`](../../scripts/generate-openapi.mts), docs integrity scripts | Runnable on this docs-first checkout |
| Product source presence | Collapse `app/`/`modules/`/`features/`/`components-V2/` | **Absent by design**; do not recover — [ARCH-028](ARCH-028-implementation-slices.md) |
| Target packages (through S8.2 + G) | `apps/web` route groups + modules domain ports + `apps/web/features/{auth,declarations,fft,org-admin}` + Next shell, `packages/{config,db,auth,env,ui,emails}`, [`turbo.json`](../../turbo.json), CI/deploy | **Present** after ARCH-028 S1.1–S8.2 + Checkpoints A–G; next program = GUIDE-018 **I1** |

Validator exclusions: external HTTP availability and code-to-document runtime drift. **Package script names are not evidence** that Collapse-era tooling still runs.

## 3.3 Runtime, application, workspace, and build

| Capability | Technology / choice | Lifecycle posture | Implementation evidence | Owning authority | Constraint / migration note |
| ---------- | ------------------- | ----------------- | ----------------------- | ---------------- | --------------------------- |
| Server runtime | Node.js 24; Edge by documented exception only | Current / Living | Configured — [`package.json`](../../package.json), [CI](../../.github/workflows/ci.yml) | [API-001](../api/API-001-api-boundaries.md), [ARCH-016](ARCH-016-next-js-conventions.md) | DB-backed routes, actions, and pages default to Node. |
| Application framework | Next.js 16 App Router | Current / Living | Configured — [`apps/web/package.json`](../../apps/web/package.json), [`apps/web/next.config.ts`](../../apps/web/next.config.ts); route groups `(public)` / `(operator)` / `(client)` verified (S7.2) | [ARCH-002](ARCH-002-frontend-architecture.md), [ARCH-016](ARCH-016-next-js-conventions.md) | One modular-monolith deployable; thin routes. |
| Rendering and adapters | React Server Components, Server Actions, Route Handlers | Current / Living | RSC layouts/pages under `apps/web/app/(public|operator|client)`; Actions/RH still open | [ARCH-013](ARCH-013-bff-and-data-flow.md), [API-001](../api/API-001-api-boundaries.md) | RSC reads domain directly; HTTP is reserved for named cases. |
| Language and UI runtime | TypeScript 5, React 19 | Target pin with matching manifest | Configured — [`apps/web/package.json`](../../apps/web/package.json), [`apps/web/tsconfig.json`](../../apps/web/tsconfig.json) | [ARCH-022](ARCH-022-system-overview.md) | Strict TypeScript; versions remain manifest-owned. |
| React optimization | React Compiler | Target-preferred and currently configured | Configured — [`apps/web/next.config.ts`](../../apps/web/next.config.ts) (`reactCompiler: true`) | [ARCH-028](ARCH-028-implementation-slices.md) | Preserve on the Target app. |
| Docs-first package workflow | pnpm (`pnpm-lock.yaml`), Corepack-pinned `packageManager`, `pnpm install --frozen-lockfile` | Current / Living | Configured — [`package.json`](../../package.json), [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml), [CI](../../.github/workflows/ci.yml) | [ARCH-028](ARCH-028-implementation-slices.md) | npm/yarn lockfiles gitignored; workspace members grow slice-serially under ARCH-028. |
| Target workspace | Turborepo with pnpm workspaces and remote caching | Target (S1.1 shipped) | [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) + [`turbo.json`](../../turbo.json) present; members through `@afenda/emails` | [ARCH-022](ARCH-022-system-overview.md), [ARCH-024](ARCH-024-package-boundaries.md) | Sole package manager is pnpm. |
| Target package surface | Private `@afenda/{config,db,auth,env,ui,emails}` | Target (partial) | Present: packages + route groups + modules domain ports + feature shells (S7.4 / Checkpoint F) + Target CI/deploy (S8.1–S8.2) | [ARCH-022](ARCH-022-system-overview.md), [ARCH-024](ARCH-024-package-boundaries.md) | `apps/web` remains the sole deployable. |

## 3.4 UI and design system

| Capability | Technology / choice | Lifecycle posture | Implementation evidence | Owning authority | Constraint / migration note |
| ---------- | ------------------- | ----------------- | ----------------------- | ---------------- | --------------------------- |
| Styling | Tailwind CSS 4 and CSS-variable tokens | Current configuration and Target | Configured — [`apps/web/postcss.config.mjs`](../../apps/web/postcss.config.mjs), [`apps/web/styles/globals.css`](../../apps/web/styles/globals.css) → `@afenda/ui/globals.css` | [ARCH-022](ARCH-022-system-overview.md), [ARCH-024](ARCH-024-package-boundaries.md) | Design tokens live in `@afenda/ui`; app entry imports the package. |
| Component foundation | shadcn **base-vega** | Living `@afenda/ui` (S5.1 shipped) | [`packages/ui`](../../packages/ui) — Button + `globals.css` + `components.json`; DNA promoted from user-approved local `_reference/archive/shadcn-pro-dashboard` (never Collapse git recover; never product `import` from `_reference`) | [ARCH-022](ARCH-022-system-overview.md), [ARCH-024](ARCH-024-package-boundaries.md), [ARCH-018](ARCH-018-admincn-customization.md) | Do not recreate root Collapse-alias `components.json`. |
| Operator shell | AdminCN / `AdminCnShell` with Shadcn Studio DNA | Current / Living | Configured tooling; product source not verifiable | [ARCH-015](ARCH-015-admincn-alignment.md), [ARCH-018](ARCH-018-admincn-customization.md) | Shared shell only; auth remains a separate Neon Auth island. |
| Theme and data-table DNA | `next-themes`, TanStack Table | Current / Living UI DNA | Manifest only; source not verifiable | [ARCH-015](ARCH-015-admincn-alignment.md) | One root theme owner; TanStack is a pattern dependency, not an IAM store. |
| Supporting UI libraries | Base UI, Lucide, Geist, Motion, Recharts | Manifest-only | Manifest only — [`package.json`](../../package.json) | [ARCH-015](ARCH-015-admincn-alignment.md), [ARCH-018](ARCH-018-admincn-customization.md) | Installed dependencies do not prove product use or grant new UI authority. |
| UI governance | `ACN-UI-*`, `ACN-BLK-*`, `FFT-UI-*` registry IDs | Current / Living | Not verifiable in this checkout | [ARCH-018](ARCH-018-admincn-customization.md), [ARCH-019](ARCH-019-admincn-frontend-preflight.md) | Do not invent IDs or bypass HITL registration. |

## 3.5 Data, tenancy, authentication, and environment

| Capability | Technology / choice | Lifecycle posture | Implementation evidence | Owning authority | Constraint / migration note |
| ---------- | ------------------- | ----------------- | ----------------------- | ---------------- | --------------------------- |
| Database platform | Neon Postgres (shared schema) | Current / Living platform | Configured Neon posture in docs/ops; `pg` is Manifest only; domain SQL **not** on disk | [ARCH-023](ARCH-023-multi-tenancy.md), [ARCH-025](ARCH-025-data-layer.md) | Product data access ships with Target Drizzle — do not recover Collapse-era domain SQL trees. |
| Tenancy model | One Neon project, hard `organization_id = $org` predicates | Current / Living | Decision Living in [ARCH-023](ARCH-023-multi-tenancy.md); app predicates and tenancy scripts **not** on disk (gated) | [ARCH-023](ARCH-023-multi-tenancy.md), [RB-001](../runbooks/RB-001-multi-org-ops.md) | No multi-database isolation; production pooler required. Do not restore Collapse tenancy scripts. |
| Identity | Neon Auth (+ `@neondatabase/auth-ui`) | Current / Living; `@afenda/auth` wrapper Present | `@afenda/auth` + `/auth/*` UI + `/api/auth/[...path]` on disk (I1.2) | [ARCH-023](ARCH-023-multi-tenancy.md), [ARCH-026](ARCH-026-auth-session.md) | No Auth.js / Clerk / Supabase Auth. |
| Target ORM and transport | Drizzle ORM, Drizzle Kit, `@neondatabase/serverless` | Target | Documented Target; packages absent | [ARCH-025](ARCH-025-data-layer.md) | Schema-first; tenant reads via approved org-scoped helper (`withOrg` Target). |
| Environment | `@t3-oss/env-nextjs`, Zod, `@afenda/env`, `.env.local` | Target (S4.1 shipped) | `packages/env` present; compose retired | [ARCH-027](ARCH-027-env-model.md), [AGENTS.md](../../AGENTS.md) | Sole env SSOT. Collapse `lib/env` / `env:compose` / `env:guard` banned to recover. |

## 3.6 Contracts and API tooling

| Capability | Technology / choice | Lifecycle posture | Implementation evidence | Owning authority | Constraint / migration note |
| ---------- | ------------------- | ----------------- | ----------------------- | ---------------- | --------------------------- |
| Validation and schema SSOT | Zod 4 at adapter boundaries | Current / Living | Configured dependency; owning schema source absent | [API-001](../api/API-001-api-boundaries.md), [API-004](../api/API-004-schema-map.md) | Domain trusts parsed input; do not create parallel DTO types. |
| Interface architecture | Shared ports adapted by Server Actions and Route Handlers | Current / Living | Not verifiable in this checkout | [ARCH-029](ARCH-029-interface-api-architecture.md), [API-001](../api/API-001-api-boundaries.md) | REST is additive and shares error/type vocabulary with Actions. |
| Machine contract | OpenAPI 3.0.3 YAML | Current / Living for api-now | Source verified — [`OPEN-001-openapi.yaml`](../api/OPEN-001-openapi.yaml) | [OPEN-001](../api/OPEN-001-openapi.md) | Contract-only resources must not be presented as live endpoints. |
| Schema-to-OAS bridge | `@asteasolutions/zod-to-openapi` 8.x | Current / Living tooling | Source verified — [`generate-openapi.mts`](../../scripts/generate-openapi.mts), [`package.json`](../../package.json) | [OPEN-001](../api/OPEN-001-openapi.md) | Generate from owning Zod schemas; do not hand-maintain the YAML as the durable source. |
| OAS lint and validation | Stoplight Spectral, YAML, JSON Schema/Ajv utilities | Current tooling; Ajv utilities are manifest-only support | Configured / manifest only | [OPEN-001](../api/OPEN-001-openapi.md), [GUIDE-011](../api/guides/GUIDE-011-generating-and-validating-openapi.md) | `pnpm check:openapi` is the documented gate. |

## 3.7 Testing, quality, and governance

| Capability | Technology / choice | Lifecycle posture | Implementation evidence | Owning authority | Constraint / migration note |
| ---------- | ------------------- | ----------------- | ----------------------- | ---------------- | --------------------------- |
| Unit and interaction tests | Vitest 4, Testing Library, jsdom | Current scripts and Target test stack | Manifest only; `testing/` is absent | [ARCH-022](ARCH-022-system-overview.md), [FFT-MOD-009](../modules/feed-farm-trade/FFT-MOD-009-verification.md) | Test commands exist, but suites cannot be claimed runnable in this checkout. |
| End-to-end tests | Playwright | Current configuration and Target | Configured — [`playwright.config.ts`](../../playwright.config.ts); `e2e/` and helpers absent | [ARCH-017](ARCH-017-frontend-folder-map.md), [ARCH-028](ARCH-028-implementation-slices.md) | Do not claim journey or smoke coverage without the missing tree. |
| Formatting and linting | Biome with Ultracite presets | Current configuration; shared config package is Target | Configured — [`biome.jsonc`](../../biome.jsonc) | [ARCH-022](ARCH-022-system-overview.md), [ARCH-024](ARCH-024-package-boundaries.md) | Markdown remains outside the current Biome include set. |
| Type safety | TypeScript strict mode and Next.js type checks | Current / Living | Configured — [`tsconfig.json`](../../tsconfig.json) | [ARCH-016](ARCH-016-next-js-conventions.md), [ARCH-022](ARCH-022-system-overview.md) | Product source is absent, so current typecheck coverage is not verifiable. |
| Documentation and module governance | Afenda document-integrity validator and executable module-quality contract | Current / Living | Source verified — `.cursor/skills/afenda-elite-doc-integrity/` and package scripts | [DOC-001](../_control/DOC-001-documentation-control-standard.md), [MOD-002](../modules/MOD-002-modules-index.md) | Structural pass does not by itself prove runtime readiness. |

## 3.8 Hosting and operations

| Capability | Technology / choice | Lifecycle posture | Implementation evidence | Owning authority | Constraint / migration note |
| ---------- | ------------------- | ----------------- | ----------------------- | ---------------- | --------------------------- |
| Application hosting | Vercel, one Next.js deployable, `sin1` region | Current / Living | Configured — project `afenda-lite` Root Directory `apps/web`, outside-root sources on; [`apps/web/vercel.json`](../../apps/web/vercel.json) | [ARCH-022](ARCH-022-system-overview.md), [RB-001](../runbooks/RB-001-multi-org-ops.md) | Workspace packages resolve via `sourceFilesOutsideRootDirectory`; a second deployable requires a superseding decision. |
| Database operations | Neon production branch, pooled connection, PITR and daily snapshots | Current / Living | Ops evidence documented; secret values not inspected | [ARCH-023](ARCH-023-multi-tenancy.md), [RB-001](../runbooks/RB-001-multi-org-ops.md) | Keep the shared-schema posture and production pooler invariant. |
| Continuous integration | GitHub Actions · Node 24 · pnpm frozen lockfile · `turbo run lint typecheck test` · Vercel Remote Cache (`TURBO_TOKEN` / `TURBO_TEAM`) | Current / Living (S8.1) | Source verified — [CI workflow](../../.github/workflows/ci.yml); local **19** turbo tasks green | [ARCH-028](ARCH-028-implementation-slices.md), [ARCH-022](ARCH-022-system-overview.md) | Biome lint + Vitest contract tests + `tsc` on `@afenda/*` and `@afenda/web`. |
| Docs-capable local gates | `check:docs-naming`, doc-integrity, module-quality, OpenAPI, `validate:neon-env` | Current / Living (docs checkout) | Source verified — [`run-checks.mjs`](../../scripts/run-checks.mjs) | [DOC-001](../_control/DOC-001-documentation-control-standard.md), [ARCH-028](ARCH-028-implementation-slices.md) | Collapse-era product/ops scripts are gated — not missing “gaps” to restore. |
| Target build/deploy | GitHub Actions deploy · `turbo run build --filter=@afenda/web` · Vercel prod · Corepack pnpm | Current / Living (S8.2) | Source verified — [deploy workflow](../../.github/workflows/deploy.yml); Actions run `29367183769` success; classic `VERCEL_TOKEN` PAT; `ENABLE_EXPERIMENTAL_COREPACK=1`; production Git auto-deploy ignored | [ARCH-022](ARCH-022-system-overview.md), [ARCH-028](ARCH-028-implementation-slices.md) | Actions owns production (`environment: production`); `pnpm/action-setup` reads root `packageManager` only. |

## 3.9 Supporting and module technologies

| Capability | Technology / choice | Lifecycle posture | Implementation evidence | Owning authority | Constraint / migration note |
| ---------- | ------------------- | ----------------- | ----------------------- | ---------------- | --------------------------- |
| Internationalization | `next-intl`; FFT vi/en engine strings | Manifest-only platform dependency; FFT capability is Living | Manifest only; product source absent | [FFT-MOD-003](../modules/feed-farm-trade/FFT-MOD-003-tech-stack.md), [FFT-MOD-006](../modules/feed-farm-trade/FFT-MOD-006-surfaces-and-routes.md) | FFT routes remain locale-free; strings do not authorize a locale URL tree. |
| Conditional notifications | Resend for app-level FFT mail | Conditional / program-gated | Manifest only; feature flags documented; source absent | [FFT-MOD-003](../modules/feed-farm-trade/FFT-MOD-003-tech-stack.md), [FFT-MOD-008](../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) | Not a replacement for Neon Auth shared-provider email. |
| Target app-owned email templates | React Email in `@afenda/emails` | Target (S6.1 shipped) | Present — [`packages/emails`](../../packages/emails), `react-email` in package manifest; `email:dev` on :3001 | [ARCH-022](ARCH-022-system-overview.md), [ARCH-026](ARCH-026-auth-session.md) | Neon Auth continues to own its own transactional messages; templates compose for app-owned mail only. |
| Import/export support | Papa Parse and SheetJS (`xlsx`) | Manifest-only | Manifest only — [`package.json`](../../package.json) | [FFT-MOD-007](../modules/feed-farm-trade/FFT-MOD-007-api-and-adapters.md), [FFT-MOD-010](../modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) | Capability docs do not prove either library is wired into product source. |
| ERP integration | Tenant-selected HTTP adapter behind `FFT_ERP_SYNC_ENABLED` | Conditional / program-gated | Documented configuration; implementation not verifiable | [FFT-MOD-003](../modules/feed-farm-trade/FFT-MOD-003-tech-stack.md), [FFT-MOD-008](../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) | No platform-wide Afenda ERP client; vendor/base URL stay tenant-owned optional config. |

## 3.10 Decision guardrails

| Choice | Disposition | Authority | Rule |
| ------ | ----------- | --------- | ---- |
| Edge runtime as default | Rejected | [ARCH-022](ARCH-022-system-overview.md), [API-001](../api/API-001-api-boundaries.md) | Node is the default; Edge requires a written exception. |
| Microservices, Nx, or multi-repo as the default system shape | Rejected | [ARCH-022](ARCH-022-system-overview.md) | One modular-monolith deployable and the approved Turborepo Target remain binding. |
| GraphQL or tRPC beside the REST/port model | Rejected | [ARCH-022](ARCH-022-system-overview.md) | Do not create a second contract version. |
| Prisma, Kysely, TypeORM, or MikroORM for the Target data layer | Rejected | [ARCH-025](ARCH-025-data-layer.md) | Drizzle is the approved Target ORM. |
| Auth.js, Clerk, custom JWT, or Supabase Auth | Rejected | [ARCH-026](ARCH-026-auth-session.md) | Neon Auth remains the identity provider. |
| Custom SMTP for Neon Auth | Rejected | [ARCH-026](ARCH-026-auth-session.md) | Use Neon's shared provider for Neon Auth transactional mail. |
| Storybook restoration | Retired | [ARCH-017](ARCH-017-frontend-folder-map.md) | Storybook was removed; do not recreate it without an explicit decision. |
| RLS/Data API as the default BFF tenancy fix | Rejected | [ARCH-023](ARCH-023-multi-tenancy.md) | Current isolation uses hard app predicates. |
| Schema-per-tenant or project-per-tenant as the product default | Rejected | [ARCH-023](ARCH-023-multi-tenancy.md) | Shared schema and one Neon project are accepted constraints. |
| Collapse-era `lib/env/`, `env:compose` / `env:guard` script bodies, or recovering them from git | Retired / banned | [ARCH-027](ARCH-027-env-model.md), [ARCH-028](ARCH-028-implementation-slices.md), [AGENTS.md](../../AGENTS.md) | Forward env is Target `@afenda/env` only. Do not teach `lib/env` as Living SSOT. |
| Treating gated package scripts or Glob ghosts as on-disk product tooling | Rejected | [ARCH-028](ARCH-028-implementation-slices.md) | Trust the filesystem; use docs-capable gates only. |
| Reintroducing npm/yarn Living lockfiles beside pnpm | Rejected | [ARCH-022](ARCH-022-system-overview.md), [ARCH-028](ARCH-028-implementation-slices.md) | Root pnpm is Living SSOT; `package-lock.json` / `yarn.lock` are gitignored. |
| Separate FFT shell, locale route tree, or infrastructure stack | Retired / rejected | [FFT-MOD-001](../modules/feed-farm-trade/FFT-MOD-001-module-architecture.md), [FFT-MOD-006](../modules/feed-farm-trade/FFT-MOD-006-surfaces-and-routes.md) | FFT remains a module of one Afenda-Lite platform. |

## 3.11 Maintenance triggers

Update this catalogue when any of the following occurs:

1. A stack-owning controlled document changes lifecycle or technology choice.
2. A Target slice ships under `apps/web` / `packages/*` and evidence moves from `Documented Target` to `Configured` or `Source verified`.
3. Collapse-era product or ops trees are **never** a recovery trigger — only greenfield Target implement per ARCH-028 updates evidence.
4. A dependency is removed, replaced, or promoted from manifest-only support to an approved architecture choice.
5. Hosting, CI, database, auth, or environment configuration changes materially.

ARCH-031 shall link to the changed authority rather than duplicate its detailed decision rationale.

---

# 4. References

| ID / Evidence | Title | Relationship |
| ------------- | ----- | ------------ |
| DOC-001 | [Documentation Control Standard](../_control/DOC-001-documentation-control-standard.md) | Governance |
| DOC-002 | [Documentation Register](../_control/DOC-002-documentation-register.md) | Registration |
| ARCH-015 | [AdminCN Alignment](ARCH-015-admincn-alignment.md) | UI authority |
| ARCH-017 | [Frontend Folder Map](ARCH-017-frontend-folder-map.md) | Current/removed frontend surfaces |
| ARCH-018 | [AdminCN Customization](ARCH-018-admincn-customization.md) | UI customization authority |
| ARCH-022 | [System Overview](ARCH-022-system-overview.md) | System framework and Target stack |
| ARCH-023 | [Multi-Tenancy and Platform RBAC](ARCH-023-multi-tenancy.md) | Tenancy authority |
| ARCH-025 | [Data Layer](ARCH-025-data-layer.md) | Target data choice |
| ARCH-026 | [Authentication and Session Model](ARCH-026-auth-session.md) | Auth choice |
| ARCH-027 | [Environment Variable Model](ARCH-027-env-model.md) | Environment Target and cutover |
| ARCH-028 | [Implementation Slices](ARCH-028-implementation-slices.md) | Target delivery and checkout drift |
| ARCH-029 | [Interface and API Architecture](ARCH-029-interface-api-architecture.md) | Interface parent authority |
| API-001 | [API Boundaries](../api/API-001-api-boundaries.md) | Runtime and adapter constraints |
| API-004 | [Schema Map](../api/API-004-schema-map.md) | Zod ownership |
| OPEN-001 | [OpenAPI](../api/OPEN-001-openapi.md) | Machine-contract tooling |
| FFT-MOD-003 | [FFT Tech Stack](../modules/feed-farm-trade/FFT-MOD-003-tech-stack.md) | Module runtime and flags |
| FFT-MOD-008 | [FFT Ops Runtime](../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) | Module gates |
| FFT-MOD-009 | [FFT Verification](../modules/feed-farm-trade/FFT-MOD-009-verification.md) | Module evidence posture |
| Repository | [`package.json`](../../package.json) and configuration files listed in §3.2 | Implementation evidence only |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.3.14 | 2026-07-15 | I1.2 honesty: Neon Auth UI `/auth/*` + `@afenda/auth` client/API handlers Present. |
| 1.3.13 | 2026-07-15 | Checkpoint G honesty: Living checkout; next program GUIDE-018 I1; Collapse-gated scripts = inventory. |
| 1.3.12 | 2026-07-15 | Docs audit residual: Deploy evidence — Actions success + classic PAT + `packageManager` Actions setup. |
| 1.3.11 | 2026-07-15 | S8.2: Target deploy evidence (`deploy.yml`, Corepack, prod READY); next open Checkpoint G (Docs). |
| 1.3.10 | 2026-07-15 | S8.1 audit: Biome+Vitest turbo gates real (19 tasks); catalogue quality/testing honesty. |
| 1.3.9 | 2026-07-15 | S8.1: Target CI turbo lint/typecheck/test + remote cache evidence; next open S8.2. |
| 1.3.8 | 2026-07-15 | S7.4 + Checkpoint F: catalogue evidence for `apps/web/features/*` shells; next open S8.1. |
| 1.3.7 | 2026-07-15 | S7.3: catalogue evidence for `apps/web/modules/*` domain ports; features still open (S7.4+); checkout posture next open S7.4. |
| 1.3.6 | 2026-07-15 | S7.2: catalogue evidence for `(public)` / `(operator)` / `(client)` route groups; modules/features still open (S7.3+). |
| 1.3.5 | 2026-07-15 | Vercel `afenda-lite`: Root Directory `apps/web` + outside-root sources verified; `vercel.json` colocated under `apps/web`. |
| 1.3.4 | 2026-07-15 | S7.1: retarget Next/PostCSS evidence to `apps/web`; remove orphaned root config as SSOT; Vercel Root Directory = `apps/web`. |
| 1.3.3 | 2026-07-15 | S6.1: `@afenda/emails` Present; catalogue inventory through S6.1; routes/modules still open. |
| 1.3.2 | 2026-07-15 | Docs audit: Notes checkout posture Checkpoint E (includes `@afenda/ui`). |
| 1.3.1 | 2026-07-15 | S5.1: `@afenda/ui` present; component foundation **base-vega** (local pro-dashboard DNA promote); packages through Checkpoint E. |
| 1.3.0 | 2026-07-15 | S4.1 evidence: packages through `@afenda/env` + `turbo.json` present; drop broken root `components.json` links (S5.1); environment row already Target shipped. |
| 1.2.0 | 2026-07-14 | Bounded reopen: Living pnpm cutover facts (`pnpm-lock.yaml`, workspace file, CI); reject reintroducing npm/yarn Living lockfiles; `pnpm` commands replace `npm run` / `npx`. |
| 1.1.1 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 1.1.0 | 2026-07-14 | Removed Collapse-era Current ops: `lib/env`, runnable compose/tenancy scripts as evidence; env forward = Target only; gated scripts + anti-recover guardrails; maintenance trigger no longer says “tree returns”. |
| 1.0.1 | 2026-07-14 | Notes: cite ARCH-028 anti-contamination lock (no Collapse tree recover). |
| 1.0.0 | 2026-07-14 | Initial Living, status-aware technology stack catalogue derived from governed documentation and repository evidence. |

---

# 6. Notes

- This catalogue owns discovery and lifecycle classification only. The linked source document owns each decision.
- Manifest-only dependencies are not automatically endorsed architecture.
- **Checkout posture:** Collapse product trees (`app/`/`modules/`/`features/`/`components-V2/`) remain absent **by design**. Living packages through S8.2 + Checkpoint G (`apps/web` modules + feature shells + CI/deploy included) are present — absence of Collapse roots is not a restore ticket; next program = [GUIDE-018](../guides/GUIDE-018-fullstack-e2e-integration-program.md) Phase **I1**. Many root script names still route through `collapse-script-unavailable.mjs` (inventory only).
- **Anti-contamination:** do not recover Collapse-era `app/`/`modules/`/`features/`/`components-V2/`, `lib/env/`, or wiped compose/tenancy scripts from git — [ARCH-028](ARCH-028-implementation-slices.md) lock.
- **Root cause of prior catalogue stale:** Treating `package.json` script **names** and Collapse Living compose/`lib/env` as Current runnable evidence after Collapse. Fixed in 1.1.0 — evidence follows the filesystem + Target decisions.
- External link availability and full code-to-document runtime drift remain outside the validator coverage used for this catalogue.
