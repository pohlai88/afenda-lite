# ARCH-009 Modules Ownership Map

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ARCH-009     |
| **Category**      | Architecture |
| **Version**       | 1.1.1        |
| **Status**        | Living       |
| **Control State** | Closed       |
| **Owner**         | Backend      |
| **Updated**       | 2026-07-14   |

---

# 1. Purpose

Inventory Living **module ownership** for Afenda-Lite: which paths belong to Platform, Identity, Declarations, and Trade (`modules/fft`), which runners live under `features/*`, and what is forbidden to recreate after the `lib/` absorb.

**Method (not authority):** [afenda-elite-backend-modules](../../.cursor/skills/afenda-elite-backend-modules/SKILL.md) · [module-tree.md](../../.cursor/skills/afenda-elite-backend-modules/module-tree.md) · [residue-inventory.md](../../.cursor/skills/afenda-elite-backend-modules/residue-inventory.md).

---

# 2. Scope

## 2.1 In Scope

- Ownership tables per bounded context (logical L2+)
- FE runner / companion UI homes outside `modules/`
- Adapter homes (`app/actions`, `app/api`) as ownership pointers
- Closed relocate / Pass 2 / absorb history (do not reopen as active residue)
- Forbidden paths (`lib/`, `modules/trade/`, …)

## 2.2 Out of Scope

- Port method contracts ([ARCH-007](ARCH-007-ports-and-adapters.md))
- Import-ban law detail ([ARCH-006](ARCH-006-bounded-contexts.md))
- Folder map Target↔logical roots ([ARCH-005](ARCH-005-backend-folder-map.md))
- Package graph ([ARCH-024](ARCH-024-package-boundaries.md))
- FFT phase gates ([FFT-MOD-008](../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) · FFT-MOD-010)
- Recovering Collapse-era product trees ([ARCH-028](ARCH-028-implementation-slices.md))

---

# 3. Modules Ownership Map

**Posture:** This is a **logical Living inventory**. After Collapse, repo-root `modules/` / `features/` / `app/` are absent until Target implement under `apps/web/**` ([ARCH-022](ARCH-022-system-overview.md) · [ARCH-028](ARCH-028-implementation-slices.md)). Paths below describe intended ownership shape — not an on-disk claim.

**Contexts:** [ARCH-006](ARCH-006-bounded-contexts.md) · **Folders:** [ARCH-005](ARCH-005-backend-folder-map.md) · **Ports:** [ARCH-007](ARCH-007-ports-and-adapters.md) · **API:** [docs/api/](../api/) · `/afenda-elite-api-contract` · **FE homes:** [ARCH-017](ARCH-017-frontend-folder-map.md)

Prose **Trade** = Feed Farm Trade; code path **`modules/fft/`** (never `modules/trade/`).

## Hard rules

1. **Trade ↛ Declarations** (and reverse). Compose at the adapter only ([ARCH-006](ARCH-006-bounded-contexts.md)).  
2. New **product** domain/schema file → exactly **one** context under `modules/<context>/`. No `lib/` orphans.  
3. Ports never import `Request`, `next/headers`, or UI ([ARCH-007](ARCH-007-ports-and-adapters.md)).  
4. Product Zod in owning `schemas/`; **`parseSchema` / shared primitives from Platform** — Trade/Identity must not import Declarations common.  
5. **`lib/` is gone** — do not recreate. UI and runners → `features/*` (or Studio shell homes per ARCH-017).  
6. Never create `modules/trade/` or `features/trade/` product UI.  
7. Shared infra (env, Neon, auth, Studio shell, proxy, deploy) serves **both** product modules once.

## Target physical ↔ logical (pointer)

| Logical | Target (when implemented) |
|---------|---------------------------|
| `modules/<context>/` | `apps/web` and/or `packages/*` per ARCH-022 / ARCH-024 |
| `app/actions/*`, `app/api/*` | `apps/web/app/**` |
| `features/*` | `apps/web` feature homes per ARCH-017 |

---

## 1. Platform → `modules/platform/`

| Path | Role |
|------|------|
| `api/*` | Health / json-response helpers (no product draft compose here) |
| `schemas/api-error.ts` | Shared API error body / codes |
| `schemas/common.ts` | Shared Zod (`parseSchema`, uuid, email, slug, password) |
| `normalize-email.ts` | Email normalize (Platform-owned) |
| `env/*` | Typed env shape — Target `@afenda/env` ([ARCH-027](ARCH-027-env-model.md)) |
| `db.ts`, `db-config.ts` | Pool / connection config |
| `observability.ts`, `audit.ts` | Logging / audit helpers |
| `app-url.ts` | Canonical app URL |
| `utils.ts`, `format.ts`, `breakpoints.ts` | Shared primitives |
| `form-constraints.ts`, `pagination-range.ts`, `clipboard.ts` | Shared UI/domain helpers |
| `evidence-acceptance.ts` | Shared evidence acceptance labels |
| `copy/{portal-copy,portal-name}.ts` | Product copy SSOT (`portalCopy`, `PORTAL_NAME`) |
| `governance/*` | Reliance / route-coverage / studio kit helpers |
| `routing/*` | Portal hrefs, public-link landing, surface registry |
| `shell/*` | Shell entitlement **types** only — resolve in `features/portal-chrome` |
| `playground-embed.ts` | Embed header helpers |

