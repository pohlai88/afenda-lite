# ARCH-028 Turborepo Implementation Slices

| Field | Value |
|-------|-------|
| ID | ARCH-028 |
| Category | Architecture |
| Version | 1.4.4 |
| Status | Target |
| Control State | Closed |
| Owner | Platform |
| Updated | 2026-07-14 |

> **Forward-writing / Target.** Ordered implementation plan for the Turborepo system. This is a **document**, not code. Do not create `apps/` or `packages/` until an explicit implementation request. Each slice is S (1–2 files) or M (3–5 files). L = structural move when product tree exists on disk.

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
- [ ] Tenant table inventory matches Living ARCH-023 roots (or introspect `br-tiny-hill-ao82jp6f` then reconcile) — do not invent parallel names
- [ ] Every tenant table has `organizationId` → `organization_id` NOT NULL with type matching shipped migrations (uuid today per ARCH-023)
- [ ] Package typechecks
- [ ] Public exports: `db`, `schema`, `withOrg`

**Authority:** [ARCH-025](ARCH-025-data-layer.md) · Living roots [ARCH-023](ARCH-023-multi-tenancy.md)

---

### S2.2 — `packages/db` client + `withOrg` (+ SQL → Drizzle)

**Size:** M · **Files:** `client.ts`, `drizzle.config.ts`, scripts `db:generate` / `db:migrate` / `db:check`

**Acceptance:**
- [ ] `withOrg` is the documented tenant read entry point
- [ ] `db:generate` writes under `packages/db/drizzle/`
- [ ] If numbered SQL under `db/migrations/` still exists: map tables into Drizzle schema, `drizzle-kit check` against live branch `br-tiny-hill-ao82jp6f`, then archive old `.sql` under `docs/scratch/` or an ADR archive — do not silent-delete history

### Checkpoint B

- [ ] App code imports DB only from `@afenda/db`
- [ ] No `pg` as the product DB client (ARCH-025)
- [ ] `rg "from 'pg'" apps/` = 0 after web wiring

---

### S3.1 — `packages/auth` session

**Size:** S · **Files:** `session.ts` (`Session`, `getSession`), `index.ts`, `package.json`

**Acceptance:**
- [ ] `getSession()` returns `Promise<Session>` — never silent null

**Authority:** [ARCH-026](ARCH-026-auth-session.md)

**Cutover note:** Consolidate `lib/auth/neon-auth-request.ts`, session helpers, and auth bits of `apps/web/proxy.ts` / middleware into this package when the monolith tree is present.

---

### S3.2 — `packages/auth` RBAC + invitations

**Size:** S · **Files:** `rbac.ts` (`requireRole`), `invitations.ts` (`inviteOrgMember`)

**Acceptance:**
- [ ] Wrong role → redirect `/403`; unauthenticated → `/auth/login`
- [ ] Neon Auth SDK calls stay inside `@afenda/auth`

### Checkpoint C

- [ ] No Neon Auth imports in `apps/web` outside `@afenda/auth`
- [ ] `rg "neon-auth-request" apps/web/` = 0 after move

---

### S4.1 — `packages/env`

**Size:** S · **Files:** `src/web.ts` (`createEnv`), `package.json`

