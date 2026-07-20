# System overview (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/system/README.md` |
| Authority | **Scratch** — context-engineering · documentation-and-adrs + disk |
| Updated | 2026-07-20 |

One screen for “what ships.” Re-probe disk after package or route-group changes.

---

## What ships

| Layer | On disk |
|-------|---------|
| App | Product deployable `apps/web` (Next.js App Router) · official docs `apps/docs` (`@afenda/docs` Fumadocs; not Vercel prod product) |
| Edge gate | `apps/web/proxy.ts` — **not** `middleware.ts` |
| Packages | `@afenda/{config,db,auth,env,ui-system,emails}` |
| Domains | `apps/web/modules/{platform,identity}` |
| UI features | `apps/web/features/{auth,org-admin,portal-chrome,landing}` |

---

## Adapter (why this shape)

| Need | Adapter | Why |
|------|---------|-----|
| UI read | RSC → `modules/*/domain` | Same-origin; no self-`fetch('/api')` hop |
| UI mutation | Server Action — authz + Zod inside | Public endpoint; proxy alone is not authz |
| Health · Neon Auth · session | Route Handler under `/api` | Real external/browser consumers only |

---

## Env (folded)

| Rule | Detail |
|------|--------|
| Import | `import { env } from "@afenda/env"` — schema `packages/foundation/env` |
| Local runtime | `.env.local` only (gitignored) |
| Template | `.env.example` — keys, no secrets |
| Ops toggles | Named booleans on `@afenda/env` (`PORTAL_ORG_SWITCHER_ENABLED` · `GUARDIAN_AUTH_SHELL` · `PLAYGROUND_ENABLED`) — not a feature-flags package; DNA: [../entitlements/README.md](../entitlements/README.md) |
| Never sync to Vercel prod | `PLAYGROUND_*` · `NEON_API_KEY` · `NEON_ORG_ID` · `NEON_PROJECT_ID` · `NEON_BRANCH_ID` · Shadcn Studio keys |
| Validate | `pnpm validate:neon-env` |

---

## Module ownership (folded)

Summary only — L2 folders, isolation, verify: [../modules/README.md](../modules/README.md).

| Module | Domain home | Feature UI | Primary routes |
|--------|-------------|------------|----------------|
| platform | `modules/platform` | portal-chrome · landing | `/` · health · correlation |
| identity | `modules/identity` | auth · org-admin | `/auth/*` · `/join` · `/admin` · `/client` |

**Removed (nuclear wipe):** Declarations + Feed Farm Trade product modules/features/routes — do not recreate.

---

## Hard stops / Why

| Stop | Why (expensive to reverse) |
|------|----------------------------|
| Greenfield only under `apps/web/**` · `packages/*` | Collapse trees are absent by design |
| Host header ≠ tenant key | Tenant = Neon Auth active org → `organization_id` |
| No second **product** deployable on Vercel prod | One Vercel product project (`apps/web`). `apps/docs` is the official docs site — host via [../docs/deploying.md](../docs/deploying.md); not a second product runtime SSOT |
| No raw `process.env` for product config | Zod contract in `@afenda/env` |

Companion: [../modules/README.md](../modules/README.md) · [../auth/README.md](../auth/README.md) · [../data/README.md](../data/README.md) · [../monorepo/README.md](../monorepo/README.md).
