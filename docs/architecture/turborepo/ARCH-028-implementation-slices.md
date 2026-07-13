# ARCH-028 Implementation Slices

| Field | Value |
|-------|-------|
| ID | ARCH-028 |
| Category | Architecture |
| Version | 1.1.0 |
| Status | Target |
| Owner | Platform |
| Updated | 2026-07-13 |

> **Forward-writing / Target.** Ordered implementation plan for the Turborepo system. This is a **document**, not code. Do not create `apps/` or `packages/` until an explicit implementation request. Each slice is S (1–2 files) or M (3–5 files). L = structural move when product tree exists on disk.

## Purpose

Gives implementers a complete, ordered checklist derived from ARCH-022…027 (former ADR-010…014 absorbed). Acceptance criteria and verify commands are the gate for each slice.

**Plan residual:** Content from the Day-1 Turborepo plan (gap analysis, cutover notes, Checkpoint E, post-ship doc retirement, fuller risks) lives here and in sibling ARCH docs — not in the Cursor plan file.

## Preconditions (docs)

- [x] ARCH-022…027 Status Target (or Living after ship)
- [x] Former ADR-010…014 absorbed into ARCH-022…027
- [ ] Package manager cutover decided (pnpm workspaces per ARCH-022)
- [ ] Explicit user request to implement (docs-only scope ends here)

---

### S1.1 — Root workspace scaffold

**Size:** S · **Files:** `pnpm-workspace.yaml`, `turbo.json`, root `package.json` (devDeps only)

**Acceptance:**
- [ ] `pnpm install` from root succeeds
- [ ] `turbo run build --dry=json` resolves the task graph
- [ ] Root has zero runtime `dependencies`

**Verify:** `pnpm install && turbo run build --dry=json`

**Cutover note:** Existing `package-lock.json` / npm root is replaced in this slice. Prefer a dedicated PR for lockfile cutover.

---

### S1.2 — `packages/config`

**Size:** S · **Files:** `package.json`, `biome.json`, `tsconfig/base.json`, `tsconfig/nextjs.json`, `tsconfig/react-library.json`

**Acceptance:**
- [ ] Apps/packages can `extends` `@afenda/config/tsconfig/nextjs.json`
- [ ] Biome config is extendable from the package (migrate from root `biome.jsonc`)

**Verify:** package is listed in the workspace

### Checkpoint A

- [ ] No circular workspace deps

---

### S2.1 — `packages/db` schema skeleton

**Size:** M · **Files:** schema `platform.ts`, `declarations.ts`, `fft.ts`, `index.ts`, `package.json`

**Acceptance:**
- [ ] Every tenant table has `organizationId: text('organization_id').notNull()`
- [ ] Package typechecks
- [ ] Public exports: `db`, `schema`, `withOrg`

**Authority:** [ARCH-025](ARCH-025-data-layer.md)

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

**Cutover note:** Consolidate `lib/auth/neon-auth-request.ts`, session helpers, and auth bits of `proxy.ts` / middleware into this package when the monolith tree is present.

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
| `docs/architecture/backend/ARCH-001`…`ARCH-010` | Review → archive or narrow | Folder maps superseded by `apps/web/modules/` |
| `docs/architecture/frontend/ARCH-012`…`ARCH-016` · [ARCH-029](../frontend/ARCH-029-frontend-folder-map.md) | Review → archive or narrow | Folder maps superseded by App Router tree |
| `docs/guides/GUIDE-001`…`GUIDE-006` | Keep | Coding / docs workflow guides |
| Former `GUIDE-007`…`GUIDE-014` | Deleted | Use ARCH-011/023/026 · FFT-MOD-008/010 |
| `docs/modules/feed-farm-trade/` | Keep | Product / engine SSOT |
| `docs/runbooks/RB-001`, `RB-005` | Keep | Ops |
| `docs/architecture/ARCH-021` | **Archived** (`docs/architecture/archive/`) | Migration map closed; Target layout = ARCH-022 |
| Turborepo ARCH-022…028 | Status Target → Living | This set becomes Living SSOT |
| Living compose rules in `AGENTS.md` | Already updated in S4.1 | Must not contradict ARCH-027 |

Do **not** mass-delete in the scaffold PR. Retirement is a separate docs PR after code matches Target.

## Risks (implementers)

| Risk | Mitigation |
|------|------------|
| Schema invented without Neon introspect | Prefer `drizzle-kit introspect` / live branch before first migrate |
| Existing `.sql` does not map 1:1 to Drizzle | `drizzle-kit check` against `br-tiny-hill-ao82jp6f`; archive old SQL |
| `neon()` HTTP vs former `pg` pool behaviour | Exercise `withOrg` against production branch before cutting over writes |
| pnpm vs existing npm lockfile | Dedicated cutover step in S1.1 |
| pnpm symlinks break Vercel | Corepack / `installCommand` override; set `ENABLE_EXPERIMENTAL_COREPACK=1` if needed |
| Env ADR vs old compose scripts | Retire compose in the same change set as S4.1 ([ARCH-027](ARCH-027-env-model.md)) |
| FFT phase gate violated by refactor commits | Refactor-only commits; no FFT domain logic changes without program reopen |

## References

- [ARCH-022 System Overview](ARCH-022-system-overview.md) — gap table + stack
- [ARCH-027 Env Model](ARCH-027-env-model.md) — compose cutover
- [ARCH-022 System Overview](ARCH-022-system-overview.md) § Workspace

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.1.0 | 2026-07-13 | Plan residuals: cutover notes, Checkpoint E, doc retirement, fuller risks |
| 1.0.0 | 2026-07-13 | Initial S1–S8 slices |
