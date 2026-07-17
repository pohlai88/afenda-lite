# GUIDE-018 Full-Stack End-to-End Integration Program

| Field             | Value      |
| ----------------- | ---------- |
| **ID**            | GUIDE-018  |
| **Category**      | Guide      |
| **Version**       | 1.0.9      |
| **Status**        | Living     |
| **Control State** | Reopened   |
| **Owner**         | Platform   |
| **Updated**       | 2026-07-17 |

**Control-state note:** Reopened by Jack Wee on 2026-07-17 for GUIDE-018 I5.3 repair — correlation DONE evidence. Automatically returns to Closed after successful verification.

---

# 1. Purpose

This guide is the **phase-by-phase development roadmap** for Afenda-Lite after Turborepo scaffold.

**It answers three questions:**

1. What work is already done?
2. What is the next phase, in order?
3. When is a phase finished (exit criteria), and where do the details live?

This guide **sequences** the program. It does **not** replace owning docs for slices, APIs, modules, evidence, or FFT freeze rules. Quality bar: **enterprise production** only ([GUIDE-017](GUIDE-017-enterprise-quality-evidence-standard.md) · [AGENTS.md](../../AGENTS.md)).

**Readers:** platform engineers and agents shipping one mission per chat/PR.

---

# 2. Scope

## 2.1 In scope

- Ordered phases from foundations → scaffold (done) → docs cutover (done) → authenticity → contracts → product verticals → tests → hardening → evidence → continuous control
- Completed [ARCH-028](../architecture/ARCH-028-implementation-slices.md) coding + Checkpoint G (S1.1–S8.2, Checkpoints A–**G**)
- **Phase I1** (identity & edge) — **I1.1–I1.4** closed; **I2.1–I2.4** closed; **I3.1–I3.4** closed (Identity/Platform · Declarations · FFT freeze shell · org-admin cut A; cut B AdminCN **waived**); **I4** closed (verify factory · adverse matrix A1–A11 · standing CI `e2e-smoke`); **I5.1 DONE** (invite-audit attribution residual **BLOCKED**) · **I5.2 DONE** · **I5.3 DONE** · **I5.4 DONE** · **I5.5 DONE** (residuals repaired: `protect:main` + in-CI secrets presence) · **I5.6 DONE**; Phase I5 stays **WAIT** (invite-audit residual); next Ops **I6+**
- Lane discipline, skill routing, and FFT freeze / anti-contamination boundaries
- Pointers to owning authorities (no duplicated SSOT)

## 2.2 Out of scope

- Slice file lists, Acceptance text, and Verify command pastes → [ARCH-028](../architecture/ARCH-028-implementation-slices.md) / [command-sheet](../../.cursor/skills/afenda-elite-implementation-slices/command-sheet.md)
- Module Enterprise Readiness or release READY claims → owning MOD / [GUIDE-017](GUIDE-017-enterprise-quality-evidence-standard.md)
- FFT Phase 2B–2D without explicit reopen → [FFT-MOD-008](../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md)
- New Sales / Purchasing / Inventory / Finance farms before a controlled ARCH-006 ADR
- Parallel product SSOT outside `docs/` (including a root `specs/` tree)
- Fumadocs-as-authority · Portal Atmosphere remount · Storybook product restore · Collapse tree recovery

## 2.3 Who owns what