---

## 2. Identity → `modules/identity/`

| Path | Role |
|------|------|
| `auth/*` | Neon Auth, session, admin, oauth, manifests, bootstrap-client-invite |
| `account-session.ts`, `client-session.ts` | Session gates |
| `domain/neon-auth-users.ts` | Auth user lookup |
| `domain/organization-users.ts` | Org-admin user directory |
| `domain/invite.ts`, `tokens.ts` | Invite token / QR |
| `domain/client-profile.ts`, `client-invitation-bootstrap.ts` | Client profile / invite bootstrap |
| `domain/platform-rbac*.ts` | Platform RBAC domain |
| `schemas/auth.ts`, `schemas/users.ts`, `schemas/platform-rbac.ts` | Identity Zod |
| `email/*` | Client onboarding invite email |
| `preview-client.ts`, `portal-member*.ts`, `portal-organization.ts` | Member / preview / org helpers |
| `admin.ts`, `auth-metadata.ts`, `delete-client-auth-user.ts` | Admin / cleanup helpers |
| `production-fixtures.ts` | Seed / fixture emails |
| `client-invitation-join-auth.ts` | Join auth helper |
| `organization-admin-shell-members.ts` | Shell members helper |

---

## 3. Declarations → `modules/declarations/`

| Path | Role |
|------|------|
| `domain/**` | Surveys, clients, drafts, evidence, submissions, share links, … |
| `schemas/common.ts` | Re-exports Platform common + Declarations-only (e.g. `surveyAnswersSchema`) |
| `schemas/{client,surveys,declarations,questions}.ts` | Product Zod |
| `api/client-declaration-draft-route*` | Draft Route Handler compose (Platform json + Identity session) |
| `server-actions/*` | FormData / evidence form helpers |
| `client-onboarding*`, `client-dashboard-metrics.ts`, `client-access-message.ts` | Client product helpers |
| `question-*.ts`, `countries.ts`, `cdp-ai-prompt.ts` | Question / locale / prompt helpers |

Product copy is **Platform** (`modules/platform/copy/*`) — not Declarations.

---

## 4. Trade → `modules/fft/`

| Path | Role |
|------|------|
| `domain/**` | Events, orders, RBAC, deposit, pickup, import, ERP, notify |
| `schemas/fft-schemas.ts` | Trade Zod (imports Platform common — **not** Declarations) |
| `auth/fft-session.ts` | Trade access gates (`fft.access`) |
| `auth/fft-phase2b.ts`, `fft-phase2d.ts` | Phase flag helpers |
| `i18n/*` | Trade i18n |

UI / Actions companions (not under `modules/`, ownership companions): `features/fft/fft-*.tsx`, `app/actions/fft.ts`, `app/fft/*`.

---

## 5. Driving adapters (outside modules)

| Home | Ownership |
|------|-----------|
| `app/actions/{account,admin,client,declarations,surveys,fft}.ts` | Per [ARCH-007](ARCH-007-ports-and-adapters.md) Action map — no `trade.ts` |
| `app/api/health/*` | Platform |
| `app/api/auth/[...path]` | Identity / Neon |
| `app/api/client/declaration-draft` | Declarations draft route helper |

---

## 6. FE runners / chrome (`features/`)

| Path | Role |
|------|------|
| `features/auth/entry/**` | Login / invite / secure-link entry |
| `features/auth/public-link-page*` | Public-link runners |
| `features/auth/*` (trust / shell copy) | Auth island helpers |
| `features/organization-admin/*` | Operator page runners + promoted Studio leaves |
| `features/portal-chrome/*` | Theme owner, brand, shell access resolve |
| `features/playground/**` | Local harness only — never prod contract |
| `features/fft/fft-*.tsx` | Trade UI under AdminCN / Studio shell |

Do **not** recreate `lib/pages`, `lib/entry`, or `lib/playground`.

---

## Forbidden (do not recreate)

