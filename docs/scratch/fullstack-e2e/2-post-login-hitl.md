# Post-Login HITL — fullstack E2E (UI-UX → FE → DB → BE)

| Field | Value |
|-------|-------|
| Posture | **Scratch** — not Living, Target, Accepted, or DOC-002 registered |
| Program | [GUIDE-018](../../guides/GUIDE-018-fullstack-e2e-integration-program.md) Phase I product verticals / hardening (I2–I5) as **evidence substrate** — this ledger does **not** reopen closed `I*` stages or claim I6 / GUIDE-017 READY |
| Mission skill | [`afenda-elite-implementation-slices`](../../../.cursor/skills/afenda-elite-implementation-slices/SKILL.md) |
| Companion | [1-pre-login-hitl.md](1-pre-login-hitl.md) — stop line ends where this ledger starts |
| Audience | Ops + Guardian (Frontend · Backend · Security) human-in-the-loop |
| Updated | 2026-07-17 |
| Disk inventory | Verified via `git ls-files` + `Test-Path` (PowerShell) |

## Status / posture (Scratch — not Living)

Working **human-in-the-loop (HITL)** checklist for the **Post-Login** cut of fullstack E2E. It does **not** replace:

- [ARCH-026](../../architecture/ARCH-026-auth-session.md) · [ARCH-023](../../architecture/ARCH-023-multi-tenancy.md)
- GUIDE-018 Living stage status / evidence tables
- Neon Auth APPROVED map ([neon-auth-slice-map](../../../.cursor/skills/afenda-elite-implementation-slices/neon-auth-slice-map.md)) — **N1–N18 complete; do not invent N19**
- FE compose map ([9-neon-auth-fe-surface-compose-map.md](../neon-auth-optimisation/9-neon-auth-fe-surface-compose-map.md)) — cite **FE-11…FE-15** here (not FE-01…FE-10)

**Quality bar:** enterprise production only. No reduced-viability planning language. No shims/stubs as exit criteria.

**Start line:** authenticated session exists (Neon Auth cookie / BFF) and post-login routing may run (`sync-cookies` · `ensure-active-organization` · `resolveRoleHome`). **In scope:** role homes, fail-closed shells, Tier-2 permission gates, authenticated product writes (invite · assign · revoke · declaration draft/submit), FFT Phase-2A list-only read shell.

**Stop line:** do **not** invent deep `/fft/*` product trees, AdminCN polish, Identity/Platform Living MOD packs, or GUIDE-017 READY. FFT **2B–2D** remains frozen.

---

## Scope

### In scope (Post-Login)

| Zone | Surfaces (disk) |
|------|-----------------|
| Session bootstrap | `GET/POST /api/session/sync-cookies` · `GET/POST /api/session/ensure-active-organization` — `apps/web/app/api/session/*/route.ts` |
| Post-login routing SSOT | `packages/auth/src/post-login.ts` — `OPERATOR_HOME_PATH=/admin` · `CLIENT_HOME_PATH=/client/declarations` · `redirectTo` allowlist |
| Signed-in public bounce | `(public)/page.tsx` — ready session → role home (N7) — **border** with Pre-Login |
| Operator home | `GET /admin` — `apps/web/app/(operator)/admin/page.tsx` → `OperatorPlatformShell` → `OrgAdminShell` (invite / assign / revoke / audit View) |
| Operator FFT read | `GET /fft` — `apps/web/app/(operator)/fft/page.tsx` → `FftEventsShell` (Phase 2A list-only; no deep routes) |
| Client home | `GET /client/declarations` · `GET /client/declarations/[assignmentId]` — workspace under `app/(client)/client/(workspace)/` |
| Client aliases | `GET /client` · `GET /client/dashboard` → declarations home (`features/auth/client-paths.ts`) |
| Role shells (coarse) | `(operator)/layout.tsx` → `requireRole("operator")` · `(workspace)/layout.tsx` → `requireRole("client")` → `/403` |
| Tier-2 permissions | `org.roles.manage` · `clients.invite` · `fft.access` via `hasPermission` / `requirePermission` / `require-fft-access` |
| Authenticated writes | Server Actions: `invite-org-member` · `assign-org-role` · `revoke-org-role` · `declaration-draft` · `submit-client-declaration` (+ `permission-gate`) |
| Declarations API | `GET/POST /api/client/declaration-draft` — `app/api/client/declaration-draft/route.ts` |
| Audit durability | `platform_rbac_audit` via `modules/platform/domain/record-rbac-audit.ts` (hard `organization_id`) |
| Edge gate (authed denial) | Wrong-role / missing permission → `/403` — `proxy.ts` + shells + `wrong-role-gate` / FFT adverse smoke |
| Join accept (border) | Invitee completes `/join?invitationId=…` → membership + session → role home — crosses Pre → Post |

