# Repository layout — Root / L1 / L2

**Campaign:** repo layout normalization (one-time).  
**Migration tracker:** [repo-migration-map.md](./repo-migration-map.md)  
**Authority:** Complements [iam-check-doctrine.md](./iam-check-doctrine.md); does not override slice acceptance proofs.

---

## Rules

| Layer | Meaning | Put here |
| ----- | ------- | -------- |
| **Root** | Bootstrap, policy, local-only env | `package.json`, `tsconfig.json`, `next.config.ts`, `proxy.ts`, `instrumentation.ts`, `env.*.example`, `AGENTS.md`, `README.md` |
| **L1** | One concern per top-level folder | `app`, `lib`, `components`, `public`, `db`, `testing`, `e2e`, `stories`, `docs`, `scripts` |
| **L2** | Bounded context inside L1 | `lib/entry`, `lib/pages`, `components/client`, … |

**Do not add new root folders for domain code.** Extend L2 inside existing L1 folders.

---

## Root (bootstrap only)

| Item | Role |
| ---- | ---- |
| `package.json`, `package-lock.json` | Dependencies and npm scripts |
| `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vercel.json` | Build and deploy config |
| `proxy.ts`, `instrumentation.ts` | Next.js server hooks |
| `playwright.config.ts`, `components.json` | Test and UI kit config |
| `env.config.example`, `env.secret.example` | Committed env templates |
| `env.config`, `env.secret`, `.env` | **Local only — gitignored.** Edit templates → `npm run env:compose` |
| `.env.vercel.*` | **Local audit artifacts — gitignored.** Use `npm run audit:vercel`, not `vercel env pull` |
| `AGENTS.md`, `README.md`, `LICENSE` | Human and agent entry |
| `.github/`, `.vscode/`, `.cursor/`, `.agents/` | CI and IDE tooling (not product) |

**Generated / never source:**

- `.next/`, `storybook-static/`, `test-results/`, `node_modules/`, `*.tsbuildinfo`
- `debug-storybook.log`, root `*.tgz` packages

---

## L1 — Product (ships)

### `app/` — URL surface only

Thin `page.tsx` / `layout.tsx` / `route.ts` files delegate to `lib/pages/` and `components/`.

| L2 route group | Purpose |
| -------------- | ------- |
| `app/page.tsx`, `join/`, `survey/`, `f/`, `invite/` | Public entry |
| `app/auth/`, `app/account/`, `app/org/` | Auth and account |
| `app/client/(gate)/`, `app/client/(workspace)/` | Client portal |
| `app/dashboard/` | Operator CRUD |
| `app/api/` | JSON routes |
| `app/actions/` | Server Actions (mutation entry) |
| `app/playground/` | **Dev harness only (S18)** — not production |

### `lib/` — Server logic (no JSX in `domain/`)

| L2 | Purpose | Examples |
| -- | ------- | -------- |
| `lib/auth/` | Session CCPs, Neon Auth | `session.ts`, `server.ts` |
| `lib/env/` | Runtime env SSOT | `manifest.ts`, `accessors.ts` |
| `lib/api/` | API route logic | health, draft |
| `lib/schemas/` | Zod contracts (S10) | `client.ts`, `surveys.ts` |
| `lib/email/` | Invite delivery | Neon org invite |
| `lib/server-actions/` | FormData readers | `form-data.ts` |
| `lib/entry/` | Ingress routers | `*-entry.ts` |
| `lib/pages/` | RSC page loaders | `*-page.ts(x)` |
| `lib/routing/` | Hrefs, session routing | `portal-routes.ts` |
| `lib/domain/` | SQL + invariants | `surveys.ts`, `clients.ts` |
| `lib/copy/` | Copy and brand strings | `portal-copy.ts` |
| `lib/governance/` | Reliance graph, UI matrix | `portal-reliance-registry.ts` |
| `lib/playground/` | Playground harness logic | `playground-registry.ts` |
| `lib/db.ts` | Pool bootstrap (**exception** — stays at `lib/` root) |

### `components/` — React UI

| L2 | Purpose |
| -- | ------- |
| `ui/` | shadcn primitives |
| `auth/` | GuardianAuthFacade, AccessVaultCard |
| `portal-atmosphere/` | PA system + fixtures |
| `shadcn-studio/` | Installed blocks |
| `svg/` | Brand icons |
| `client/` | Client workspace UI |
| `operator/` | Operator dashboard UI |
| `portal/` | Shared portal chrome |
| `hooks/` | UI-only React hooks |

**Boundary:** `components/**` must not import `@/lib/db`, `pg`, `@/app/actions/**`, or `@neondatabase/*`.

### `public/` — Static assets

Brand heroes, owl variants, icons. Served by Next.js and Storybook `staticDirs`.

### `db/migrations/` — DDL only

Apply with `npm run db:migrate`. App must not run DDL on request.

---

## L1 — Quality (verify)

| Path | Role |
| ---- | ---- |
| `testing/` | **Factory SSOT** — vitest config, credentials, e2e helpers, unit fixtures |
| `e2e/` | Playwright **specs** only (import `@/testing/e2e/*`) |
| `stories/` | Storybook UI evaluation |
| `.storybook/` | Storybook config and server mocks |

Commands: `npm run test:unit`, `test:interaction`, `verify:storybook`, `test:e2e:smoke`.

---

## L1 — Governance (know)

| Path | Role |
| ---- | ---- |
| `docs/TRACKING.md` | Program status SSOT |
| `docs/architecture/` | Doctrine, ADRs, slices, reliance snapshots |
| `docs/backlogs/` | BL items, post-deploy checklist |
| `docs/runbooks/` | Operational how-tos |
| `scripts/` | Checks, seed, env sync, governance export |

---

## Where to add new code

| Adding… | Location |
| ------- | -------- |
| New client route | `app/client/...` + `lib/pages/client-*` |
| New operator route | `app/dashboard/...` + `lib/pages/operator-*` |
| New SQL / table access | `lib/domain/` |
| New Zod contract | `lib/schemas/` |
| New env var | `lib/env/manifest.ts` + `env.config.example` |
| New UI for clients | `components/client/` |
| New UI for operators | `components/operator/` |
| Hero/atmosphere experiment | `components/portal-atmosphere/fixtures/` + `stories/ui-evaluation/` |
| New E2E spec | `e2e/*.spec.ts` + helper in `testing/e2e/` |
| New registry gate | `scripts/check-*.mjs` + `scripts/run-checks.mjs` |

---

## Legacy (collapsed or tombstoned)

| Was | Now |
| --- | --- |
| `supabase/` | [docs/legacy/supabase.md](../legacy/supabase.md) |
| `config/neon-auth.manifest.json` | `lib/auth/neon-auth.manifest.json` |
| `registry/icons/` | `components/svg/icon-placeholder.tsx` |
| `hooks/` (root) | `components/hooks/` |

---

## Compatibility barrels

**Removed.** Campaign status is **CLOSED** in [repo-migration-map.md](./repo-migration-map.md). Import from L2 paths only (`@/lib/entry/*`, `@/lib/pages/*`, `@/components/client/*`, …).
