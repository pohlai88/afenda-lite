# System overview (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/system/README.md` |
| Authority | **Scratch** — context-engineering · documentation-and-adrs + disk |
| Updated | 2026-07-19 |

One screen for “what ships.” Re-probe disk after package or route-group changes.

---

## What ships

| Layer | On disk |
|-------|---------|
| App | Sole deployable `apps/web` (Next.js App Router) |
| Edge gate | `apps/web/proxy.ts` — **not** `middleware.ts` |
| Packages | `@afenda/{config,db,auth,env,ui-system,emails}` |
| Domains | `apps/web/modules/{platform,identity,declarations,fft}` |
| UI features | `apps/web/features/{auth,declarations,fft,org-admin,portal-chrome,landing}` |

---

## Adapter (why this shape)

| Need | Adapter | Why |
|------|---------|-----|
| UI read | RSC → `modules/*/domain` | Same-origin; no self-`fetch('/api')` hop |
| UI mutation | Server Action — authz + Zod inside | Public endpoint; proxy alone is not authz |
| Health · Neon Auth · session · draft XHR | Route Handler under `/api` | Real external/browser consumers only |

---

## Env (folded)

| Rule | Detail |
|------|--------|
| Import | `import { env } from "@afenda/env"` — schema `packages/env` |
| Local runtime | `.env.local` only (gitignored) |
| Template | `.env.example` — keys, no secrets |
| Never sync to Vercel prod | `PLAYGROUND_*` · `NEON_API_KEY` · `NEON_ORG_ID` · `NEON_PROJECT_ID` · `NEON_BRANCH_ID` · Shadcn Studio keys |
| Validate | `pnpm validate:neon-env` |

---

## Module ownership (folded)

| Module | Domain home | Feature UI | Primary routes |
|--------|-------------|------------|----------------|
| platform | `modules/platform` | portal-chrome · landing | `/` · health · correlation |
| identity | `modules/identity` | auth · org-admin | `/auth/*` · `/join` · `/admin` |
| declarations | `modules/declarations` | declarations | `/client/**` |
| fft | `modules/fft` | fft | `/fft` |

FFT **2B–2D** product code stays frozen until an explicit program reopen this chat.

---

## Hard stops / Why

| Stop | Why (expensive to reverse) |
|------|----------------------------|
| Greenfield only under `apps/web/**` · `packages/*` | Collapse trees are absent by design |
| Host header ≠ tenant key | Tenant = Neon Auth active org → `organization_id` |
| No second deployable app | One Vercel project · one Next app |
| No raw `process.env` for product config | Zod contract in `@afenda/env` |

Companion: [../auth/README.md](../auth/README.md) · [../data/README.md](../data/README.md) · [../monorepo/README.md](../monorepo/README.md).