### Explicitly out of scope

| Item | Why |
|------|-----|
| Anonymous public / auth island / join empty-state | Pre-Login HITL |
| Deep `/fft/events/*` · `/fft/admin/*` · pipeline UI | Absent on disk; FFT 2B–2D frozen |
| `/admin/approvals` · `/admin/activity` · AdminCN cut B | Not Living; I3.4 cut B waived |
| `/account/*` · `/dashboard/*` product homes | Matcher only / not Living operator home |
| Studio DNA staging (`shadcn-studio/**`, ad-hoc shell preview pages) | Not product Post-Login surfaces |
| FFT 2B–2D · inventing N19 · I6 / GUIDE-017 READY claims | Program locks |
| Collapse/legacy path recovery | Anti-contamination |
| Baseline migrate of `packages/db` `0000_*` on prod branch | Banned |

### Companion FE IDs (post-login only)

From scratch compose map: **FE-11** `/admin` · **FE-12** `/fft` · **FE-13** `/client/declarations` · **FE-14** detail · **FE-15** client aliases. **Do not** re-score FE-01…FE-10 here.

---

## Surface → evidence map

Fill **Status** only after human or commanded verify. Never invent PASS.

| Status | Meaning |
|--------|---------|
| `UNEVALUATED` | Not run this HITL pass |
| `PASS` | Verify command / browser probe met exit criterion with pasted evidence |
| `FAIL` | Ran; criterion not met |
| `BLOCKED` | Cannot run (env, secrets, factory credentials, Neon console, missing approval) — name the blocker |

