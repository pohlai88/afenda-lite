# ARCH-028 Turborepo Implementation Slices

| Field | Value |
|-------|-------|
| ID | ARCH-028 |
| Category | Architecture |
| Version | 1.4.18 |
| Status | Target |
| Control State | Closed |
| Owner | Platform |
| Updated | 2026-07-15 |

> **Forward-writing / Target.** Ordered implementation plan for the Turborepo system. Through S7.2 this checkout has `apps/web` route groups `(public)` / `(operator)` / `(client)` + `@afenda/{config,db,auth,env,ui,emails}` — continue slice-serial only (see Anti-contamination lock below). Each slice is S (1–2 files) or M (3–5 files). L = structural move of **Target trees already on disk** only — never Collapse/legacy recovery from git.

## Purpose

Gives implementers a complete, ordered checklist derived from ARCH-022…027 . Acceptance criteria and verify commands are the gate for each slice.

**Plan residual:** Content from the Day-1 Turborepo plan (gap analysis, cutover notes, Checkpoint E, post-ship doc retirement, fuller risks) lives here and in sibling ARCH docs — not in the Cursor plan file.

## Preconditions (docs)

- [x] ARCH-022…027 Status Target (or Living after ship)
- [x] Turborepo decisions live in ARCH-022…027
- [x] Package manager cutover decided (pnpm workspaces per ARCH-022) — `packageManager` pin + `pnpm-lock.yaml` + `pnpm-workspace.yaml`
- [x] Explicit user request to implement (docs-only scope ends here) — 2026-07-14 coding unlock (S1.1+)

---

### S1.1 — Root workspace scaffold

**Size:** S · **Files:** `pnpm-workspace.yaml`, `turbo.json`, root `package.json` (devDeps only)

**Acceptance:**
- [x] `pnpm install` from root succeeds
- [x] `turbo run build --dry=json` resolves the task graph
- [x] Root has zero runtime `dependencies`

**Verify:** `pnpm install && turbo run build --dry=json`

**Cutover note:** Root package manager is already pnpm (`pnpm-lock.yaml`, `packageManager` pin). S1.1 still lands Turbo + populated `apps/*` / `packages/*` workspace members.

**Implement evidence (2026-07-14):** `apps/web` (`@afenda/web`) + `packages/config` (`@afenda/config`) workspace members; root runtime deps emptied; product deps under `@afenda/web`.

---

### S1.2 — `packages/config`

**Size:** S · **Files:** `package.json`, `biome.json`, `tsconfig/base.json`, `tsconfig/nextjs.json`, `tsconfig/react-library.json`

**Acceptance:**
- [x] Apps/packages can `extends` `@afenda/config/tsconfig/nextjs.json`
- [x] Biome config is extendable from the package (migrate from root `biome.jsonc`)

**Verify:** package is listed in the workspace

### Checkpoint A

- [x] No circular workspace deps

---

### S2.1 — `packages/db` schema skeleton

**Size:** M · **Files:** schema `platform.ts`, `declarations.ts`, `fft.ts`, `index.ts`, `package.json`

**Acceptance:**
- [x] Tenant table inventory matches Living ARCH-023 roots (or introspect `br-tiny-hill-ao82jp6f` then reconcile) — do not invent parallel names
- [x] Every tenant table has `organizationId` → `organization_id` NOT NULL with type matching shipped migrations (`text` on live branch — reconciled from uuid doc drift)
- [x] Package typechecks
- [x] Public exports: `db`, `schema`, `withOrg`

**Authority:** [ARCH-025](ARCH-025-data-layer.md) · Living roots [ARCH-023](ARCH-023-multi-tenancy.md)

**Implement evidence (2026-07-14):** `@afenda/db` — Living roots + `platform_*` IAM tables from Neon introspect; `client.ts` exports real `db` + `withOrg`; `pnpm --filter @afenda/db typecheck` PASS.

---

### S2.2 — `packages/db` client + `withOrg` (+ SQL → Drizzle)

**Size:** M · **Files:** `client.ts`, `drizzle.config.ts`, scripts `db:generate` / `db:migrate` / `db:check`

**Acceptance:**
- [x] `withOrg` is the documented tenant read entry point
- [x] `db:generate` writes under `packages/db/drizzle/`
- [x] If numbered SQL under `db/migrations/` still exists: map tables into Drizzle schema, `drizzle-kit check` against live branch `br-tiny-hill-ao82jp6f`, then archive old `.sql` under `docs/scratch/` or an ADR archive — do not silent-delete history