| Concern | Authority |
| ------- | --------- |
| Docs control | [DOC-001](../_control/DOC-001-documentation-control-standard.md) · [DOC-002](../_control/DOC-002-documentation-register.md) · [DOC-003](../_control/DOC-003-controlled-document-template.md) |
| Scaffold slices | [ARCH-028](../architecture/ARCH-028-implementation-slices.md) |
| Target system shape | [ARCH-022](../architecture/ARCH-022-system-overview.md)…[ARCH-027](../architecture/ARCH-027-env-model.md) |
| Interface / API | [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md) · [GUIDE-015](../api/guides/GUIDE-015-interface-pack-development-roadmap.md) |
| Tenancy / RBAC locks | [ARCH-023](../architecture/ARCH-023-multi-tenancy.md) |
| Module readiness | [MOD-002](../modules/MOD-002-modules-index.md) · owning `*-MOD-009` / `*-MOD-010` |
| Evidence aggregation | [GUIDE-017](GUIDE-017-enterprise-quality-evidence-standard.md) |
| FFT ops freeze | [FFT-MOD-008](../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |
| **Program order** | **This guide** |

## 2.4 How to read status words

| Label | Meaning |
| ----- | ------- |
| **DONE** | Phase coding / gate closed for this checkout. |
| **OPEN** | Next work; do this before later phases. |
| **ON DISK** | Code or config exists; not a runtime/readiness claim. |
| **PARTIAL** | Some of the chain exists; end-to-end proof incomplete. |
| **MISSING** | Required implementation or evidence absent. |
| **FROZEN** | Blocked until owning authority explicitly reopens. |
| **VERIFIED** | Fresh, reproducible evidence bound to revision + environment. |

Formal release decisions use GUIDE-017 states (`PASS`, `FAIL`, `BLOCKED`, `NOT EVIDENCED`, `NOT APPLICABLE`). File presence, a green unit suite, or a successful deploy alone never means `PASS`.

---

# 3. Phase-by-phase roadmap

## 3.1 How to work every phase

| Rule | Do this |
| ---- | ------- |
| Product router | Start with `/using-afenda-elite-skills`; vendor skills are method only |
| One mission | One lane per chat/PR: Docs · Ops · Fix · Test · Normalize |
| Paths | Greenfield under `apps/web/**` and `packages/*` only |
| Env | `@afenda/env` + `.env.local` only |
| Edge gate | Prefer `apps/web/proxy.ts` — do not invent `middleware.ts` as product SSOT |
| Ops verticals | Before coding: Frontend · Backend · Security perspectives (authn/authz/input/output/logging) |
| Exit | Reproducible verify (commands, CI/Deploy, MOD rows, GUIDE-017 fields) — not narrative “done” |
| Method | Clarify → spec → plan → source-driven → implement → TDD → review → simplify → docs → ship |

## 3.2 You are here (2026-07-17)

```text
FOUNDATIONS ████████ DONE
SCAFFOLD     ████████ DONE  (ARCH-028 S1–S8 · Checkpoints A–F)
CHECKPOINT G ████████ DONE  (Docs: ARCH-022…028 Living · retirement reviewed)
I1           ████████ DONE  ← I1.1–I1.4 closed
I2           ████████ DONE  ← I2.1–I2.4 closed (OpenAPI / REST honesty)
I3           ████████ DONE  ← I3.1–I3.4 closed (cut A; cut B AdminCN waived)
I4           ████████ DONE  ← adverse matrix A1–A11 · standing CI e2e-smoke
I5           ░░░░░░░░ WAIT  ← I5.1–I5.6 stage DONE · invite-audit residual named
I6–I7        ░░░░░░░░ WAIT
REOPEN (R*)  ░░░░░░░░ optional · explicit written approval only
```

**Plain-English baseline:** packages, routes, CI, Deploy, the edge session gate (`apps/web/proxy.ts`), public Neon Auth UI (`/auth/login` · forgot · reset · sign-up), `/join?invitationId=…`, fail-closed role shells (`requireRole` → `/403`), shared `ActionResult` / `APIErrorBody` contracts, the feature → domain → `@afenda/db` import boundary (Vitest-enforced), authenticated tenant writes (invite + platform role assign/revoke → `platform_rbac_audit` hard `organization_id`), Tier-2 `hasPermission` product wiring (`org.roles.manage` · `clients.invite` + admin bootstrap), CAPABLE org-admin assign/revoke UI with Neon member-directory Combobox (**I3.4 cut A DONE**), shared operator platform shell (`OperatorPlatformShell`), Declarations list → draft → submit → read under hard tenancy (Neon **N17** APPROVED), FFT Phase 2A list-only operator shell (Neon **N18** APPROVED · 2B–2D frozen), authenticated E2E factory under `testing/e2e` + `e2e/smoke` · `e2e/journey` (Neon **N13** APPROVED) with adverse/recovery matrix **A1–A11** and standing CI job `e2e-smoke`, OpenAPI api-now honesty, **I5.1** isolation/secrets/safe-error closed (invite-audit attribution residual **BLOCKED**), **I5.2** restore/RPO(snapshot)/RTO(ephemeral) + migrate fail-closed (RB-001 §3.7), **I5.3** alert→runbook (BLOCKED on correlation), **I5.4** declared UX/a11y/i18n/perf criteria matrix with owners, **I5.5** Deploy-after-CI order + CI DB/factory fail-closed (no silent skip), and **I5.6** accidental-complexity cuts (behavior unchanged) exist on disk; Turborepo ARCH pack is **Living**. Remaining: I5.3 unblock = correlation later; invite-audit durable attribution repair; FE CWV numeric budgets still NOT EVIDENCED until owning authority adopts numbers; branch-protection automation residual; I6 evidence/decision, I7 continuous control. AdminCN / Studio polish remains optional later Studio DNA / `ui-compose` when Approved (out of I3.4 exit). See §3.6 for the gap summary.

**Standing honesty:**

1. Many root `package.json` script names still route through `scripts/collapse-script-unavailable.mjs`. Those names are **inventory, not live controls**, until an Approved forward slice replaces them.
2. ARCH-028 coding order is closed — do not invent S9; sequence new work with this guide.

## 3.3 Roadmap at a glance

| Phase | Name | Status | Lane | One-line goal |
| ----- | ---- | ------ | ---- | ------------- |
| **F** | Foundations | DONE | Docs | Living docs control + Target architecture + locks |
| **S** | Turborepo scaffold | DONE | Ops | Packages, `apps/web`, CI, Deploy (ARCH-028) |
| **G** | Docs cutover | **DONE** | Docs | Target→Living + retirement reviewed |
| **I1** | Identity & edge | **DONE** | Ops | Session gate, `/auth/*`, `/join`, fail-closed roles |
| **I2** | Interface / BFF | **DONE** | Ops | ActionResult, module boundaries, first write, OpenAPI honesty |
| **I3** | Product verticals | **DONE** (I3.1–I3.4; cut B AdminCN waived) | Ops | Identity · Declarations · FFT read (freeze) · org-admin cut A |
| **I4** | Verification factory | **DONE** | Test | Unit → contract → real E2E smoke · adverse/recovery matrix A1–A11 · standing CI `e2e-smoke` |
| **I5** | Hardening | WAIT (I5.1–I5.6 stage DONE · invite-audit residual **BLOCKED**) | Ops/Test | Security · recovery · obs · a11y/i18n · CI depth |
| **I6** | Evidence & decision | WAIT | Docs/Test | MOD ledgers + GUIDE-017 claim before READY |
| **I7** | Continuous control | WAIT | Normalize/Docs | Integrity · housekeeping · deprecation |
| **R** | Optional reopen | WAIT | Program | FFT 2B–2D or new context — approval required |

Recommended mission queue: **I6** (then I7). **I5.1–I5.6** stage **DONE** (invite-audit attribution residual **BLOCKED**). Do **not** invent Neon **N19**. AdminCN / Studio polish is optional later — not I3.4-blocking.

---

## Phase F — Foundations

| | |
| --- | --- |
| **Status** | DONE (assumed before scaffold) |
| **Lane** | Docs |
| **Goal** | Documentation system and architecture locks exist so coding is unlocked under ARCH-028 rules |

| Stage | Outcome |
| ----- | ------- |
| **F0** | DOC-001…003 Living; authoritative docs only under `docs/` |
| **F1** | ARCH-022…027 Target pack (overview, tenancy, packages, data, auth, env) |
| **F2** | ARCH-023 Decision lock; ARCH-028 anti-contamination; deprecation register binding |

**Exit:** ARCH-028 preconditions satisfied (already true on this checkout).  
**Detail:** DOC / ARCH pack — not re-specified here.

---

## Phase S — Turborepo scaffold (ARCH-028)

| | |
| --- | --- |
| **Status** | DONE (coding closed) |
| **Lane** | Ops (historical) |
| **Goal** | Target monorepo on disk: shared packages, `apps/web` route groups/modules/features, CI + Deploy |

| Stage | Scope | Checkpoint |
| ----- | ----- | ---------- |
| **S1** | Workspace · Turbo · `packages/config` | **A** closed |
| **S2** | `packages/db` (`organization_id`, `withOrg`, migrate ban) | **B** closed |
| **S3** | `packages/auth` (session, RBAC, invitations) | **C** closed |
| **S4** | `packages/env` (`.env.local` only) | **D** closed |
| **S5** | `packages/ui` | **E** closed |
| **S6** | `packages/emails` | — |
| **S7** | `apps/web` scaffold · routes · modules · features | **F** closed |
| **S8** | Target CI + Deploy workflows | coding complete |

**Exit:** Checkpoints A–F closed. **Checkpoint G is not part of S close.**  
**Detail + verify evidence:** [ARCH-028](../architecture/ARCH-028-implementation-slices.md). Do not invent “S9” inside ARCH-028; post-scaffold work is sequenced here.

---

## Phase G — Checkpoint G (docs cutover)

| | |
| --- | --- |
| **Status** | **DONE** (2026-07-15) |
| **Lane** | Docs only |
| **Goal** | Make Living docs match the shipped Turborepo reality; retire obsolete maps honestly |

| Stage | Outcome | Farms |
| ----- | ------- | ----- |
| **G1** | Confirm disk matches ARCH-022 Target tree | `afenda-elite-doc-integrity` |
| **G2** | ARCH-022…028 Status Target → Living where earned | `afenda-elite-doc-control` |
| **G3** | Post-ship retirement review (folder-map ARCH / retired GUIDE disposition) | doc-control · deprecation |
| **G4** | `AGENTS.md` aligned to Living Turborepo + FFT freeze honesty | documentation-and-adrs |

**Exit (met):** ARCH-028 Checkpoint G checkboxes closed; ARCH-022/024/025/026/027/028 Living in DOC-002; no product code in the Docs mission.

---

## Phase I1 — Identity and edge authenticity

| | |
| --- | --- |
| **Status** | **DONE** — I1.1–I1.4 closed 2026-07-15 |
| **Lane** | Ops + Guardian |
| **Goal** | Real session lifecycle at the edge and public auth surfaces; shells stay fail-closed |

| Stage | Build this | Guardian focus | Stage status |
| ----- | ---------- | -------------- | ------------ |
| **I1.1** | Greenfield `apps/web/proxy.ts` edge session gate | Backend + Security | **DONE** 2026-07-15 |
| **I1.2** | Public `/auth/*` (Neon Auth: login · forgot · reset) | Frontend + Security | **DONE** 2026-07-15 |
| **I1.3** | `/join?invitationId=…` + operator invite via `@afenda/auth` | Full stack + authz | **DONE** 2026-07-15 |
| **I1.4** | Role shells: unauth → login; wrong role → `/403` | Authz | **DONE** 2026-07-15 |

**Farms:** `afenda-elite-nextjs-best-practice` · `neon-tenancy-efficiency` · `afenda-elite-frontend-scaffold`  
**Exit (met):** Anonymous, wrong-role, and happy-path session journeys have reproducible evidence (not package presence alone).

### Implement evidence — I1.1 (2026-07-15)

| Field | Evidence |
| ----- | -------- |
| Paths | `apps/web/proxy.ts` · `apps/web/session-gate-policy.ts` · `packages/auth/src/proxy.ts` (`createSessionProxy`, `AUTH_LOGIN_PATH`) · export via `packages/auth/src/index.ts` |
| Matcher | `/account/*` · `/dashboard/*` · `/admin/*` · `/client/*` · `/fft/*` · `/playground/*` (ARCH-012 + Living `/admin`) |
| Bypasses | `POST`+`next-action` only · `?embed=1` · `/client/login` · `/client/preview-unavailable` |
| Verify | `pnpm --filter @afenda/auth typecheck` · `pnpm --filter @afenda/web typecheck` · `pnpm --filter @afenda/web test -- session-gate-policy` — green |
| Redirect | Unauth `GET /fft` · `/admin` · `/client/dashboard` → **307** `Location: /auth/login`; public `GET /` → **200** |
| Boundary | Neon SDK only inside `@afenda/auth`; no product `middleware.ts` |

### Implement evidence — I1.2 (2026-07-15)

| Field | Evidence |
| ----- | -------- |
| Paths | `apps/web/app/(public)/auth/[path]/page.tsx` · `auth/layout.tsx` · `features/auth/{auth-ui-provider,auth-view-shell}.tsx` · `apps/web/app/api/auth/[...path]/route.ts` · `@afenda/auth` `createAuthApiHandlers` · `getBrowserAuthClient` (`/client`) · `AFENDA_AUTH_VIEW_PATHS` (`SIGN_IN=login`) |
| Routes | `GET /auth/login` · `/auth/forgot-password` · `/auth/reset-password` → **200** (Neon Auth UI forms); `/auth/sign-in` → **404** (Afenda path is `login`) |
| Verify | `pnpm --filter @afenda/auth typecheck` · `pnpm --filter @afenda/auth test` · `pnpm --filter @afenda/web typecheck` — green; Biome clean on new auth trees |
| Gate | Unauth `GET /fft` · `/admin` → **307** `Location: /auth/login` |
| Boundary | Neon SDK (`createNeonAuth` / `createAuthClient` / handler) only in `@afenda/auth`; UI via `@neondatabase/auth-ui`; Neon Auth delivers mail via **Zoho SMTP** (console `email_provider`) — no app-side SMTP |
| Gap close | `resolveAuthUiOrigin` (request host for reset `baseURL`) · `AUTH_LOGIN_PATH` SSOT · `/auth/sign-out` · auth island `auth-surface.css` · segment `loading`/`error` · typed `AuthUiLink` |

### Implement evidence — I1.3 (2026-07-15)

| Field | Evidence |
| ----- | -------- |
| Paths | `apps/web/app/(public)/join/{page,layout,loading,error}.tsx` · `features/auth/{join-shell,auth-island-layout,auth-surface-chrome}.tsx` · `apps/web/app/actions/invite-org-member.ts` · `features/org-admin/{invite-member-form,org-admin-shell}.tsx` · `modules/identity/domain/invite-org-member.ts` · `@afenda/auth` `JOIN_PATH` · `buildJoinUrl` · `buildInviteJoinUrl` · `requireAppOrigin` · `inviteOrgMember` (Origin = `APP_URL`) |
| Routes | `GET /join` (no id) → **200** invitation-required; `GET /join?invitationId=…` → **200** Neon `AcceptInvitationCard`; Neon mail `/auth/accept-invitation?invitationId=` → **308** `/join?invitationId=` (`apps/web/next.config.ts` redirects) |
| Operator invite | Authenticated `/admin` form → `inviteOrgMemberAction` → `requireRole('operator')` + `canInviteMember` → `inviteOrgMember` (session `orgId`; Origin = `APP_URL`) |
| Verify | `pnpm --filter @afenda/auth typecheck` · `pnpm --filter @afenda/auth test` (22) · `pnpm --filter @afenda/web typecheck` · lint · `pnpm --filter @afenda/web test -- invite-org-member` — green; local route probe without secrets in repo |
| Boundary | SDK stay in `@afenda/auth`; UI via `@neondatabase/auth-ui`; invitee `signUp` enabled on auth island; invite mail via Neon Auth Zoho SMTP — no app-side SMTP |
| Gap close | Neon↔session role SSOT (`toSessionRole`/`toNeonOrgRole`) · `canInviteMember` / `inviteableRolesFor` · stable invite errors (no Neon body leak) · join-path copy via `JOIN_PATH` · `invitations` unit tests · adapter-map disk honesty |

### Implement evidence — I1.4 (2026-07-15)

| Field | Evidence |
| ----- | -------- |
| Paths | `@afenda/auth` `AUTH_FORBIDDEN_PATH` · `requireRole` (`packages/auth/src/rbac.ts`) · `apps/web/app/(operator)/layout.tsx` (`requireRole('operator')`) · `apps/web/app/(client)/client/(workspace)/layout.tsx` (`requireRole('client')`) · `apps/web/app/(public)/403/page.tsx` (`ForbiddenShell`) |
| Behavior | Unauthenticated protected nav → `/auth/login` (proxy + `getSession`); authenticated insufficient role → `AUTH_FORBIDDEN_PATH` (`/403`); admin satisfies operator shell; client exclusive |
| Verify | `pnpm --filter @afenda/auth typecheck` · `pnpm --filter @afenda/auth test` (28) · `pnpm --filter @afenda/web typecheck` · `pnpm --filter @afenda/web test -- role-shells` — green; Biome clean on touched files |
| Route probe | Anonymous `GET /admin` · `/fft` · `/client/dashboard` → **307** `Location: /auth/login`; `GET /403` · `/auth/login` · `/` → **200** |
| Wrong-role | `requireRole` unit matrix: client↛operator · operator↛client · operator↛admin → redirect `/403`; admin→operator + matching roles return session |
| Boundary | Coarse shell only — ARCH-023 `hasPermission` / Tier-2 codes remain later; no FFT 2B–2D |

## Phase I2 — Interface / BFF spine

| | |
| --- | --- |
| **Status** | **DONE** — **I2.1–I2.4** closed 2026-07-15 |
| **Lane** | Ops + Guardian |
| **Goal** | Stable ActionResult/error contracts and the first authenticated write path |

| Stage | Build this | Stage status |
| ----- | ---------- | ------------ |
| **I2.1** | ActionResult / shared error brands on Target paths | **DONE** 2026-07-15 |
| **I2.2** | Enforce feature → domain → `@afenda/db` (features never import db) | **DONE** 2026-07-15 |
| **I2.3** | First authenticated **write** vertical (prefer Identity invite or Declarations — not FFT 2B) | **DONE** 2026-07-15 |
| **I2.4** | OpenAPI / REST sync honesty (`check:openapi` · integrity) | **DONE** 2026-07-15 |

**Farms:** `afenda-elite-api-contract` · `afenda-elite-backend-modules`  
**Authority:** ARCH-029 · GUIDE-015 · API/REST/OPEN pack  
**Exit:** One write vertical works end-to-end under tenancy + contract checks.

### Implement evidence — I2.1 (2026-07-15)

| Field | Evidence |
| ----- | -------- |
| Paths | `apps/web/modules/platform/schemas/{common,api-error,action-result}.ts` · `apps/web/modules/identity/schemas/invite-org-member.ts` · `apps/web/app/actions/invite-org-member.ts` → `ActionResult` · `features/org-admin/invite-member-form.tsx` |
| Contract | `ActionResult<T>` · `actionOk` / `actionFail` · `ApiErrorCode` / `APIErrorBody` · `apiData` / `healthJson` · `parseSchema` (API-002 · API-003 · API-004) |
| Adapter | Invite action maps expected failures to `VALIDATION_ERROR` · `FORBIDDEN` · `INTERNAL_ERROR`; success `{ ok: true, data: { email } }` |
| Verify | `pnpm --filter @afenda/web typecheck` · `pnpm --filter @afenda/web test -- action-result-contract invite-org-member` (8) — green; Biome clean on touched trees |
| Boundary | Schemas under Target `modules/*/schemas`; invite Zod SSOT moved to Identity schemas; no throw-TODO / shim paths |
| Side fix | `packages/design-system/.../accordion.tsx` `cn` import → relative (unblocks web typecheck via playground re-export) |

### Implement evidence — I2.2 (2026-07-15)

| Field | Evidence |
| ----- | -------- |
| Paths | Feature shells → domain ports only: `features/{declarations,fft,org-admin}/*-shell.tsx` → `modules/{declarations,fft,identity,platform}/domain/*`; SQL only in domain via `@afenda/db` `withOrg` |
| Gate | `apps/web/__tests__/feature-db-boundary.test.ts` — features + `app/actions` ban `@afenda/db` / `packages/db` deep imports; non-domain `modules/**` also banned |
| Disk | Features: zero `from "@afenda/db"` imports (comments only). Domain: `list-client-assignments` · `list-events` · `list-org-roles` · `list-role-assignments` · `list-rbac-audit` |
| Verify | `pnpm --filter @afenda/web test -- feature-db-boundary` (4) · `pnpm --filter @afenda/web typecheck` — green; Biome clean on gate file |
| Boundary | ARCH-013 · ARCH-024 · backend-modules: feature → domain → `@afenda/db`; adapters stay SQL-free |

### Implement evidence — I2.3 (2026-07-15)

| Field | Evidence |
| ----- | -------- |
| Paths | `apps/web/modules/platform/domain/record-rbac-audit.ts` (`recordRbacAudit` · `deleteRbacAuditRow`) · `apps/web/app/actions/invite-org-member.ts` → Neon Auth invite + audit write · `features/org-admin/invite-member-form.tsx` surfaces `auditId` |
| Write | Inserts `platform_rbac_audit` with explicit `organization_id` from session (never ambient / soft NULL); wrong-org delete returns null |
| Adapter | ARCH-029 §3.3: `requireRole` · Zod · `canInviteMember` · `inviteOrgMember(orgId)` · `recordRbacAudit` · `revalidatePath('/admin')` · `ActionResult` |
| Verify | `pnpm --filter @afenda/web test -- record-rbac-audit feature-db-boundary invite-org-member action-result-contract` (15) · `pnpm --filter @afenda/web typecheck` — green; Neon fixture orgs cleaned (MCP empty) |
| Boundary | Feature/action still SQL-free; SQL only in Platform domain; `@afenda/db` re-exports `and` / `eq` / `sql` for domain predicates |
| Forbidden | No FFT 2B–2D; no baseline migrate |
| Out-of-bar (disposed) | Authenticated browser invite E2E → **I4** verify factory (not I2.3 exit). Tier-2 `clients.invite` / `hasPermission` → **I3.1** (I2.3 uses `requireRole` + `canInviteMember` only). Historical Change Log “next I2.3” rows = dated history, not Living next-pointer. |

### Implement evidence — I2.4 (2026-07-15)

| Field | Evidence |
| ----- | -------- |
| Paths | `apps/web/app/api/health/{liveness,readiness}/route.ts` · `apps/web/app/api/client/declaration-draft/route.ts` · `modules/platform/{domain/health,api/json-response,schemas/{health,openapi-zod}}` · `modules/declarations/{schemas/{common,client},domain/declaration-draft,api/client-declaration-draft-route}` · `@afenda/auth` `getApiSession` |
| Honesty | `scripts/check-openapi.mjs` asserts every `x-afenda-status: api-now` path has matching `apps/web/app/api/**/route.ts`; regenerated `OPEN-001-openapi.yaml` from module Zod SSOT |
| Contract | Health `{ data }` envelopes · draft GET/PUT/PATCH/POST · bare `APIErrorBody`; draft gate = client session + onboarding + hard org + email owner |
| Verify | `pnpm check:openapi` — ok (6 ops, api-now handlers on disk) · `pnpm --filter @afenda/web test -- openapi-api-now-disk openapi-contract-schemas action-result-contract feature-db-boundary` (13) · `@afenda/auth` `api-session` (2) · typecheck auth/web/db — green |
| Boundary | Adapters SQL-free; SQL in Platform/Declarations domain only; generator imports module schemas via `openapi-zod` |
| Forbidden | No FFT 2B–2D; Neon Auth `/api/auth/*` still excluded from YAML |

---

## Phase I3 — Product verticals

| | |
| --- | --- |
| **Status** | **DONE** — I3.1–I3.4 closed 2026-07-17 (cut B AdminCN waived) |
| **Lane** | Ops (+ readiness) |
| **Goal** | Complete allowed product paths inside the FFT freeze envelope |

| Stage | Outcome | Boundary | Status |
| ----- | ------- | -------- | ------ |
| **I3.1** Identity / Platform | Roles · assignments · RBAC audit beyond list ports | Platform / MOD | **DONE** 2026-07-17 (Neon **N11**) |
| **I3.2** Declarations | Client list → submit/read under hard tenancy | Declarations MOD | **DONE** 2026-07-17 (Neon **N17**) |
| **I3.3** FFT (frozen) | Operator read shell + Phase 2A RBAC only | FFT-MOD-008 Allowed/Forbidden | **DONE** 2026-07-17 (Neon **N18**) |
| **I3.4** Org-admin shell | Cut A member-directory Combobox CAPABLE; cut B AdminCN polish **waived** | N16 shell + cut A ON DISK | **DONE** 2026-07-17 (cut A; cut B waived) |

**Farms:** `afenda-elite-backend-modules` · `afenda-elite-module-readiness` · `feed-farm-trade` (boundary only unless reopen)  
**Exit:** Verticals under freeze have module-evidence rows for what they claim; no 2B–2D domain reopen.

### Implement evidence — I3.1 (2026-07-17)

| Field | Evidence |
| ----- | -------- |
| Paths | Identity: `modules/identity/domain/{list-assignable-roles,has-permission,assign-org-role,revoke-org-role}.ts` · schemas `{assign,revoke}-org-role.ts` · Actions `app/actions/{assign,revoke}-org-role.ts` · invite deepened with `clients.invite` · Platform `recordRbacAudit` + `role.assign` / `role.revoke` · org-admin `assign-org-role-form.tsx` · CAPABLE panels/shell |
| AuthZ | Tier-2 `hasPermission` via active assignment → `platform_role_permission`; admin bootstrap only when actor has zero active org assignments (ARCH-023 §3.2 #2) |
| Assign | System templates ∪ org-scoped roles; hard `organization_id` stamp; CONFLICT when already active; idempotent reactivate |
| Revoke | Soft `active=false` with `id` + `organization_id` match; wrong-org / inactive → NOT_FOUND |
| UI | Org-admin LIST_ONLY lifted for assign/revoke; Neon `userId` field at I3.1 close (member-directory landed later as **I3.4 cut A**); role names resolved from assignable catalog |
| Verify | `pnpm --filter @afenda/web test -- assign-org-role revoke-org-role has-permission invite-org-member record-rbac-audit` (18) · `pnpm --filter @afenda/web typecheck` · `pnpm exec turbo run lint typecheck test --filter=@afenda/web --filter=@afenda/auth --filter=@afenda/db` (9/9) — green 2026-07-17 |
| Boundary | Adapters SQL-free; SQL in Identity/Platform domain; `@afenda/db` re-exports `and` / `eq` / `isNull` / `or` / `sql` |
| Evidence home | GUIDE-018 (no Identity/Platform `*-MOD-009` packs yet) · adapter-map assign/revoke **yes** |
| Forbidden | No FFT 2B–2D; no baseline migrate; no Collapse recover |
| Out-of-bar | Authenticated browser assign/invite E2E → **I4**; Neon member-directory picker → **I3.4 cut A** (closed); AdminCN polish → **cut B waived** (out of I3.4 exit); Declarations → **I3.2** (closed) |

### Implement evidence — I3.2 (2026-07-17)

| Field | Evidence |
| ----- | -------- |
| Paths | Domain `modules/declarations/domain/{list-client-assignments,declaration-draft,submit-client-declaration,get-client-declaration,assignment-status}.ts` · Actions `app/actions/declaration-draft.ts` · API `app/api/client/declaration-draft/route.ts` · Features `features/declarations/{declarations-shell,declarations-panel,declaration-draft-sheet,submit-declaration-form,declaration-detail-shell}.tsx` · Routes `/client/declarations` · `/client/declarations/[assignmentId]` |
| Behavior | Client list → draft → submit → confirmation read under hard `organization_id` + email owner; idempotent re-submit |
| Neon | **N17** APPROVED 100% (independent audit 2026-07-17 · Path-to-100% closed); Living Declarations MOD promotion = later Docs-lane |
| Verify | `e2e/journey/declarations-submit-read.spec.ts` (N13 factory) · Neon slice-map floor verify for N17 — green at APPROVED |
| Boundary | Feature/action SQL-free; SQL in Declarations domain via `@afenda/db`; no FFT 2B–2D |
| Forbidden | No baseline migrate; no Collapse recover; do not invent **N19** |

### Implement evidence — I3.3 (2026-07-17)

| Field | Evidence |
| ----- | -------- |
| Paths | `modules/fft/domain/list-events.ts` · `modules/fft/auth/require-fft-access.ts` · `features/fft/{fft-events-shell,fft-events-panel}.tsx` · `features/portal-chrome/operator-platform-shell.tsx` · `app/(operator)/fft/{layout,page}.tsx` |
| Behavior | Operator FFT list-only shell + Phase 2A `fft.access` gate; hard tenancy via `withOrg` |
| Neon | **N18** APPROVED 100% (independent audit 2026-07-17 · Path-to-100% closed); Living FFT MOD evidence promotion = later Docs-lane |
| Verify | `e2e/smoke/fft-permitted-vertical.spec.ts` · Neon slice-map floor verify for N18 — green at APPROVED |
| Boundary | FFT-MOD-008 Allowed/Forbidden; **2B–2D remain FROZEN** until program reopen |
| Forbidden | No deep `/fft/*` commercial UX; no Collapse recover; do not invent **N19** |

### Implement evidence — I3.4 (2026-07-17)

| Field | Evidence |
| ----- | -------- |
| Cut A (exit) | Neon member directory → CAPABLE assign Combobox; no raw Neon `userId` paste when members load |
| Paths | Domain `modules/identity/domain/organization-users.ts` (`listOrganizationUsers` → `@afenda/auth` `listOrgMembers`) · Features `features/org-admin/{org-admin-shell,assign-org-role-form,org-admin-panels}.tsx` · Neon **N16** `OperatorPlatformShell` · invite/assign/revoke from I3.1/N11 · `e2e/smoke/operator-platform-shell.spec.ts` |
| Behavior | Operator `/admin` loads org members into UI-CAP-07 Combobox; empty / unavailable directory Alerts; role names from assignable catalog; invite · assign · revoke · audit View Dialog remain CAPABLE |
| Verify | `pnpm --filter @afenda/web test -- organization-users org-admin-shell assign-org-role-form org-admin-panels` — green 2026-07-17 (2 files / 7 tests in web project filter) |
| Cut B waiver | **Waived this chat (2026-07-17):** AdminCN / Studio polish is **out of GUIDE-018 I3.4 exit**. I3.4 closes on **cut A only**. AdminCN remains optional later Studio DNA / `ui-compose` when Approved — not I3.4-blocking. |
| Boundary | Feature/action SQL-free; membership via `@afenda/auth` in Identity domain; UI via `@afenda/ui-system` barrel only |
| Forbidden | No AdminCN product promote in this close; no FFT 2B–2D; do not invent **N19** |
| Next Ops | **I5** (I4 DONE) |

---




## Phase I4 — Verification factory

| | |
| --- | --- |
| **Status** | **DONE** 2026-07-17 |
| **Lane** | Test |
| **Goal** | Forward-owned test factory that proves the browser → tenant → domain → recovery chain |

| Layer | Minimum proof |
| ----- | ------------- |
| Static | Lint, typecheck, boundaries, docs, OpenAPI, env/config drift |
| Unit | Domain rules, schemas, roles/permissions, safe errors, pure UI utils |
| Component | Forms, pending/error, keyboard/focus, locale where used |
| Contract | ActionResult/HTTP schemas, status mapping, idempotency, adapters |
| DB integration | Two-org isolation, transactions, constraints, concurrency, migration drift |
| Browser | Anonymous/admin/operator/client positive **and** denial; invite/join; one write + recovery |
| Non-functional | Security, a11y, performance, resilience, obs, restore, deploy smoke — as phases require |

**Factory rules (short):**

- Own `testing/e2e/*` and tracked `e2e/` specs forward — never recover Collapse trees
- Unique orgs/users per worker; no production credentials or shared mutable fixtures
- Prove cross-tenant denial with two real test orgs (not mocks alone)
- Failure-only artifacts; sanitize; no permanent quarantine as evidence for `PASS`

**Exit (closed):** positive, denial, failure, and recovery proof at the right layers — inventory [`testing/e2e/adverse-matrix.ts`](../../testing/e2e/adverse-matrix.ts) **A1–A11**.

```text
browser / device / assistive tech
  → route + UI state
  → session + active organization
  → validated input
  → permission + ownership + tenant decision
  → domain use case
  → org-scoped write + concurrency
  → stable success/error contract
  → audit + log + metric + trace
  → cache / email / external side effect
  → user-visible success, failure, or recovery
  → tests + runbook + rollback/forward-fix evidence
```

Required adverse cases (evidenced): anonymous, wrong role/permission/org, invalid/stale input, duplicate submit, concurrent mutation, dependency throw → safe error, partial failure/locked write, and safe recovery.

### Implement evidence — I4 (2026-07-17)

| Field | Evidence |
| ----- | -------- |
| Paths | `testing/e2e/{adverse-matrix,assertions,credentials,declaration-fixture,env,flows,neon-sql,playwright-base,tenancy}.ts` · `e2e/smoke/*` · `e2e/journey/*` · `playwright.config.ts` · `.github/workflows/ci.yml` job `e2e-smoke` |
| Matrix | **A1–A6** browser · **A7–A9** unit+journey · **A10** concurrent unit · **A11** `INTERNAL_ERROR` action unit — see `testing/README.md` |
| Standing CI | `e2e-smoke` on `main` after `quality`; `E2E_REQUIRE_FACTORY=1` fail-closed; owner **Platform** for factory password secrets |
| Verify | `pnpm --filter @afenda/web test -- submit-client-declaration-action declaration-submit-read` · `pnpm test:e2e:adverse` · journey `declarations-adverse-recovery` + `declarations-draft-recovery` — green 2026-07-17 |
| Forbidden | No Collapse recover · no permanent skip-as-PASS · do not invent **N19** |
| Out-of-bar | I5 hardening (threat model · telemetry · budgets · restore) · GUIDE-017 READY claims |

---

## Phase I5 — Enterprise hardening

| | |
| --- | --- |
| **Status** | WAIT (**I5.1 · I5.2 · I5.4–I5.6 DONE** · **I5.3 BLOCKED**; named residuals before READY claims) |
| **Lane** | Ops / Test |
| **Goal** | Close non-negotiable production risks GUIDE-017 will reject |

| Stage | Focus | Exit (plain) | Status |
| ----- | ----- | ------------ | ------ |
| **I5.1** | Security · identity · privacy · audit | No open non-waivable isolation, secret, corruption, or unsafe-error condition | **DONE** 2026-07-17 (invite-audit attribution residual **BLOCKED**) |
| **I5.2** | Data change · resilience · backup/restore | Restore/RPO/RTO demonstrated; irreversible/unvalidated paths block release | **DONE** 2026-07-17 |
| **I5.3** | Observability · supportability | Critical paths correlatable; alerts map to runbooks | **BLOCKED** 2026-07-17 (alert half closed; correlation blockers named) |
| **I5.4** | UX · a11y · i18n · performance | Declared states and budgets measured with owners | **DONE** 2026-07-17 (A11Y03 · PERF01 residuals closed 2026-07-17) |
| **I5.5** | CI · supply chain · migration · release automation | Merge/deploy gates ordered and honest (no silent skip) | **DONE** 2026-07-17 (residuals repaired 2026-07-17: `protect:main` + in-CI secrets presence) |
| **I5.6** | Simplification | Complexity reduced without behavior change after evidence exists | **DONE** 2026-07-17 |

**Do not invent thresholds here.** Adopt CWV / latency / capacity numbers in an owning authority with workload, environment, percentile, regression trigger, and owner — then treat them as PASS criteria.

**Baseline migrate ban stays:** `0000` living-roots SQL is a schema reference, not a production migration.

**Detail checklist:** [GUIDE-017](GUIDE-017-enterprise-quality-evidence-standard.md) (this phase only sequences where that work sits).

### Implement evidence — I5.1 (2026-07-17)

| Field | Evidence |
| ----- | -------- |
| Stage | **DONE** (phase I5 remains WAIT until I5.5–I5.6 close; I5.3 stays BLOCKED until correlation unblocked) |
| Authority | [GUIDE-017](GUIDE-017-enterprise-quality-evidence-standard.md) §3.5 non-waivable · [ARCH-023](../architecture/ARCH-023-multi-tenancy.md) |
| Cut ledger | Product `"use server"` Actions: `assign-org-role` · `revoke-org-role` · `invite-org-member` · `declaration-draft` · `submit-client-declaration` (+ shared `permission-gate`) — inventory gate `apps/web/__tests__/i51-security-cut-ledger.test.ts` |
| Isolation | **Closed** — orgB cannot get/draft/save/submit orgA assignment by id (`tenancy-isolation` case `I5.1: orgB cannot get/draft/save/submit orgA assignment by id` + `declaration-submit-read` orgB draft/get/submit denials); list/FFT/`withOrg` two-org denial retained; shared-schema / no RLS = ARCH-023 R3 residual (app filters evidenced, not FAIL) |
| Secrets | **Closed** — `@afenda/env` `client: {}` · no `NEXT_PUBLIC_*` product secrets · `pnpm audit:github-actions-secrets` PASS · `pnpm validate:neon-env` 14/14 · `pnpm audit:tenancy-nulls` PASS · `pnpm check:tenancy-residue` PASS |
| Corruption | **Closed** for assign/revoke (Neon HTTP transaction + audit) and declaration submit race/lock (A10); FFT writes frozen |
| Unsafe errors | **Closed** — bare `catch` → fixed `INTERNAL_ERROR` on all product Actions; N12/A11 leak tests; cut-ledger inventory gate |
| Privileged attribution | Assign/revoke **closed** (actor·org·time on `platform_rbac_audit`). **Invite residual BLOCKED**: Neon Auth invite is cross-system — invite can succeed without durable audit after one retry; compensating safe Action copy retained; do not fake transactional close |
| Verify | See paste below — green 2026-07-17 |
| Forbidden | No fake PASS on invite-audit · no RLS reopen · no **N19** · no GUIDE-017 READY · no I5.5+ sneak-in |
| Next Ops | **I5.5** then **I5.6**; Phase I5 remains **WAIT** |

**Verify paste (2026-07-17 repair — by-id isolation + cut-ledger):**

```text
pnpm audit:tenancy-nulls
# PASS — zero nulls on eight hard tenant roots

pnpm check:tenancy-residue
# PASS — scanned 346 files, no soft dual-mode residue

pnpm validate:neon-env
# Result: 14 passed, 0 failed

pnpm audit:github-actions-secrets
# Result: PASS — all required secret and variable names present.

pnpm --filter @afenda/web test -- tenancy-isolation n12- n14- adverse-matrix safe-error submit-client-declaration-action declaration-submit-read i51-security-cut-ledger
# Test Files  9 passed (9) · Tests  49 passed (49)

# PowerShell: $env:PLAYWRIGHT_REUSE_SERVER='1'; pnpm test:e2e:adverse
PLAYWRIGHT_REUSE_SERVER=1 pnpm test:e2e:adverse
# 10 passed (smoke A1–A4 subset)
```

### Implement evidence — I5.2 (2026-07-17)

| Field | Evidence |
| ----- | -------- |
| Stage | **DONE** (phase I5 remains WAIT until I5.5–I5.6 close; I5.3 stays BLOCKED until correlation unblocked; **I5.1 · I5.4 DONE**) |
| Authority | [ARCH-025](../architecture/ARCH-025-data-layer.md) · [GUIDE-017](GUIDE-017-enterprise-quality-evidence-standard.md) backup/recovery · [RB-001](../runbooks/RB-001-multi-org-ops.md) §3.7 |
| Neon serial | **N2** migrate discipline APPROVED · **N3** backup/recovery APPROVED (independent audit 2026-07-17) — do not invent **N19** |
| Restore rehearsed | Ephemeral snapshot restore 2026-07-16 · `finalize_restore=false` · drill branch deleted · prod `br-tiny-hill-ao82jp6f` untouched — SSOT RB-001 §3.7 |
| RPO — snapshot | **PASS** ≤24h — measured **0.9 h** (`snap-dry-bread-aomnu65c`) |
| RTO — ephemeral drill | **PASS** ≤30 min — measured **0.58 min** |
| RPO — PITR | **NOT EVIDENCED** (≤60s target typed in `@afenda/env` `neon-recovery-posture`; path not drilled) — fail-closed for any claim that requires PITR RPO |
| RTO — production cutover | **Out of scope / named blocker** — not claimed for release |
| Irreversible paths | `packages/db/scripts/db-migrate-guard.mjs` · additive-first gate · `.cursor/hooks/no-drizzle-baseline-migrate.mjs` · CI `db:check` only · Deploy migrate-free |
| Baseline ban | Sole `0000_living-roots-baseline.sql` migrate **DENIED** even with `AFENDA_ALLOW_DB_MIGRATE=1` |
| Verify (2026-07-17) | `pnpm validate:neon-env` → **14 passed, 0 failed** · `pnpm --filter @afenda/db test -- migrate-guard additive-migration migration-journal` → **18 passed** |
| Forbidden | No new restore drill without operator auth · no `finalize_restore=true` on prod · no GUIDE-017 READY claim from this stage alone |

### Implement evidence — I5.3 (2026-07-17)

| Field | Evidence |
| ----- | -------- |
| Verdict | **BLOCKED** — critical-path correlation not PASS; do not invent APM vendors or reopen Closed Draft [API-007](../api/API-007-api-observability-correlation-contract.md) |
| Alert→runbook | **Closed** for the only product alert that exists: N4 Neon DB performance monitor issue body + recovery comment embed `docs/runbooks/RB-001-multi-org-ops.md` §3.7b ([RB-001](../runbooks/RB-001-multi-org-ops.md) 1.4.1) |
| Paths (alert) | `.github/workflows/neon-performance-monitor.yml` · `scripts/monitor-neon-performance.mjs` · RB-001 §3.7b / Alerts honesty |
| Critical paths (correlation) | Invite / role assign-revoke + `platform_rbac_audit` · Declarations submit/read · org-admin assign · `proxy.ts` /auth · N4 DB monitor — each **NOT CORRELATABLE** today (no request/correlation identity in logs, client-safe errors, or audit rows) |
| Named blockers | (1) No `correlationId` / `requestId` / `traceId` / `x-request-id` under `apps/web` or `packages` · (2) API-007 Closed Draft Placeholder — Living contract absent · (3) No structured product logger / OTel / Sentry / Datadog / `instrumentation.ts` · (4) App-path alerts (5xx / auth spikes → RB-007) do not exist — N/A until alerts exist |
| Partial (not I5.3 PASS) | `platform_rbac_audit` actor/org/time attribution without correlation column; Draft RB-007 aspirational “request id” steps |
| Verify | See pasted commands below — alert link present; correlation/APM rg empty (expected for BLOCKED) |
| Forbidden | No fake PASS · no telemetry vendor invent · no API-007 / RB-007 reopen this mission · no I5.4+ / I6 READY |
| Unblock later | Docs-lane reopen API-007 → Living → implement correlation on critical Server Actions + structured logs + safe client reference + tests; add app alerts only when real signals exist, each linking RB-007/RB-001 |
| Next Ops | **I5.5** then **I5.6**; **I5.1 · I5.2 · I5.4 DONE**; Phase I5 remains **WAIT** |

**Verify paste (2026-07-17):**

```text
rg -n "RB-001|runbooks/RB-001" .github/workflows/neon-performance-monitor.yml
# 85: ... Runbook: docs/runbooks/RB-001-multi-org-ops.md §3.7b ...
# 113: ... Runbook: docs/runbooks/RB-001-multi-org-ops.md §3.7b.

rg -n "correlationId|requestId|traceId|x-request-id" apps/web packages --glob "!**/node_modules/**"
# (no matches; exit 1) — documents BLOCKED correlation gap

rg -n "sentry|datadog|opentelemetry|@opentelemetry|pino" apps/web/package.json packages/*/package.json
# (no matches) — no invented APM deps
```

### Implement evidence — I5.4 (2026-07-17)

| Field | Evidence |
| ----- | -------- |
| Stage | **DONE** (phase I5 remains WAIT for I5.3 + named residuals elsewhere; **A11Y03 · PERF01 residuals closed**) |
| Authority | [GUIDE-017](GUIDE-017-enterprise-quality-evidence-standard.md) §3.6 a11y/i18n + performance · ARCH-016 segment loading/error · ARCH-012/031 locale-free routes · Google CWV “good” adoption in `testing/fe-cwv-budgets.ts` |
| Paths | `testing/ux-a11y-i18n-perf-matrix.ts` · `testing/a11y-assistive-matrix.ts` · `testing/fe-cwv-budgets.ts` · `testing/e2e/{a11y,cwv}.ts` · `e2e/smoke/{a11y-assistive-matrix,fe-cwv-budgets}.spec.ts` · `apps/web/features/auth/skip-to-main-content.tsx` · `apps/web/features/auth/main-content.ts` · segment loading/error · `apps/web/__tests__/ux-a11y-i18n-perf-matrix.inventory.test.ts` |
| Matrix | **UX01–UX06** · **A11Y01–A11Y03** · **I18N01–I18N02** · **PERF01–PERF02** — owners **Platform** (default) · **Feed Farm Trade** (I18N02) |
| PASS | UX segment loading/error/empty/pending/403 · ui-system barrel · org-admin form aria · **A11Y03** axe + skip-link · en-only locale · **PERF01** lab CWV under adopted Google “good” · Neon DB N4 posture (PERF02) |
| NOT EVIDENCED | _(none for I5.4 residual set)_ |
| NOT APPLICABLE | **I18N02** multi-locale / next-intl / locale URL tree — owning rationale ARCH-012/031; **PERF01 capacity/saturation** — until I6 load harness |
| Adopted FE budgets | LCP ≤ 2500ms · INP ≤ 200ms · CLS ≤ 0.1 — workload/env/percentile/regression trigger in `FE_CWV_BUDGETS` (not invented Afenda-specific numbers) |
| Verify | See paste below — residual close 2026-07-17 |
| Forbidden | No invented alternate CWV/locale thresholds · no Collapse recover · no **N19** · no GUIDE-017 READY · no AdminCN / next-intl product install this stage |
| Out-of-bar | I6 READY · multi-tenant load/capacity harness · GUIDE-017 READY |
| Next Ops | **I6+**; Phase I5 remains **WAIT** (I5.3 correlation + other named residuals) |

**Verify paste (2026-07-17 residual close):**

```text
pnpm --filter @afenda/web test -- ux-a11y-i18n-perf-matrix.inventory
# (inventory green — A11Y03 · PERF01 PASS paths on disk)

pnpm --filter @afenda/web test -- ui-boundary
# (green — ADR-010 barrel gate)

pnpm exec playwright test --project smoke e2e/smoke/a11y-assistive-matrix.spec.ts e2e/smoke/fe-cwv-budgets.spec.ts
# (public rows green; authenticated a11y skips without factory)

Test-Path apps/web/features/auth/skip-to-main-content.tsx,
  testing/a11y-assistive-matrix.ts, testing/fe-cwv-budgets.ts
# all True
```

### Implement evidence — I5.5 (2026-07-17)

| Field | Evidence |
| ----- | -------- |
| Stage | **DONE** (residuals repaired; phase I5 remains WAIT — I5.3 BLOCKED + invite-audit residual; no GUIDE-017 READY) |
| Authority | [GUIDE-017](GUIDE-017-enterprise-quality-evidence-standard.md) change/supply-chain · [ARCH-022](../architecture/ARCH-022-system-overview.md) CI/Deploy |
| Deploy order | [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) — `workflow_run` after workflow **CI** `conclusion == success` on `main`; checkout `workflow_run.head_sha`; parallel `push`→Deploy removed |
| Human override | `workflow_dispatch` retained as **named** Platform override (not silent skip) |
| Quality DB fail-closed | `quality` sets `DATABASE_URL` + `REQUIRE_DATABASE_TESTS=1` + preflight; [`testing/require-database-for-ci.ts`](../../testing/require-database-for-ci.ts) throws under CI when DB missing — Vitest `skipIf` cannot greenwash |
| E2E factory | Standing `e2e-smoke` retains `E2E_REQUIRE_FACTORY=1` + secret preflight (I4) |
| Secrets audit | Ops name-list: `pnpm audit:github-actions-secrets`. **In-CI presence:** job `secrets-presence` on `main` runs `node scripts/ci-secrets-presence.mjs` (non-empty `${{ secrets.* }}` / `${{ vars.* }}` injection — not `gh secret list`) |
| Branch protection | Greenfield `pnpm protect:main` (+ `-- --apply`); Living required check = job name `quality`; stale `journey` removed from GitHub Settings via apply |
| N4 monitor | `continue-on-error` compensated by final `exit 1` — honest |
| Verify | See paste below (repair 2026-07-17) |
| Forbidden | No silent skip-as-PASS · no fake branch-protection · no **N19** · no GUIDE-017 READY |
| Next Ops | **I6+**; Phase I5 remains **WAIT** |

**Verify paste (2026-07-17 repair):**

```text
rg -n "workflow_run" .github/workflows/deploy.yml
# workflow_run after CI success · head_sha · no push trigger

rg -n "name: quality|secrets-presence|ci-secrets-presence" .github/workflows/ci.yml
# job name quality · secrets-presence → node scripts/ci-secrets-presence.mjs

node --test scripts/protect-main.test.mjs scripts/audit-github-actions-secrets.test.mjs
# tests 15 · pass 15 · fail 0

pnpm protect:main
# Result: PASS — main protection matches Living CI quality gate.
# contexts=["quality"] strict=true allow_force_pushes=false

pnpm audit:github-actions-secrets
# Result: PASS — all required secret and variable names present.

pnpm gh -- api repos/pohlai88/afenda-lite/branches/main/protection --jq ".required_status_checks.contexts"
# ["quality"]
```

### Implement evidence — I5.6 (2026-07-17)

| Field | Evidence |
| ----- | -------- |
| Stage | **DONE** (phase I5 remains **WAIT** — I5.3 BLOCKED + invite-audit residual; I5.5 residuals repaired; no GUIDE-017 READY) |
| Authority | GUIDE-018 Phase I5 · `code-simplification` (method) |
| Cuts | Dead `list-org-roles.ts` · remove unused `isActionSuccess`/`isActionFailure` · drop unused client-path constants · drop unused `@afenda/web` deps (`motion` · `clsx` · `tailwind-merge`) · shared `requireClientDeclarationActionSession` for load/save/submit Actions · sheet composes `SubmitDeclarationForm` + `onSuccess` · Biome excludes `apps/web/shadcn-studio` DNA staging · `@afenda/testing/*` path for tsc honesty |
| Behavior | Unchanged — ActionResult codes/messages · draft/submit gates · sheet close/refresh/navigate on submit success |
| Verify | See paste below — green 2026-07-17 |
| Forbidden | No feature expansion under “simplify” · no DNA prune/AdminCN · no Collapse recover · no **N19** · no FFT 2B–2D · no I6 READY claim |
| Next Ops | **I6+**; Phase I5 remains **WAIT** (I5.3 correlation + invite-audit residual) |

**Verify paste (2026-07-17):**

```text
pnpm --filter @afenda/web test -- action-result-contract submit-client-declaration-action declaration-submit-read product-authorization-wiring
# Test Files  4 passed (4) · Tests  25 passed (25)

pnpm --filter @afenda/web lint
# Checked 168 files · No fixes applied

pnpm --filter @afenda/web typecheck
# (exit 0)

pnpm exec turbo run lint typecheck test
# Tasks: 19 successful, 19 total
```

---

## Phase I6 — Evidence and release decision

| | |
| --- | --- |
| **Status** | WAIT |
| **Lane** | Docs / Test |
| **Goal** | Bind claims to ledgers before anyone says READY |

| Stage | Outcome |
| ----- | ------- |
| **I6.1** | Module evidence ledgers updated (`*-MOD-009` / `*-MOD-010`) |
| **I6.2** | GUIDE-017 claim identity filled (READY / CONDITIONALLY READY / NOT READY) |
| **I6.3** | Production deploy health confirmed (Actions Deploy · Vercel READY · trusted Neon Auth domains) |

**Farms:** `afenda-elite-module-readiness` · shipping-and-launch  
**Exit:** Any readiness claim points at fresh, revision-bound evidence — never “ON DISK exists.”

---

## Phase I7 — Continuous control

| | |
| --- | --- |
| **Status** | WAIT (runs forever after Living cutover) |
| **Lane** | Normalize / Docs |
| **Goal** | Keep docs, repo, and vocabulary honest without blocking product missions |

| Stage | Outcome |
| ----- | ------- |
| **I7.1** | Periodic doc↔doc / register integrity (`afenda-elite-doc-integrity`) |
| **I7.2** | Housekeeping discovery → deletes only via monorepo-refactor Slice D |
| **I7.3** | Deprecation register enforcement |
| **I7.4** | Skill catalog honesty — extend before inventing farms |

---

## Phase R — Optional program reopen

| Stage | Gate |
| ----- | ---- |
| **R1** FFT Phase 2B–2D | Written program reopen + Approved slice group in FFT-MOD-008; no silent mix with unrelated refactors |
| **R2** New bounded context | Controlled ARCH-006 ADR + DOC register; then MOD-002 module pack |
| **R3** Named Collapse recovery | Forbidden by default; only if the user names that exact recovery in the current turn |

---

## 3.4 GUIDE-017 dimension → phase map

| Dimension | Covered mainly in |
| --------- | ----------------- |
| Functional / journey correctness | I1–I4 |
| Tenant / authz isolation | I1–I5.1 |
| Application security / identity | I1 · I5.1 · I5.5 |
| Availability / resilience | I5.2 · I5.3 · I6 |
| Backup / recovery | I5.2 · I6 |
| Performance / capacity | I5.4 · I6 |
| Observability / supportability | I5.3 · I6 |
| Data lifecycle / privacy / audit | I5.1–I5.3 |
| Accessibility / i18n | I4 · I5.4 |
| Change / supply-chain / migration | I5.2 · I5.5 |
| Contract / integration quality | I2–I4 |
| Documentation / control / handoff | G · I5.3 · I6–I7 |
| Maintainability | I2 · I4 · I5.2 · I5.6 |

Absence of implementation does **not** make a dimension `NOT APPLICABLE`; an owning authority must record exclusion and fail-closed behavior.

---

## 3.5 Standing definition of done (every increment)

Every PR / mission must satisfy its controlled acceptance **and**:

1. Positive, adverse, error, and recovery behavior is **runtime-verified** where the change claims it
2. New tests fail without the behavior and pass with it; no permanent skip supports the claim
3. Lint, types, formatting, build, boundaries, and applicable integration gates pass
4. Tenant, permission, ownership, input/output, secrets/PII, and error exposure are reviewed
5. Config, flags, schema, migrations, dependencies, compatibility, and rollback/forward-fix are accounted for
6. Critical-path telemetry, audit, dashboards/alerts, and runbook changes exist when the path is material
7. Accessibility, locale, browser/device, and performance criteria are evaluated for user-facing work
8. Evidence is revision/environment-bound, reproducible, fresh, sanitized, and linked from owning records
9. A human owner reviews before merge/deploy

---

## 3.6 Checkout gap summary (not a readiness claim)

Snapshot of what “ON DISK vs still missing” looks like as of 2026-07-17:

| Area | State | What exists | What is still required |
| ---- | ----- | ----------- | ---------------------- |
| Toolchain / packages | ON DISK | pnpm · Node · Turbo · Biome · TS · `@afenda/*` | Keep CI install green; I5.5 gate honesty ON DISK |
| Routes / UI | PARTIAL | `/`, `/403`, `/admin`, `/fft`, `/client/declarations` (+ detail) · shared operator shell · org-admin Combobox · **I5.4** declared UX states + axe/skip-link (A11Y03 PASS) | Optional AdminCN / Studio polish (waived) · responsive depth · multi-locale (I18N02 N/A) |
| Authn / authz | PARTIAL | Session helpers · `proxy.ts` · `/auth/*` · `/join` · invite · coarse shells · Tier-2 `hasPermission` · `fft.access` · browser adverse A1–A4 | Full permission-matrix surfaces beyond standing shells (I5) |
| Data / tenancy | PARTIAL | Drizzle schema · `withOrg` reads · hard-org writes · two-org denial smoke · by-id cross-org denial (I5.1) · concurrent submit race unit (A10) · **I5.2** restore/RPO(snapshot)/RTO(ephemeral) + migrate fail-closed (RB-001 §3.7 · N2/N3) | Broader mutation matrix beyond standing Actions · PITR RPO drill (named blocker) · prod cutover RTO (out of scope) |
| Domains | PARTIAL | Identity assign/revoke + org users (I3.4 cut A) · Declarations submit/read · FFT list-only · adverse declaration journeys A6–A9 | FFT beyond freeze = FROZEN |
| API / contracts | ON DISK | Docs + check tooling · `ActionResult` / `APIErrorBody` · invite+audit · I2.2 boundary · api-now RHs · Zod→OpenAPI · A11 safe INTERNAL_ERROR | Contract-only expansion · Fumadocs wire · broader HTTP families |
| E2E | **DONE** (I4) | Neon **N13** APPROVED · factories · smoke/journey · adverse matrix **A1–A11** · `playwright.config.ts` | Post-merge Actions green for `e2e-smoke` (ops follow-through) |
| CI / Deploy | **DONE** (I5.5) | Lint/typecheck/test · Deploy after green CI · standing `e2e-smoke` · quality DB fail-closed · factory fail-closed · `protect:main` · in-CI secrets-presence | First main-branch `e2e-smoke` green (ops follow-through) · post-deploy smoke (I6.3) · rollback decision |
| Security / obs / perf / a11y | PARTIAL | N14 denial · **I5.1** isolation/secrets/safe-error closed (invite-audit attribution **BLOCKED**) · **I5.2** restore/migrate · **I5.3** alert→RB-001 (correlation BLOCKED) · **I5.4** criteria matrix + A11Y03/PERF01 closed (Google CWV lab adopted) · **I5.5** gate honesty · **I5.6** accidental-complexity cuts | Invite-audit durable attribution · **app correlation** (I5.3) · I6 capacity harness |
| Maintainability | **DONE** (I5.6) | Dead ports/helpers/deps removed · shared declaration Action gate · sheet submit compose · DNA staging excluded from Biome | Ongoing: no feature under “simplify”; I7 housekeeping discovery |

---

## 3.7 Skill routing cheat sheet

| Need | Route |
| ---- | ----- |
| Any product / docs start | `using-afenda-elite-skills` |
| Controlled write / ID / Status | `afenda-elite-doc-control` |
| Conflict / SSOT drift | `afenda-elite-doc-integrity` |
| ARCH-028 residual only | `afenda-elite-implementation-slices` |
| Routes / RSC / proxy | `afenda-elite-nextjs-best-practice` |
| Domain ports | `afenda-elite-backend-modules` |
| ActionResult / OpenAPI | `afenda-elite-api-contract` |
| MOD readiness claims | `afenda-elite-module-readiness` |
| Neon tenancy ops | `neon-tenancy-efficiency` |
| FFT domain (when reopened) | `feed-farm-trade` |
| Generic lifecycle methods | `using-agent-skills` |

---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-002 | Documentation Register | Catalogue (register this guide after ID approval) |
| DOC-003 | Controlled Document Template | Header + six sections |
| ARCH-022…027 | Target system pack | System / tenancy / packages / data / auth / env |
| ARCH-028 | Implementation Slices | Scaffold S1–S8 + checkpoints |
| ARCH-029 | Interface API Architecture | Living interface parent |
| ARCH-031 | Technology Stack Catalogue | Stack inventory |
| GUIDE-015 | Interface Pack Development Roadmap | API pack build order |
| GUIDE-017 | Enterprise Quality and Evidence Standard | Evidence aggregation |
| MOD-002 | Modules Index | Module Enterprise Readiness standard |
| FFT-MOD-008 | Ops Runtime | FFT freeze / reopen gate |
| FFT-MOD-009 / 010 | Verification · Module Docs Index | FFT evidence + spine |
| RB-001 / RB-005 | Multi-org Ops · Post-lock Cheat Sheet | Ops |
| AGENTS.md | Cursor Agent cockpit | Checkout posture |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.0.8 | 2026-07-17 | **I5.5 residual repair**: greenfield `pnpm protect:main` (+ apply) · job name `quality` · in-CI `secrets-presence` probe · `pnpm gh` keyring forwarder; stale `journey` check removed; Phase I5 stays WAIT; next Ops = **I6+**. |
| 1.0.7 | 2026-07-17 | **I5.4 residual close**: A11Y03 axe + skip-link matrix PASS · PERF01 Google CWV “good” lab budgets adopted + smoke; capacity N/A→I6; Phase I5 stays WAIT (I5.3 BLOCKED + other named residuals); next Ops = **I6+**. |
| 1.0.6 | 2026-07-17 | **I5.6 DONE**: accidental-complexity cuts (dead ports/helpers/deps · shared declaration Action gate · sheet submit compose · DNA Biome exclude); behavior unchanged; turbo lint/typecheck/test green; Phase I5 stays WAIT (I5.3 BLOCKED + named residuals); next Ops = **I6+**. |
| 1.0.5 | 2026-07-17 | **I5.5 DONE**: Deploy `workflow_run` after CI success · quality DB fail-closed · factory alternate secrets audit; residuals **BLOCKED** (`protect:main` collapse · in-CI `gh secret list`); Phase I5 stays WAIT; next Ops = **I5.6**. |
| 1.0.4 | 2026-07-17 | **I5.1 DONE**: isolation/secrets/unsafe-error closed; invite-audit attribution residual **BLOCKED** (Neon Auth cross-system + compensating control + one retry); cut ledger + by-id tenancy proof; Phase I5 stays WAIT; next Ops = **I5.5** then I5.6. |
| 1.0.3 | 2026-07-17 | **I5.4 DONE**: declared UX/a11y/i18n/perf criteria matrix + owners (`testing/ux-a11y-i18n-perf-matrix.ts`); FE CWV numeric budgets remain NOT EVIDENCED (no invent); multi-locale NOT APPLICABLE; Phase I5 stays WAIT; next Ops = **I5.1** then I5.5–I5.6. |
| 1.0.2 | 2026-07-17 | **I5.2 DONE**: bind RB-001 §3.7 restore + snapshot RPO/ephemeral RTO; PITR RPO + prod cutover named blockers; migrate fail-closed re-verified; Phase I5 stays WAIT; next Ops = **I5.1** then I5.4–I5.6. |
| 1.0.1 | 2026-07-17 | I5.3 evidenced **BLOCKED**: N4 alert→RB-001 §3.7b closed; critical-path correlation blockers named (no APM invent / no API-007 reopen); Phase I5 stays WAIT; next Ops = **I5.1**. |
| 1.0.0 | 2026-07-17 | Status Draft→**Living**: program map stable through I1–I4 (I3.4 cut A DONE · cut B AdminCN waived · I4 adverse A1–A11 + standing CI); next Ops = **I5** then I6+. |
| 0.3.19 | 2026-07-17 | I4 DONE: adverse/recovery matrix A1–A11 (right layers) · standing CI `e2e-smoke` · factory fail-closed; next Ops = **I5** then I6+. |
| 0.3.18 | 2026-07-17 | I3.4 DONE at cut A (member-directory Combobox CAPABLE); cut B AdminCN polish **waived** out of I3.4 exit; Phase I3 DONE; next Ops = **I4** then I5+. |
| 0.3.17 | 2026-07-17 | Docs-lane sync after Neon lag: I3.2←N17 · I3.3←N18 DONE; I3.4 WAIT · I4 PARTIAL (N13 factory ON DISK); §3.6 E2E no longer MISSING; next Ops = I3.4 / I4 then I5+. |
| 0.3.16 | 2026-07-17 | Neon Auth mail boundary: Zoho SMTP via Neon Auth console (ARCH-026 2.0.0); app-side SMTP still forbidden. |
| 0.3.15 | 2026-07-17 | I3.1 closed: assign/revoke ports + Actions · `hasPermission` · CAPABLE org-admin assign/revoke · GUIDE evidence; next Ops = I3.2. |
| 0.3.14 | 2026-07-17 | Bounded reopen/close: housekeeping drift align after Slice D removed orphan `list-surveys.ts`; I2.2 disk row now names `list-client-assignments` and I2.3 predicate export wording matches `@afenda/db`. |
| 0.3.13 | 2026-07-15 | I2.4 closed: api-now health + declaration-draft RHs on disk · Zod SSOT OpenAPI handoff · `check:openapi` disk honesty; Phase I2 DONE; next Ops = I3.1. |
| 0.3.12 | 2026-07-15 | I2.3 residual-risk disposition: browser invite E2E→I4; `clients.invite`→I3.1; Change Log history non-SSOT. |
| 0.3.11 | 2026-07-15 | I2.3 closed: invite Action → Neon Auth + `recordRbacAudit` hard `organization_id` write; next Ops = I2.4. |
| 0.3.10 | 2026-07-15 | I2.2 closed: feature → domain → `@afenda/db` Vitest gate; features/actions never import db; next Ops = I2.3. |
| 0.3.9 | 2026-07-15 | I2.1 closed: platform `ActionResult` / `APIErrorBody` / `parseSchema` on Target paths; invite Action wired; next Ops = I2.2. |
| 0.3.8 | 2026-07-15 | I1.4 closed: `AUTH_FORBIDDEN_PATH` · `requireRole` wrong-role → `/403` · shell layout wiring evidence; Phase I1 DONE; next Ops = I2.1. |
| 0.3.7 | 2026-07-15 | I1.3 gap close: operator `/admin` invite → `inviteOrgMemberAction` / `inviteOrgMember`; local join route probe evidence. |
| 0.3.6 | 2026-07-15 | I1.3 evidence: `/join?invitationId=…` · Neon `/auth/accept-invitation` → join · `buildJoinUrl` / `inviteOrgMember`; next Ops = I1.4. |
| 0.3.5 | 2026-07-15 | I1.2 evidence: public Neon Auth UI `/auth/login` · forgot · reset; `@afenda/auth` client/API handlers; next Ops = I1.3. |
| 0.3.4 | 2026-07-15 | I1.1 gap close: POST-only `next-action` bypass · `session-gate-policy` unit tests · evidence paths refreshed. |
| 0.3.3 | 2026-07-15 | I1.1 evidence: `apps/web/proxy.ts` + `@afenda/auth` `createSessionProxy`; unauth protected redirects verified; next Ops = I1.2. |
| 0.3.2 | 2026-07-15 | ID approved and registered in DOC-002; Control State Closed after Checkpoint G register sync. |
| 0.3.1 | 2026-07-15 | Checkpoint G closed: You-are-here + G/I1 status; next Ops = I1; script inventory honesty retained. |
| 0.3.0 | 2026-07-15 | Clarity rewrite: phase-by-phase roadmap with You-are-here, glance table, per-phase goal/status/exit, and gap summary; dense checklist detail deferred to GUIDE-017 / ARCH-028. |
| 0.2.0 | 2026-07-15 | Repository-evidence revision: state vocabulary, audited baseline, E2E chain, verification/hardening gates, GUIDE-017 coverage, standing Definition of Done. |
| 0.1.0 | 2026-07-15 | Initial Draft: master E2E integration program. Provisional ID GUIDE-018 pending DOC-002 approval. |

---

# 6. Notes

- Keep this program under **`docs/guides/`**. Do not park program SSOT in `docs/scratch/`, agent chats, or a root `specs/` tree.
- ID **GUIDE-018** is registered in DOC-002 (**Living** 1.0.8). Never recycle Retired/Superseded IDs.
- Fullstack Guardian design notes belong in controlled Docs-lane Markdown (scratch → Draft → Living), not a second documentation root.
- ARCH-028 stays Closed for coding invention. New work is sequenced in this guide and detailed in owning ARCH/API/MOD docs or Approved slice groups.