| ID | Layer | Surface / concern | Disk anchor | Verify (commands or probe) | Status | Evidence / notes |
|----|-------|-------------------|-------------|----------------------------|--------|------------------|
| POL-UX-01 | UI-UX | Operator `/admin` chrome | `org-admin-shell` · `operator-platform-chrome` | Browser (operator factory): `/admin` — Sidebar chrome; invite/assign/revoke panels; no Neon `auth-surface.css` leak | UNEVALUATED | |
| POL-UX-02 | UI-UX | Operator `/fft` list-only | `fft-events-shell` | Browser: `/fft` list shell; no invented deep FFT nav | UNEVALUATED | |
| POL-UX-03 | UI-UX | Client declarations home | `declarations-shell` · panel / sheet | Browser (client factory): list + draft Sheet; metric strip honest | UNEVALUATED | |
| POL-UX-04 | UI-UX | Declaration detail | `declaration-detail-shell` | Browser: `/client/declarations/[assignmentId]` when fixture exists | UNEVALUATED | |
| POL-UX-05 | UI-UX | Forbidden authenticated | `403` + wrong-role | Browser: client hitting `/admin` or operator without `fft.access` → `/403` | UNEVALUATED | |
| POL-UX-06 | UI-UX | A11y post-login floor | `testing/a11y-assistive-matrix.ts` A11Y03-P3/P4 | Playwright a11y with factory — or BLOCKED naming credential gap | UNEVALUATED | |
| POL-FE-01 | Frontend | Route inventory honesty | `(operator)/**` · `(workspace)/**` | `git ls-files` matches FE-11…FE-15; no deep `/fft/*` pages | UNEVALUATED | |
| POL-FE-02 | Frontend | Role home SSOT | `post-login.ts` · `operator-paths` · `client-paths` | `pnpm --filter @afenda/web test -- post-login-routing client-paths operator-paths` | UNEVALUATED | |
| POL-FE-03 | Frontend | Role shell wiring | `(operator)/layout` · workspace layout | `pnpm --filter @afenda/web test -- role-shells` | UNEVALUATED | |
| POL-FE-04 | Frontend | Org-admin compose | `org-admin-*` · panels | `pnpm --filter @afenda/web test -- org-admin-shell organization-users org-admin-panels assign-org-role-form` | UNEVALUATED | |
| POL-FE-05 | Frontend | Operator platform smoke | `e2e/smoke/operator-platform-shell.spec.ts` | Playwright @smoke with factory | UNEVALUATED | |
| POL-FE-06 | Frontend | Post-login journey | `e2e/journey/post-login-routing.spec.ts` | Operator → `/admin`; client → `/client/declarations` | UNEVALUATED | |
| POL-FE-07 | Frontend | Wrong-role gate | `e2e/smoke/wrong-role-gate.spec.ts` | Client denied operator paths | UNEVALUATED | |
| POL-FE-08 | Frontend | FFT permitted vertical | `fft-permitted-vertical` unit + smoke | List-only + `fft.access` denial → `/403` | UNEVALUATED | |
| POL-FE-09 | Frontend | Declarations journey | `e2e/journey/declarations-*.spec.ts` | Submit/read · draft recovery · adverse — factory required | UNEVALUATED | |
| POL-FE-10 | Frontend | Invite → join border | `e2e/journey/invite-join.spec.ts` | Operator invite + invitee join lands post-login (mail/domain may BLOCK) | UNEVALUATED | |
| POL-DB-01 | DB | Neon env contract | `@afenda/env` · `.env.local` | `pnpm validate:neon-env` | UNEVALUATED | |
| POL-DB-02 | DB | Hard tenancy writes | `record-rbac-audit` · `withOrg` domains | `pnpm --filter @afenda/web test -- record-rbac-audit tenancy-isolation` | UNEVALUATED | |
| POL-DB-03 | DB | Assign/revoke audited | `assign-org-role-audited` · `revoke-org-role-audited` | `pnpm --filter @afenda/web test -- n12-assign-revoke-audited assign-org-role revoke-org-role` | UNEVALUATED | |
| POL-DB-04 | DB | Declarations tenancy | declarations domain + actions | `pnpm --filter @afenda/web test -- declaration-submit-read submit-client-declaration-action tenancy-isolation` | UNEVALUATED | |
| POL-DB-05 | DB | Permission catalog | seed / `has-permission` | `pnpm --filter @afenda/web test -- has-permission permission-kernel product-authorization-wiring` · HITL: catalog present on Living branch (no baseline migrate) | UNEVALUATED | |
| POL-DB-06 | DB | Two-org denial | `e2e/smoke/two-org-denial.spec.ts` · `testing/e2e/tenancy.ts` | Factory two-org smoke green or BLOCKED | UNEVALUATED | |
| POL-BE-01 | Backend | Action authz + ActionResult | `app/actions/*` | `pnpm --filter @afenda/web test -- invite-org-member assign-org-role revoke-org-role action-result-contract i51-security-cut-ledger` | UNEVALUATED | |
| POL-BE-02 | Backend | Feature → domain → db | shells / domains | `pnpm --filter @afenda/web test -- feature-db-boundary` | UNEVALUATED | |
| POL-BE-03 | Backend | Session completion APIs | `api/session/*` | Unit/disk honesty + authenticated probe (factory); document BLOCKED if no session | UNEVALUATED | |
| POL-BE-04 | Backend | Declaration draft API | `api/client/declaration-draft` | OpenAPI disk + action/API tests; authed probe | UNEVALUATED | |
| POL-BE-05 | Backend | Safe errors / correlation | `safe-error-copy` · `i53-correlation` | `pnpm --filter @afenda/web test -- safe-error-copy i53-correlation-inventory n14-security-failure-verification` | UNEVALUATED | |
| POL-BE-06 | Backend | SDK boundary | `@afenda/auth` only | `pnpm --filter @afenda/web test -- auth-sdk-boundary` | UNEVALUATED | |
| POL-BE-07 | Backend | OpenAPI honesty | health + declaration-draft | `pnpm check:openapi` · `openapi-api-now-disk` | UNEVALUATED | |

---

## HITL steps (ordered)

Run layers in order. A later layer may be `BLOCKED` if an earlier layer is `FAIL`. Human signs each checkpoint.