**Acceptance:**
- [ ] `import { env } from '@afenda/env'` is fully typed
- [ ] Server var in client component is a type error
- [ ] Product code does not use raw `process.env` for app config
- [ ] Compose retired in the same change set — see [ARCH-027 cutover](ARCH-027-env-model.md#cutover-from-compose-s41)

**Authority:** [ARCH-027](ARCH-027-env-model.md)

### Checkpoint D

- [ ] `.env.local` is the only runtime env file for Next
- [ ] `rg "env:compose|env:guard" package.json` = 0
- [ ] `AGENTS.md` Living env section updated to match Target

---

### S5.1 — `packages/ui`

**Size:** M · **Files:** `globals.css`, shadcn/`components.json`, public component exports

**Acceptance:**
- [ ] `import { Button } from '@afenda/ui'` resolves
- [ ] App imports `@afenda/ui/globals.css`
- [ ] No duplicate shadcn tree under `apps/web/components/ui/`

**Authority:** [ARCH-024](ARCH-024-package-boundaries.md)

**Cutover note:** Move shared primitives from `components/ui/*` and cosmetic AdminCN primitives from `components-V2/*` when those trees exist. Route-bound shells stay in `apps/web/features/`.

### Checkpoint E

- [ ] `rg "from.*components/ui" apps/web/` = 0 (all UI imports use `@afenda/ui`)

---

### S6.1 — `packages/emails`

**Size:** S · **Files:** onboarding-invite + password-reset templates, `email:dev` script

**Acceptance:**
- [ ] `pnpm --filter @afenda/emails email:dev` previews templates (typically `:3001`)
- [ ] Auth invite path may compose templates from `@afenda/emails` where app-owned mail is used (Neon Auth shared provider still delivers Neon invite mail)

---

### S7.1 — `apps/web` Next scaffold (or shell move)

**Size:** S (greenfield) or L (move existing tree) · **Files:** `package.json` (`@afenda/web`), `next.config.ts`, `tsconfig.json`

**`next.config.ts` target knobs:**
- `transpilePackages`: all `@afenda/*` runtime packages
- `serverExternalPackages`: include `@neondatabase/serverless` when required
- Prefer React Compiler when the repo already enables it

**Acceptance:**
- [ ] `pnpm --filter @afenda/web dev` serves port 3000
- [ ] No `../../../packages/` relative imports — only `@afenda/*`

**Cutover note:** If root `app/`, `features/`, `modules/`, `public/` exist, move them into `apps/web/` in this slice (or a dedicated L PR immediately after scaffold).

---

### S7.2 — Route groups

**Size:** S · **Stub layouts:** `(public)`, `(operator)` + `requireRole('operator')`, `(client)` + `requireRole('client')`

**Acceptance:**
- [ ] `/` public; `/admin` and `/client/dashboard` guarded

---

### S7.3 — Domain stubs

**Size:** M · **Bounded contexts:** `identity`, `declarations`, `fft`, `platform` — each with at least one domain function taking `orgId: string`

**Acceptance:**
- [ ] Domain imports `@afenda/db` only via public surface
- [ ] Typecheck passes
- [ ] When migrating live modules: replace `pg` queries with Drizzle in the same bounded context

**Authority:** [ARCH-023](ARCH-023-multi-tenancy.md)

---

### S7.4 — Feature stubs

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
| [ARCH-022…028](.) | S1.1–S1.2 present: `turbo.json`, `pnpm-workspace.yaml`, `apps/web`, `packages/config`; `@afenda/db|auth|env|ui|emails` **absent** until later slices | Continue slice-serial implement — do not skip to full tree |
| Living maps ARCH-001…010 · 012…019 · 017 | Repo-root `app/`, `modules/`, `features/`, `components-V2/` **absent** after design-SSOT Collapse (`4680c91`) | **Expected · Forbidden to recover** — see Anti-contamination lock below |
| [ARCH-023](ARCH-023-multi-tenancy.md) | Living tenancy + RBAC rules | Binding now — enforce invariants even before packages exist |
| Living `AGENTS.md` env compose | Compose scripts gated; do not restore Collapse-era script bodies | Target is `.env.local` + `@afenda/env` at S4.1; until then document honesty over fake tooling |

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

| Banned recover | Replacement when product code is needed |
|----------------|------------------------------------------|
| `git checkout` / `git restore` / sparse checkout of Collapse parents (e.g. `f014807`, `4680c91^`) for `app/`, `modules/`, `features/`, `components-V2/`, `db/`, `e2e/`, `testing/`, `messages/`, or wiped ops `scripts/*` | **Greenfield** Target scaffold only after an **explicit** implement request following this document (S1+) into `apps/web/**` and `packages/*` |
| Recreating root `lib/`, root `components/`, Storybook, Portal Atmosphere, soft tenancy dual-mode | Remains banned per deprecation register |
| Treating Cursor Glob ghosts of `modules/**` as disk truth | Trust filesystem listing; missing roots are intentional |

Living ARCH folder/route/adapter maps remain normative for **shape**. They are **not** a license to restore banned trees. Forward product work = Target paths + new code — never Collapse recovery.


## References

- [ARCH-022 System Overview](ARCH-022-system-overview.md) — gap table + stack
- [ARCH-027 Env Model](ARCH-027-env-model.md) — compose cutover
- [ARCH-022 System Overview](ARCH-022-system-overview.md) § Workspace

## Change Log

| Version | Date | Summary |
|---------|------|---------|
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
