# ARCH-005 Backend Folder Map

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ARCH-005     |
| **Category**      | Architecture |
| **Version**       | 1.1.1        |
| **Status**        | Living     |
| **Control State** | Closed       |
| **Owner**         | Backend     |
| **Updated**       | 2026-07-14   |

---

# 1. Purpose

Define the Living backend folder map: `modules/*` bounded-context shape after `lib/` absorb, and how that map sits on Target `apps/web` + `packages/*`.

---

# 2. Scope

## 2.1 In Scope

- Logical `modules/` layout (L2)
- Adapter homes outside modules (`app/actions`, `app/api`, thin pages)
- `lib/` retirement (gone — do not recreate)
- Context path ownership (`fft/` not `trade/`)
- Target physical root mapping (pointer)

## 2.2 Out of Scope

- Port contracts ([ARCH-007](ARCH-007-ports-and-adapters.md))
- Layer do/don't ([ARCH-004](ARCH-004-backend-layers.md))
- Frontend features / AdminCN map ([ARCH-017](ARCH-017-frontend-folder-map.md))
- Full package boundary matrix ([ARCH-024](ARCH-024-package-boundaries.md))
- Vercel region / pooler matrix ([ARCH-010](ARCH-010-backend-conventions.md))
- Recovering Collapse-era repo-root `app/`/`modules/`/`features/`/`components-V2/` from git (contamination ban — [ARCH-028](ARCH-028-implementation-slices.md))

---

# 3. Backend Folder Map

**Posture:** This document is a **logical Living map**. After Collapse, repo-root product trees are absent. Implement under Target roots only after an explicit [ARCH-028](ARCH-028-implementation-slices.md) request.

Prose context **Trade** = product Feed Farm Trade; code path **`modules/fft/`** (never `modules/trade/`).

## Target physical ↔ logical

| Logical (Living shape) | Target physical (when implemented) |
|------------------------|------------------------------------|
| `modules/<context>/` | Prefer `packages/*` domain packages and/or `apps/web` module trees per [ARCH-022](ARCH-022-system-overview.md) / [ARCH-024](ARCH-024-package-boundaries.md) |
| `app/actions/*`, `app/api/*`, `app/**/page.tsx` | `apps/web/app/**` — sole Vercel deployable |
| `modules/platform/env` | Target `@afenda/env` ([ARCH-027](ARCH-027-env-model.md)) |
| `features/*` runners | `apps/web` / package feature homes per [ARCH-017](ARCH-017-frontend-folder-map.md) |

## Logical `modules/` layout

```text
modules/
  platform/       # health helpers, env shape, db, observability, api-error, governance, routing, shell
  identity/       # auth, session, invites, account, email
  declarations/   # surveys, clients, assignments, drafts, evidence, copy
  fft/            # feed farm trade domain + schemas + session + i18n
```

Driving adapters stay thin and **outside** domain trees:

| Adapter | Logical home | Role |
|---------|--------------|------|
| Server Actions | `app/actions/*` | Commands — Zod + session/authz + domain ([ARCH-008](ARCH-008-next-js-adapter-map.md)) |
| Route Handlers | `app/api/*` | api-now only (health, Neon Auth proxy, draft XHR, external REST) |
| RSC pages | `app/**/page.tsx` | Thin compose → features / module ports (no SQL in page) |

## `modules/` L2

| Path | Role |
|------|------|
| `modules/platform/api/*` | Route adapter helpers (health, draft runner, json-response) |
| `modules/platform/env/*` | Logical typed env shape — Target `@afenda/env` |
| `modules/platform/schemas/api-error.ts` | Shared `APIErrorBody` / codes |
| `modules/platform/schemas/common.ts` | Shared Zod primitives (`parseSchema`, uuid, email, …) |
| `modules/platform/db.ts`, `db-config.ts` | Pool / connection config (Node; pooler — [ARCH-010](ARCH-010-backend-conventions.md)) |
| `modules/platform/routing/*` | Portal hrefs, public-link landing, surface registry |
| `modules/platform/shell/*` | Shared shell types (`ShellModuleId`); resolve in portal-chrome feature home |
| `modules/platform/governance/*` | Reliance graph, route coverage |
| `modules/identity/auth/*` | Neon Auth, session, admin, oauth, manifests |
| `modules/identity/schemas/auth.ts` | Sign-in schema |
| `modules/identity/domain/*` | Invite tokens, auth user lookup |
| `modules/declarations/domain/*` | Surveys, clients, drafts, evidence, submissions |
| `modules/declarations/schemas/*` | Declarations Zod (`common`, `client`, `surveys`, …) |
| `modules/fft/domain/**` | Events, orders, allocation, deposits, pickup, imports, ERP |
| `modules/fft/schemas/fft-schemas.ts` | Trade Zod |
| `modules/fft/auth/fft-session.ts` | Trade access gates |
| `modules/fft/auth/fft-phase2b.ts`, `fft-phase2d.ts` | Phase flag helpers |
| `modules/fft/i18n/*` | Trade i18n |