### 0 — Preconditions (human)

| Step | Action | Exit |
|------|--------|------|
| HITL-0.1 | Confirm mission is **scratch HITL only** — no product code, no DOC-002 register, no I6 / GUIDE-017 READY claim | Verbal / chat ack |
| HITL-0.2 | Local runtime: `.env.local` present (gitignored); secrets never pasted into this file | `pnpm validate:neon-env` runnable |
| HITL-0.3 | E2E factory credentials available for operator + client (and second org when running two-org) — or mark factory-dependent rows `BLOCKED` | `testing/e2e/credentials.ts` / env documented in [testing/README.md](../../../testing/README.md) |
| HITL-0.4 | Optional: `pnpm --filter @afenda/web dev` on `:3000` for browser probes | Dev server up or mark browser rows BLOCKED |
| HITL-0.5 | Confirm Pre-Login stop line understood — this ledger starts **after** credential success | Cite [1-pre-login-hitl.md](1-pre-login-hitl.md) |

### 1 — UI-UX layer

| Step | Checkpoint | Pass criterion | Status |
|------|------------|----------------|--------|
| HITL-UX-1 | **Operator home hierarchy** — `/admin` | `OperatorPlatformChrome` + org-admin panels; brand/chrome consistent; no auth-island CSS | UNEVALUATED |
| HITL-UX-2 | **FFT list-only honesty** — `/fft` | Events list shell only; no deep FFT product nav invented | UNEVALUATED |
| HITL-UX-3 | **Client home** — `/client/declarations` | List + draft Sheet interaction surfaces; aliases redirect to home | UNEVALUATED |
| HITL-UX-4 | **Wrong-role / forbidden** | Authenticated wrong-role lands `/403` with Forbidden shell | UNEVALUATED |
| HITL-UX-5 | **A11y post-login floor** | A11Y03-P3 (`/admin`) · A11Y03-P4 (`/client/declarations`) axe — or BLOCKED with named factory/Playwright gap | UNEVALUATED |
| HITL-UX-6 | **Stop-line review** | No HITL step requires FFT 2B–2D routes, AdminCN cut B, or GUIDE-017 READY | UNEVALUATED |

**UI-UX verify bundle (when env ready):**

```powershell
pnpm --filter @afenda/web test -- ux-a11y-i18n-perf-matrix.inventory
# Authenticated a11y rows need factory — public-only CWV is Pre-Login (PERF01 publicPaths)
pnpm exec playwright test e2e/smoke/a11y-assistive-matrix.spec.ts e2e/smoke/operator-platform-shell.spec.ts
```

### 2 — Frontend layer

| Step | Checkpoint | Pass criterion | Status |
|------|------------|----------------|--------|
| HITL-FE-1 | **Disk inventory** | Operator + client workspace paths in this doc match `git ls-files` | UNEVALUATED |
| HITL-FE-2 | **Post-login SSOT** | Role homes pin to `@afenda/auth` constants; unit green | UNEVALUATED |
| HITL-FE-3 | **Role shells** | Operator/client layouts wire `requireRole`; unit green | UNEVALUATED |
| HITL-FE-4 | **Org-admin units** | Shell + member directory + forms interaction tests green | UNEVALUATED |
| HITL-FE-5 | **Browser post-login routing** | Journey: operator → `/admin`; client → `/client/declarations` | UNEVALUATED |
| HITL-FE-6 | **Wrong-role + FFT access** | Smoke wrong-role + FFT permitted vertical green | UNEVALUATED |
| HITL-FE-7 | **Declarations journeys** | Submit/read + recovery specs green (or BLOCKED) | UNEVALUATED |
| HITL-FE-8 | **Typecheck** | `@afenda/auth` + `@afenda/web` typecheck green | UNEVALUATED |

**Frontend verify bundle:**