**Implement evidence (2026-07-14):**
- `drizzle.config.ts` + `db:generate` → `packages/db/drizzle/0000_living-roots-baseline.sql` + `meta/`
- `db:check` → drizzle-kit journal OK; live columns already reconciled in S2.1 via Neon MCP on `br-tiny-hill-ao82jp6f`
- `db/migrations/` **absent** on Collapse checkout — nothing to archive; baseline SQL comments warn not to apply CREATE onto live branch
- `db:migrate` script present; do not apply `0000` to production branch (tables already exist)

#### Operational ban — baseline migrate (Checkpoint B lock)

**`0000_living-roots-baseline.sql` is a journal baseline for forward diffs.** Applying it with `db:migrate` on `br-tiny-hill-ao82jp6f` would try `CREATE` on existing tables — **do not.**

| Layer | Enforcement |
|-------|-------------|
| Docs | This section · [ARCH-025](ARCH-025-data-layer.md) Operational considerations |
| Package | `packages/db/scripts/db-migrate-guard.mjs` — fails closed; refuses when only SQL is `0000_…` |
| Cursor hook | `.cursor/hooks/no-drizzle-baseline-migrate.mjs` (`beforeShellExecution`, `failClosed`) |

Allowed without override: `pnpm --filter @afenda/db db:generate` · `db:check`.  
Operator override for a later **non-baseline** forward migrate only: `AFENDA_ALLOW_DB_MIGRATE=1` (guard still blocks if `0000` is the sole SQL file).

### Checkpoint B

- [x] App code imports DB only from `@afenda/db` — no app DB importers yet; `@afenda/web` depends on `@afenda/db` only for product DB
- [x] No `pg` as the product DB client (ARCH-025) — removed from `@afenda/web`; client is `@neondatabase/serverless` via `@afenda/db`
- [x] `rg "from 'pg'" apps/` = 0 after web wiring

---

### S3.1 — `packages/auth` session

**Size:** S · **Files:** `session.ts` (`Session`, `getSession`), `index.ts`, `package.json`

**Acceptance:**
- [x] `getSession()` returns `Promise<Session>` — never silent null

**Authority:** [ARCH-026](ARCH-026-auth-session.md)

**Cutover note:** Greenfield `@afenda/auth` only. Do **not** recover Collapse `lib/auth/**` or root `proxy.ts` from git. If a Target `apps/web/proxy.ts` already exists on disk in a later slice, wire it to this package — never `git show` / restore banned paths.

**Implement evidence (2026-07-14):**
- `@afenda/auth` greenfield under `packages/auth/` — `src/session.ts` (`Session`, `Role`, `getSession`), `src/index.ts`, `package.json`
- Neon Auth via `createNeonAuth` (`@neondatabase/auth/next/server`); unauthenticated → `redirect('/auth/login')`; missing `activeOrganizationId` / unresolved membership role → throw (no silent null or invented org)
- Neon org role map (shell signal only): `owner`→`admin`, `admin`→`operator`, `member`→`client`
- Stabilize: `React.cache` request dedupe; package-internal `getNeonAuth()` for S3.2 reuse (not public export)
- Cutover N/A on this checkout: `lib/auth/` and `apps/web/proxy.ts` absent (Collapse) — no restore
- Verify: `pnpm --filter @afenda/auth typecheck` PASS

---

### S3.2 — `packages/auth` RBAC + invitations

**Size:** S · **Files:** `rbac.ts` (`requireRole`), `invitations.ts` (`inviteOrgMember`)

**Acceptance:**
- [x] Wrong role → redirect `/403`; unauthenticated → `/auth/login`
- [x] Neon Auth SDK calls stay inside `@afenda/auth`

**Implement evidence (2026-07-14):**
- `@afenda/auth` — `src/rbac.ts` (`requireRole` → `/403` / login via `getSession`); `src/invitations.ts` (`inviteOrgMember` via Neon Auth `organization/invite-member` with `APP_URL` Origin/Referer — Collapse `neon-auth-request` behavior absorbed here)
- Role signal hierarchy for coarse shells: `admin` satisfies `operator`; `client` exclusive
- Neon → Afenda invite role map: `admin`→`owner`, `operator`→`admin`, `client`→`member`
- Verify: `pnpm --filter @afenda/auth typecheck` PASS