**Forbidden**

| Ban | Use instead |
|-----|-------------|
| `modules/trade/` | `modules/fft/` |
| New domain under `lib/` | `modules/<context>/` |
| Fat `page.tsx` with SQL | Thin page → domain |
| `page.tsx` + `route.ts` same folder | RH under `app/api/**` only |

## `lib/` — gone (full absorb)

| Disposition | Paths |
|-------------|-------|
| **Runners / harness** | `features/auth/entry/**`, `features/organization-admin/organization-admin-*`, `features/auth/public-link-page*`, `features/playground/**` (local only) |
| **Gone** | Entire `lib/` tree — do **not** recreate |

Pass 2 absorb: FE trust → `features/auth/`; brand/theme → portal-chrome features; product copy SSOT → `modules/platform/copy/`; shell members → `modules/identity/`; entry / org-admin / playground runners → `features/`. Inventory: [ARCH-009](ARCH-009-modules-ownership-map.md) · skill [`residue-inventory.md`](../../.cursor/skills/afenda-elite-backend-modules/residue-inventory.md).

## Alignment (must not diverge)

| Topic | Authority |
|-------|-----------|
| Layers | [ARCH-004](ARCH-004-backend-layers.md) |
| Adapter primitives | [ARCH-008](ARCH-008-next-js-adapter-map.md) |
| Data-pattern tree | [ARCH-013](ARCH-013-bff-and-data-flow.md) |
| Frontend homes | [ARCH-017](ARCH-017-frontend-folder-map.md) |
| Env package | [ARCH-027](ARCH-027-env-model.md) |
| Ownership inventory | [ARCH-009](ARCH-009-modules-ownership-map.md) |

---

# 4. References

| ID | Title | Relationship |
| --- | --- | --- |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-003 | Controlled Document Template | Structure |
| ARCH-001 | Backend Architecture | Pack entry |
| ARCH-004 | Backend Layers | Layer rules |
| ARCH-006 | Bounded Contexts | Context splits |
| ARCH-008 | Next.js Adapter Map | Adapter homes |
| ARCH-009 | Modules Ownership Map | Residue / inventory |
| ARCH-010 | Backend Conventions | Runtime / SQL homes |
| ARCH-017 | Frontend Folder Map | Feature homes |
| ARCH-022 | System Overview | Target tree |
| ARCH-027 | Environment Variable Model | `@afenda/env` |
| ARCH-028 | Implementation Slices | Anti-contamination · Target |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.1.1 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 1.1.0 | 2026-07-14 | Target physical ↔ logical map; env → ARCH-027; adapter table; forbidden list; Alignment; fixed ARCH-017 link; pack sync with ARCH-004/008/010. |
| 1.0.3 | 2026-07-14 | Checkout posture: Living map = shape only; Collapse product trees not present and forbidden to recover; Target greenfield via ARCH-028 only. |
| 1.0.2 | 2026-07-14 | DOC-003 six-section retrofit and parseable Change Log; Control State Closed after architecture sync campaign. |
| 1.0.1 | 2026-07-14 | Prior controlled revision (pre DOC-003 retrofit). |

---

# 6. Notes

### Checkout posture (Collapse · anti-contamination)

- Repo-root product trees `app/`, `modules/`, `features/`, `components-V2/` (and wiped Collapse-era ops scripts) are **not present** in this checkout after design-SSOT Collapse (`4680c91`).
- **Forbidden:** recovering those trees from git history (`f014807` / Collapse parents) — contamination of the docs-first checkout. See [ARCH-028](ARCH-028-implementation-slices.md) Anti-contamination lock.
- Paths in this document are a **logical Living map** (shape). When product code is implemented, place it under **Target** roots per [ARCH-022](ARCH-022-system-overview.md) / [ARCH-028](ARCH-028-implementation-slices.md) (`apps/web/**`, `packages/*`) after an **explicit** implement request — never as a restore of banned repo-root trees.
- Phrases such as “on disk”, “live adapters”, or “relocate complete” describe the intended shape when a Target product tree exists; they are **not** a claim that Collapse-era files may be recovered.