```powershell
pnpm --filter @afenda/auth typecheck
pnpm --filter @afenda/web typecheck
pnpm --filter @afenda/web test -- post-login-routing client-paths operator-paths role-shells org-admin-shell organization-users portal-chrome fft-permitted-vertical
pnpm exec playwright test e2e/journey/post-login-routing.spec.ts e2e/smoke/wrong-role-gate.spec.ts e2e/smoke/operator-platform-shell.spec.ts e2e/smoke/fft-permitted-vertical.spec.ts
# Factory-heavy (mark BLOCKED if credentials absent):
# pnpm exec playwright test e2e/journey/declarations-submit-read.spec.ts e2e/journey/declarations-draft-recovery.spec.ts e2e/journey/declarations-adverse-recovery.spec.ts e2e/journey/invite-join.spec.ts e2e/smoke/two-org-denial.spec.ts
```

**Local route probes (authenticated session required — do not paste cookies into this file):**

```powershell
# With factory session in browser DevTools / Playwright only:
# expect /admin · /fft · /client/declarations → 200 for authorized role
# expect wrong-role → /403
# anonymous probes of these paths belong to Pre-Login (307 → /auth/login)
```

### 3 — DB layer

| Step | Checkpoint | Pass criterion | Status |
|------|------------|----------------|--------|
| HITL-DB-1 | **Env ids** | `pnpm validate:neon-env` green against Living Neon project/branch policy | UNEVALUATED |
| HITL-DB-2 | **RBAC audit hard org** | Invite/assign/revoke write `platform_rbac_audit` with session `organization_id` (never soft NULL) | UNEVALUATED |
| HITL-DB-3 | **Assign/revoke audit pairing** | N12 audited paths green | UNEVALUATED |
| HITL-DB-4 | **Declarations isolation** | orgB cannot get/draft/submit orgA assignment; unit + journey evidence | UNEVALUATED |
| HITL-DB-5 | **Permission catalog** | `hasPermission` / product wiring green; HITL confirms catalog seed on Living branch without applying banned baseline migrate | UNEVALUATED |
| HITL-DB-6 | **Two-org smoke** | `two-org-denial` green or BLOCKED with named gap | UNEVALUATED |

**DB verify bundle:**

```powershell
pnpm validate:neon-env
pnpm --filter @afenda/web test -- record-rbac-audit n12-assign-revoke-audited n12-audit-security-evidence tenancy-isolation declaration-submit-read has-permission permission-kernel product-authorization-wiring
# Optional factory:
# pnpm exec playwright test e2e/smoke/two-org-denial.spec.ts
```

**Note:** Baseline migrate ban on production branch `br-tiny-hill-ao82jp6f` still applies — Post-Login HITL must not apply `packages/db` `0000_*` baseline. Permission catalog uses Living ensure/seed path only (`pnpm --filter @afenda/db db:ensure-permission-catalog` when Ops-approved).

### 4 — Backend layer

| Step | Checkpoint | Pass criterion | Status |
|------|------------|----------------|--------|
| HITL-BE-1 | **Server Action cut ledger** | All product `"use server"` Actions inventoried + authz-tested (`i51-security-cut-ledger`) | UNEVALUATED |
| HITL-BE-2 | **Invite / assign / revoke** | ActionResult contracts + permission denials (`n14`) green | UNEVALUATED |
| HITL-BE-3 | **Feature/db boundary** | Features never import `@afenda/db` | UNEVALUATED |
| HITL-BE-4 | **Session APIs** | `sync-cookies` · `ensure-active-organization` present; authenticated completion path documented (PASS with probe or BLOCKED) | UNEVALUATED |
| HITL-BE-5 | **Declaration draft API** | Disk + OpenAPI honesty; authed draft path | UNEVALUATED |
| HITL-BE-6 | **Obs / safe errors** | Correlation inventory + safe error copy green | UNEVALUATED |
| HITL-BE-7 | **SDK boundary** | No Neon SDK outside `@afenda/auth` on Post-Login product paths | UNEVALUATED |

**Backend verify bundle:**

```powershell
pnpm --filter @afenda/web test -- invite-org-member assign-org-role revoke-org-role submit-client-declaration-action action-result-contract feature-db-boundary i51-security-cut-ledger i53-correlation-inventory safe-error-copy n14-security-failure-verification auth-sdk-boundary openapi-api-now-disk
pnpm check:openapi
pnpm exec turbo run lint typecheck test --filter=@afenda/web --filter=@afenda/auth --filter=@afenda/db
```

---

## Layer sign-off