### Checkpoint C

- [x] No Neon Auth imports in `apps/web` outside `@afenda/auth`
- [x] `rg "neon-auth-request" apps/web/` = 0 after move

**Checkpoint C evidence (2026-07-14):** `apps/web` has no `.ts`/`.tsx` sources yet — no `@neondatabase/auth*` import statements; `rg "neon-auth-request" apps/web` = 0; SDK `createNeonAuth` only under `packages/auth/src/session.ts`. package.json may still list `@neondatabase/auth(-ui)` for forthcoming Auth UI (S7.x) — server SDK usage remains in `@afenda/auth`.

---

### S4.1 — `packages/env`

**Size:** S · **Files:** `src/web.ts` (`createEnv`), `package.json`

**Acceptance:**
- [x] `import { env } from '@afenda/env'` is fully typed
- [x] Server var in client component is a type error
- [x] Product code does not use raw `process.env` for app config
- [x] Compose retired in the same change set — see [ARCH-027 cutover](ARCH-027-env-model.md#cutover-from-compose-s41)

**Authority:** [ARCH-027](ARCH-027-env-model.md)

**Implement evidence (2026-07-14):**
- `@afenda/env` — `packages/env/src/web.ts` (`@t3-oss/env-nextjs` + Zod 4), `src/index.ts`, `package.json`
- Lean required server: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `APP_URL`; flags/ops/playground optional; `emptyStringAsUndefined`; `skipValidation` for typecheck / `SKIP_ENV_VALIDATION` only
- `@afenda/auth` reads `env` (not raw `process.env`); `@afenda/db` keeps package-internal `process.env.DATABASE_URL` (ARCH-024 forbids db→env); `@afenda/web` depends on `@afenda/env`
- Client/server split enforced by t3 types (no invent Client Component this slice)
- Verify: `pnpm --filter @afenda/env typecheck` PASS · `pnpm --filter @afenda/auth typecheck` PASS

### Checkpoint D

- [x] `.env.local` is the only runtime env file for Next
- [x] `rg "env:compose|env:guard" package.json` = 0
- [x] `AGENTS.md` Living env section updated to match Target

**Checkpoint D evidence (2026-07-14):** merged local compose inventory → `.env.local`; removed `env.config` / `env.secret` / `.env` and committed examples; added `.env.example` + `!.env.example` gitignore; removed `env:compose` / `env:guard*` / compose write-path scripts from root `package.json`; `scripts/lib/env-files.mjs` + `validate-neon-env` load `.env.local` only; AGENTS.md Target env SSOT.

**A–D residue pass (2026-07-14, pre-E):** deleted `env-manifest.generated.mjs` + root Collapse `components.json` (`app/`/`modules/platform` aliases); Living docs/skills retargeted off pre-S4.1 two-state; ARCH-022/AGENTS checkout posture updated for packages through `@afenda/env`. **Superseded by S5.1 / Checkpoint E (2026-07-15)**, **S6.1 (2026-07-15)**, **S7.1 (2026-07-15)**, and **S7.2 (2026-07-15)** — see Acceptance evidence below; next open **S7.3**.

---

### S5.1 — `packages/ui`

**Size:** M · **Files:** `globals.css`, shadcn/`components.json`, public component exports

**Acceptance:**
- [x] `import { Button } from '@afenda/ui'` resolves
- [x] App imports `@afenda/ui/globals.css`
- [x] No duplicate shadcn tree under `apps/web/components/ui/`

**Authority:** [ARCH-024](ARCH-024-package-boundaries.md)

**Cutover note:** Greenfield `@afenda/ui` under `packages/ui` only. Do **not** recover Collapse `components/ui/*`, root `components.json`, or `components-V2/*` from git (even via `git show` as a seed). Route-bound shells stay in `apps/web/features/` when that Target tree exists on disk.

**Implement evidence (2026-07-15):**
- DNA source (user-named local kit, not Collapse git): `_reference/archive/shadcn-pro-dashboard` → promote essentials only (`base-vega` Button · `cn` · `globals.css` · `components.json`)
- `@afenda/ui` under `packages/ui/` — exports `.` + `./globals.css`; `apps/web` depends on workspace package; `apps/web/styles/globals.css` imports `@afenda/ui/globals.css`; smoke `apps/web/ui-boundary.smoke.ts`
- Verify: `pnpm --filter @afenda/ui typecheck` PASS · `pnpm --filter @afenda/web exec tsc --noEmit -p tsconfig.json` PASS · `rg "from.*components/ui" apps/web/` = 0 · `apps/web/components/ui` absent
- Local cleanup (gitignored `_reference/`): removed free/individual dashboards, lite repo tar.gz, `_reference/env.config` / `env.secret`; kept `shadcn-pro-dashboard`

### Checkpoint E

- [x] `rg "from.*components/ui" apps/web/` = 0 (all UI imports use `@afenda/ui`)

**Checkpoint E evidence (2026-07-15):** No `from …components/ui` matches under `apps/web/`; web consumes `@afenda/ui` only.
---

### S6.1 — `packages/emails`

**Size:** S · **Files:** onboarding-invite + password-reset templates, `email:dev` script

**Acceptance:**
- [x] `pnpm --filter @afenda/emails email:dev` previews templates (typically `:3001`)
- [x] Auth invite path may compose templates from `@afenda/emails` where app-owned mail is used (Neon Auth shared provider still delivers Neon invite mail)

**Implement evidence (2026-07-15):**
- Greenfield `@afenda/emails` under `packages/emails/` — `src/onboarding-invite.tsx`, `src/password-reset.tsx`, `src/index.ts` (`OnboardingInviteEmail` / `PasswordResetEmail` + `renderOnboardingInviteEmail` / `renderPasswordResetEmail`); `email:dev` → port **3001**
- Deps: `react-email`; `@react-email/ui` required as `email:dev` CLI peer (no src import); Neon Auth invite/reset delivery unchanged — `inviteOrgMember` still Neon shared provider; JSDoc points app-owned compose to `@afenda/emails`
- Verify: `pnpm --filter @afenda/emails typecheck` PASS · `pnpm --filter @afenda/emails email:dev` Ready at `http://localhost:3001` · `/preview/onboarding-invite` + `/preview/password-reset` HTTP 200 with Afenda-Lite copy

---

### S7.1 — `apps/web` Next scaffold (or shell move)

**Size:** S (greenfield) or L (move existing tree) · **Files:** `package.json` (`@afenda/web`), `next.config.ts`, `tsconfig.json`

**`next.config.ts` target knobs:**
- `transpilePackages`: all `@afenda/*` runtime packages
- `serverExternalPackages`: include `@neondatabase/serverless` when required
- Prefer React Compiler when the repo already enables it

**Acceptance:**
- [x] `pnpm --filter @afenda/web dev` serves port 3000
- [x] No `../../../packages/` relative imports — only `@afenda/*`

**Cutover note:** Scaffold Target `apps/web` greenfield. An L move applies only when those trees **already exist under Target paths on this checkout’s disk**. Absent Collapse roots must **not** be restored from git to “create” something to move.

**Implement evidence (2026-07-15):**
- Greenfield Target shell under `apps/web/` — `next.config.ts` (`transpilePackages` for `@afenda/{auth,db,emails,env,ui}`, `serverExternalPackages: ['@neondatabase/serverless']`, `reactCompiler`, `outputFileTracingRoot` → repo root); `loadEnvConfig(repoRoot)` via `@next/env` (Next 16 has no `envDir`) for ARCH-027 root `.env.local`
- Minimal App Router: `app/layout.tsx` (Geist + `styles/globals.css`), `app/page.tsx` (`@afenda/ui` Button), `app/global-error.tsx`; `postcss.config.mjs`; workspace deps `@afenda/auth` + `@afenda/emails`; `dev`/`start` pinned `--port 3000`
- Verify: `pnpm --filter @afenda/web typecheck` PASS · `pnpm --filter @afenda/web build` PASS · `pnpm --filter @afenda/web dev` Ready at `http://localhost:3000` · `GET /` 200 · MCP `get_errors` clean · `rg` `../../../packages` under `apps/web` = 0
- Gap close (same day): deleted orphaned repo-root `next.config.ts` + `postcss.config.mjs` (Target SSOT = `apps/web`); Vercel project `afenda-lite` Root Directory=`apps/web` + `sourceFilesOutsideRootDirectory=true` (API); `apps/web/vercel.json` colocated; ARCH-031 + DOC-002 synced

---

### S7.2 — Route groups

**Size:** S · **Thin layouts:** `(public)`, `(operator)` + `requireRole('operator')`, `(client)` + `requireRole('client')`

**Acceptance:**
- [x] `/` public; `/admin` and `/client/dashboard` guarded

**Authority:** [ARCH-012](ARCH-012-app-router-routes.md) · [ARCH-026](ARCH-026-auth-session.md)

**Cutover note:** Greenfield route groups under `apps/web/app/` only. Do **not** recover Collapse `app/` trees from git. `/admin` is the S7.2 operator shell gate path (Living ARCH-012 operator family remains `/dashboard/*` for later surfaces).

**Implement evidence (2026-07-15):**
- `(public)/` — `/` + `/403` (no session gate); home moved from `app/page.tsx`
- `(operator)/layout.tsx` → `requireRole('operator')`; `(operator)/admin/page.tsx` → `/admin`
- `(client)/layout.tsx` → `requireRole('client')`; `(client)/client/dashboard/page.tsx` → `/client/dashboard`
- Verify: `pnpm --filter @afenda/web typecheck` PASS · `pnpm --filter @afenda/web build` PASS (routes: `/` `○` · `/403` `○` · `/admin` `ƒ` · `/client/dashboard` `ƒ`) · `GET /` 200 · unauth `GET /admin` + `GET /client/dashboard` → 307 `location: /auth/login`

---

### S7.3 — Domain modules

**Size:** M · **Bounded contexts:** `identity`, `declarations`, `fft`, `platform` — each with at least one domain function taking `orgId: string`

**Acceptance:**
- [ ] Domain imports `@afenda/db` only via public surface
- [ ] Typecheck passes
- [ ] When migrating live modules: replace `pg` queries with Drizzle in the same bounded context

**Authority:** [ARCH-023](ARCH-023-multi-tenancy.md)

---

### S7.4 — Feature shells

**Size:** M · **features:** `auth`, `declarations`, `fft`, `org-admin` — RSC pages call domain, not DB directly

**Acceptance:**
- [ ] Features do not import `@afenda/db` directly
- [ ] Prefer existing Playwright smoke after wire-up: `pnpm --filter @afenda/web test:e2e:smoke` when e2e tree exists

### Checkpoint F

- [ ] `turbo run build` and `turbo run typecheck` exit 0
- [ ] `rg "from 'pg'" .` = 0
- [ ] `rg "lib/auth|lib/env|lib/db" apps/web/` = 0

---

### S8.1 — CI

**Size:** S · **File:** `.github/workflows/ci.yml` — `turbo run lint typecheck test`

**Acceptance:**
- [ ] Green on clean branch; `TURBO_TOKEN` available for remote cache

---

### S8.2 — Deploy

**Size:** S · **File:** `.github/workflows/deploy.yml` — `turbo run build --filter=@afenda/web` then Vercel prod

**Acceptance:**
- [ ] Vercel auto-deploy on push disabled if Actions owns deploy
- [ ] Production deploy succeeds
- [ ] Vercel: `ENABLE_EXPERIMENTAL_COREPACK=1` (or equivalent) if pnpm via Corepack is required

### Checkpoint G — Complete

- [ ] ARCH docs Status can move Target → Living when tree matches ARCH-022
- [ ] ARCH-022…027 decision sections remain Living/Target
- [ ] Post-ship doc retirement list below reviewed

## Post-ship doc retirement (after Checkpoint G)

> Rule: **the code is the map.** Folder-map docs that only restate on-disk layout may be retired after the tree matches Target. Product specs and ops runbooks stay.

| Doc set | Action after ship | Reason |
|---------|-------------------|--------|
| `docs/architecture/ARCH-001`…`ARCH-010` | Review → archive or narrow | Folder maps superseded by `apps/web/modules/` |
| `docs/architecture/ARCH-012`…`ARCH-016` · [ARCH-017](ARCH-017-frontend-folder-map.md) | Review → archive or narrow | Folder maps superseded by App Router tree |
| [ARCH-029](ARCH-029-interface-api-architecture.md) | Keep Living | Interface/API parent — not a folder-map retirement target |
| `docs/guides/GUIDE-001`…`GUIDE-006` | **Retired** | Duplicated DOC-*/AGENTS/skills; drift absorbed above |
| Former `GUIDE-007`…`GUIDE-014` | Deleted | Use ARCH-023/026 · FFT-MOD-008/010 |
| `docs/modules/feed-farm-trade/` | Keep | Product / engine SSOT |
| `docs/runbooks/RB-001`, `RB-005` | Keep | Ops |
| `docs/architecture/ARCH-021` | **Superseded** (DOC-002 register-only; stub removed) | Migration map closed; Target layout = ARCH-022 |
| Turborepo ARCH-022…028 | Status Target → Living | This set becomes Living SSOT |
| Living compose rules in `AGENTS.md` | Already updated in S4.1 | Must not contradict ARCH-027 |

Do **not** mass-delete in the scaffold PR. Retirement is a separate docs PR after code matches Target.

## Risks (implementers)

| Risk | Mitigation |
|------|------------|
| Schema invented without Neon introspect | Prefer `drizzle-kit introspect` / live branch before first migrate |
| Existing `.sql` does not map 1:1 to Drizzle | `drizzle-kit check` against `br-tiny-hill-ao82jp6f`; archive old SQL |
| `neon()` HTTP vs former `pg` pool behaviour | Exercise `withOrg` against production branch before cutting over writes |
| Workspace packages empty until implement | Root pnpm cutover done; S1.1 adds Turbo + `apps/web` / `packages/*` |
| pnpm symlinks break Vercel | Corepack / `installCommand` override; set `ENABLE_EXPERIMENTAL_COREPACK=1` if needed |
| Env ADR vs old compose scripts | Retire compose in the same change set as S4.1 ([ARCH-027](ARCH-027-env-model.md)) |
| FFT phase gate violated by refactor commits | Refactor-only commits; no FFT domain logic changes without program reopen |

## Target vs checkout drift

Absorbed from retired GUIDE-004. Records **Target vs checkout** drift for forward-writing Turborepo coding.

| Authority | Disk today | Coding impact |
|-----------|------------|---------------|
| [ARCH-022…028](.) | S1.1–S7.2 + Checkpoints A–E present: workspace + `@afenda/{config,db,auth,env,ui,emails}` + `apps/web` route groups; modules/features still open per S7.3+ | Continue slice-serial implement — next open **S7.3** |
| Living maps ARCH-001…010 · 012…019 · 017 | Repo-root `app/`, `modules/`, `features/`, `components-V2/` **absent** after design-SSOT Collapse (`4680c91`) | **Expected · Forbidden to recover** — see Anti-contamination lock below |
| [ARCH-023](ARCH-023-multi-tenancy.md) | Living tenancy + RBAC rules | Binding now — enforce invariants even before packages exist |
| `AGENTS.md` env | Target `@afenda/env` + `.env.local` + `.env.example` (S4.1 / Checkpoint D) | Compose retired — do not restore |

Do **not** invent remaining packages from Target docs alone — land each ARCH-028 slice with verify evidence.

| Concept | Target path | Do not use |
|---------|-------------|------------|
| App | `apps/web` | repo-root `app/` as authority |
| Edge session gate | `apps/web/proxy.ts` | root `proxy.ts` · `middleware.ts` |
| Routes | `apps/web/app/**` | root `app/` |
| Features | `apps/web/features/**` | root `features/` |
| Domain | `apps/web/modules/**` | root `modules/` |
| Shared packages | `packages/{auth,db,env,…}` | inventing parallel roots |

Cite Target paths as code spans; do not create broken relative links to missing source files.

### Anti-contamination lock (Collapse)

**Compulsory.** Design-SSOT Collapse removed the Living monolith product trees from this checkout. Agents and humans **must not** re-materialize them from git history.

**Default: ban. Exception: only an explicit user approval of that exact recovery in the current chat turn.** “Implement S5.1”, reading Living maps, or cutover wording that mentions old path names is **never** a recovery waiver. Operators may approve a named exception; agents must not invent one.

| Banned recover (without named user approval this turn) | Replacement when product code is needed |
|----------------|------------------------------------------|
| `git checkout` / `git restore` / sparse checkout / worktree materialization of Collapse parents (e.g. `f014807`, `4680c91^`) for `app/`, `modules/`, `features/`, `components-V2/`, `db/`, `e2e/`, `testing/`, `messages/`, or wiped ops `scripts/*` | **Greenfield** Target scaffold only after an **explicit** implement request following this document (S1+) into `apps/web/**` and `packages/*` |
| `git show` / `git cat-file` / archive dump of those banned paths used as an implementation seed, copy-paste source, or “historical reference” to rebuild product code | Same — write new Target code from ARCH Acceptance + Living **shape**; stop and ask if content is missing |
| Recreating root `lib/`, root `components/`, root Collapse-alias `components.json`, Storybook, Portal Atmosphere, soft tenancy dual-mode | Remains banned per deprecation register |
| Treating Cursor Glob ghosts of `modules/**` as disk truth | Trust filesystem listing; missing roots are intentional |

Living ARCH folder/route/adapter maps remain normative for **shape**. They are **not** a license to restore banned trees. Cutover notes that name old paths describe **disposition only** — they do **not** authorize git recovery. Forward product work = Target paths + new code — never Collapse/legacy recovery.


## References

- [ARCH-022 System Overview](ARCH-022-system-overview.md) — gap table + stack
- [ARCH-027 Env Model](ARCH-027-env-model.md) — compose cutover
- [ARCH-022 System Overview](ARCH-022-system-overview.md) § Workspace

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.4.18 | 2026-07-15 | Post-S7.2 audit: rename open S7.3/S7.4 labels (modules / feature shells); sibling Target banners sync via DOC-002. |
| 1.4.17 | 2026-07-15 | S7.2 route groups `(public)` / `(operator)` / `(client)` with `requireRole`; `/` public; `/admin` + `/client/dashboard` guarded. |
| 1.4.16 | 2026-07-15 | S7.1 `apps/web` Next shell (`next.config.ts` transpilePackages + App Router `/`); no Collapse recover. |
| 1.4.15 | 2026-07-15 | S6.1 `@afenda/emails` (onboarding-invite + password-reset + `email:dev` :3001); Neon Auth send path unchanged. |
| 1.4.14 | 2026-07-15 | Docs audit: A–D residue note no longer claims Next open S5.1 (E closed; next S6.1). |
| 1.4.13 | 2026-07-15 | S5.1 `@afenda/ui` (base-vega from local pro-dashboard kit) + Checkpoint E; no Collapse recover. |
| 1.4.12 | 2026-07-15 | Anti-contamination stress: legacy/Collapse recover (incl. `git show` mining) banned unless user names that recovery this turn; greenfield-only cutover notes for S3.1/S5.1/S7.1. |
| 1.4.11 | 2026-07-15 | S4.1 audit gap: fix ARCH-027 cutover anchor; Purpose banner matches packages through Checkpoint D. |
| 1.4.10 | 2026-07-14 | S4.1 `@afenda/env` (`@t3-oss/env-nextjs`) + Checkpoint D compose→`.env.local` cutover. |
| 1.4.9 | 2026-07-14 | S3.2 `@afenda/auth` RBAC + invitations (`requireRole`, `inviteOrgMember`) + Checkpoint C. |
| 1.4.8 | 2026-07-14 | S3.1 `@afenda/auth` session (`getSession` → `Promise<Session>`, fail-closed org). |
| 1.4.7 | 2026-07-14 | S2.2 operational ban documented; baseline migrate hook + package guard pointers. |
| 1.4.6 | 2026-07-14 | S2.2 drizzle generate/migrate/check + Checkpoint B (`pg` removed from web). |
| 1.4.5 | 2026-07-14 | S2.1 `@afenda/db` schema skeleton acceptance; `organization_id` type = live `text`. |
| 1.4.4 | 2026-07-14 | S1.1–S1.2 + Checkpoint A acceptance checked after implement unlock; preconditions package-manager + implement request marked done. |
| 1.4.3 | 2026-07-14 | ARCH-021 disposition = Superseded DOC-002 register-only (archive stub removed). |
| 1.4.2 | 2026-07-14 | Bounded reopen: package-manager cutover — document `pnpm` / `pnpm exec` in place of `npm run` / `npx` (repo SSOT `packageManager` + lockfile). |
| 1.4.1 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 1.4.0 | 2026-07-14 | Anti-contamination lock: forbid recovering Collapse-era `app/`/`modules/`/`features/`/`components-V2`/ops scripts from git; Living maps = shape only; forward work = Target greenfield after explicit implement. |
| 1.3.0 | 2026-07-14 | Integrity remediation: Change Log sync; fix ARCH-017 retirement mislabel; S2.1 acceptance aligns to ARCH-023; keep ARCH-029 Living. |
| 1.2.0 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 1.1.1 | 2026-07-14 | Header Control State retrofit note (superseded by 1.2.0 row for version alignment). |
| 1.1.0 | 2026-07-13 | Plan residuals: cutover notes, Checkpoint E, doc retirement, fuller risks |
| 1.0.0 | 2026-07-13 | Initial S1–S8 slices |