| Path / pattern |
|----------------|
| Entire `lib/` tree (`domain`, `schemas`, `env`, `routing`, `auth`, `copy`, `entry`, `pages`, `playground`, `utils`, `format`, …) |
| `modules/trade/` |
| `features/trade/` product UI |
| Declarations-owned shared Zod used by Trade/Identity |
| Growing domain SQL inside `app/actions` or thin `page.tsx` |

---

## Relocate / absorb history (closed)

Record only — **not** an open residue backlog.

| Wave | Outcome | Date |
|------|---------|------|
| Context relocate | Platform → Identity → Declarations → Trade (`modules/fft`) | 2026-07-11 |
| Empty drawers | `lib/domain\|schemas\|env\|routing` deleted | 2026-07-11 |
| Pass 2 residue | Auth/copy/shims/shell-members absorbed | 2026-07-12 |
| Full runner absorb | Entry, org-admin pages, playground → `features/` | 2026-07-12 |
| `lib/` removed | Directory gone | 2026-07-12 |

Detail: [residue-inventory.md](../../.cursor/skills/afenda-elite-backend-modules/residue-inventory.md).

### Closed relocate table (abbrev)

| Former | Now |
|--------|-----|
| `lib/utils.ts`, `lib/format.ts` | Deleted → Platform `utils` / `format` |
| `lib/auth/auth-page-trust*`, `auth-form-intro-visibility*` | `features/auth/*` |
| `lib/copy/auth-shell-copy.ts` | `features/auth/auth-shell-copy.ts` |
| `lib/copy/portal-brand*`, `portal-theme.ts` | `features/portal-chrome/*` |
| `lib/copy/portal-copy.ts`, `portal-name.ts` | Deleted — Platform `copy/*` |
| `modules/declarations/copy/*` | Platform `copy/*` |
| `lib/organization-admin-shell-members.ts` | `modules/identity/organization-admin-shell-members.ts` |
| `lib/entry/**` | `features/auth/entry/**` |
| `lib/pages/organization-admin-*` | `features/organization-admin/` |
| `lib/pages/public-link-page*` | `features/auth/public-link-page*` |
| `lib/pages/playground/**`, `lib/playground/**` | `features/playground/` |

---

## Checklist

- [ ] New module file under exactly one of `platform` / `identity` / `declarations` / `fft`  
- [ ] No `lib/` recreation  
- [ ] No Trade ⇄ Declarations ownership bleed  
- [ ] Shared Zod from Platform  
- [ ] New UI runners under `features/*` (or Studio portal-views per ARCH-015/017)  
- [ ] FFT Actions via `app/actions/fft.ts`  

---

# 4. References

| ID | Title | Relationship |
| --- | --- | --- |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-003 | Controlled Document Template | Structure |
| ARCH-001 | Backend Architecture | Backend entry |
| ARCH-004 | Backend Layers | Hexagon layers |
| ARCH-005 | Backend Folder Map | L2 shape · Target roots |
| ARCH-006 | Bounded Contexts | Import bans |
| ARCH-007 | Ports and Adapters | Port / Action map |
| ARCH-008 | Next.js Adapter Map | Adapter runtime |
| ARCH-010 | Backend Conventions | Node · SQL · Vercel |
| ARCH-015 | Shadcn Studio / AdminCN Alignment | Shell DNA |
| ARCH-017 | Frontend Folder Map | `features/*` homes |
| ARCH-022 | System Overview — Turborepo | Target `apps/web` |
| ARCH-023 | Multi-Tenancy and Platform RBAC | `fft.access` |
| ARCH-027 | Environment Variable Model | Target env package |
| ARCH-028 | Turborepo Implementation Slices | Anti-contamination |
| FFT-MOD-001 | Feed Farm Trade module architecture | Trade locks |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.1.1 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 1.1.0 | 2026-07-14 | Logical inventory sync with module-tree: remove stale `lib/` shim claims; Platform normalize-email / RBAC / draft API ownership; FE portal-chrome + fft; closed relocate history; forbidden list; full References. |
| 1.0.3 | 2026-07-14 | Checkout posture: Living map = shape only; Collapse product trees forbidden to recover. |
| 1.0.2 | 2026-07-14 | DOC-003 six-section retrofit and parseable Change Log. |
| 1.0.1 | 2026-07-14 | Prior controlled revision (pre DOC-003 retrofit). |

---

# 6. Notes

### Checkout posture (Collapse · anti-contamination)

- Repo-root `app/` / `modules/` / `features/` / `components-V2/` are **absent** after design-SSOT Collapse (`4680c91`).
- **Forbidden:** git recover of those trees — [ARCH-028](ARCH-028-implementation-slices.md).
- Implement under Target `apps/web/**` / `packages/*` only after an **explicit** implement request.
- Ownership tables are **logical** until Target product trees exist; the 2026-07-11/12 relocate waves are historical program truth for the pre-Collapse tree.