| Layer | Owner role | Date | Result (`PASS` / `FAIL` / `BLOCKED`) | Blocker / link |
|-------|------------|------|--------------------------------------|----------------|
| UI-UX | | | UNEVALUATED | |
| Frontend | | | UNEVALUATED | |
| DB | | | UNEVALUATED | |
| Backend | | | UNEVALUATED | |

**Post-Login HITL closed only when** all four layers are `PASS`, or failures/blockers are named with owners. Partial green must not be summarized as program READY or I6 complete.

---

## Open gaps needing human decision

| # | Gap | Why it needs a human | Options (non-binding) |
|---|-----|----------------------|------------------------|
| G1 | **E2E factory credentials** | Most Post-Login browser rows need operator/client (and often second-org) secrets | Run with local factory · accept CI `e2e-smoke` evidence · or leave BLOCKED |
| G2 | **Invite → join → home** | Mail (Zoho) + trusted domains + real invitationId; crosses Pre/Post | Keep invite-join as optional border · or require full mailbox HITL for Post-Login close |
| G3 | **Session bootstrap APIs** | `sync-cookies` / `ensure-active-organization` are hard to unit-prove without live session | Accept N7/N8 historical evidence · add dedicated smoke · or BLOCKED until probe script approved |
| G4 | **Authenticated CWV** | PERF01 `publicPaths` are Pre-Login only; post-login LCP not standing-gated | Keep a11y-only for Post UX · or Approve authenticated CWV extension |
| G5 | **FFT beyond list-only** | Deep routes absent by freeze — humans may want “more FFT” | Keep list-only PASS honest · reopen only via FFT-MOD-008 (not this ledger) |
| G6 | **AdminCN / Studio polish** | I3.4 cut B waived; FE-11 chrome CAPABLE without AdminCN | Exclude from Post-Login PASS · schedule separate Studio DNA / ui-compose mission |
| G7 | **Declaration fixture data** | Detail + submit journeys need assignment rows in Living DB | Ops seed fixture · use `testing/e2e/declaration-fixture` · or BLOCKED |
| G8 | **Promotion** | Scratch stays non-authoritative until DOC-001 mission | Keep scratch · or later promote excerpts into GUIDE-018 / runbook only with Docs-lane approval |
| G9 | **I6.2+ evidence work** | GUIDE-018 Phase I6 WAIT — this HITL must not close I6 | Keep Ops I6.2 as separate Docs/Test mission |

---

## Anti-claims (binding for this scratch)

- Do **not** mark GUIDE-018 **I6** complete or [GUIDE-017](../../guides/GUIDE-017-enterprise-quality-evidence-standard.md) READY from this ledger.
- Do **not** invent Neon **N19** or reopen FFT **2B–2D**.
- Do **not** treat UNEVALUATED rows as PASS.
- Do **not** restore Collapse trees or invent routes/APIs/permissions/env keys absent from disk / `@afenda/env`.
- Do **not** claim multi-DB isolation — hard `organization_id` filters only (ARCH-023).

---

## Authority pointers

| Need | Link |
|------|------|
| Program map | [GUIDE-018](../../guides/GUIDE-018-fullstack-e2e-integration-program.md) § I2–I5 (product writes · shells · hardening) |
| Auth / post-login | [ARCH-026](../../architecture/ARCH-026-auth-session.md) · `packages/auth/src/post-login.ts` |
| Tenancy lock | [ARCH-023](../../architecture/ARCH-023-multi-tenancy.md) |
| FE surface IDs | [9-neon-auth-fe-surface-compose-map.md](../neon-auth-optimisation/9-neon-auth-fe-surface-compose-map.md) FE-11…FE-15 |
| Pre-Login companion | [1-pre-login-hitl.md](1-pre-login-hitl.md) |
| Slice skill | [afenda-elite-implementation-slices](../../../.cursor/skills/afenda-elite-implementation-slices/SKILL.md) |
| Test factory | [testing/README.md](../../../testing/README.md) · adverse A2–A11 · journeys |
| FFT freeze | [FFT-MOD-008](../../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |

## Change log

| Date | Summary |
|------|---------|
| 2026-07-17 | Initial Post-Login HITL scratch — four layers, disk-mapped FE-11…FE-15 + writes, UNEVALUATED evidence grid, open gaps G1–G9 |
