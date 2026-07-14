# GUIDE-018 Full-Stack End-to-End Integration Program

| Field             | Value      |
| ----------------- | ---------- |
| **ID**            | GUIDE-018  |
| **Category**      | Guide      |
| **Version**       | 0.3.6      |
| **Status**        | Draft      |
| **Control State** | Closed     |
| **Owner**         | Platform   |
| **Updated**       | 2026-07-15 |

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
- Open **Phase I1** (identity & edge) — **I1.1–I1.3** closed; next Ops mission **I1.4** (fail-closed role shells)
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

## 3.2 You are here (2026-07-15)

```text
FOUNDATIONS ████████ DONE
SCAFFOLD     ████████ DONE  (ARCH-028 S1–S8 · Checkpoints A–F)
CHECKPOINT G ████████ DONE  (Docs: ARCH-022…028 Living · retirement reviewed)
I1           █████░░░ OPEN  ← I1.1–I1.3 done · next I1.4 (role shells)
I2–I7        ░░░░░░░░ WAIT
REOPEN (R*)  ░░░░░░░░ optional · explicit written approval only
```

**Plain-English baseline:** packages, routes, CI, Deploy, the edge session gate (`apps/web/proxy.ts`), public Neon Auth UI (`/auth/login` · forgot · reset · sign-up), and `/join?invitationId=…` exist on disk; Turborepo ARCH pack is **Living**. Remaining I1 surface (role-shell journeys), writes, E2E, observability, and release evidence are still incomplete. See §3.6 for the gap summary.

**Standing honesty:**

1. Many root `package.json` script names still route through `scripts/collapse-script-unavailable.mjs`. Those names are **inventory, not live controls**, until an Approved forward slice replaces them.
2. ARCH-028 coding order is closed — do not invent S9; sequence new work with this guide.

## 3.3 Roadmap at a glance

| Phase | Name | Status | Lane | One-line goal |
| ----- | ---- | ------ | ---- | ------------- |
| **F** | Foundations | DONE | Docs | Living docs control + Target architecture + locks |
| **S** | Turborepo scaffold | DONE | Ops | Packages, `apps/web`, CI, Deploy (ARCH-028) |
| **G** | Docs cutover | **DONE** | Docs | Target→Living + retirement reviewed |
| **I1** | Identity & edge | **OPEN** (I1.1–I1.3 done) | Ops | Session gate, `/auth/*`, `/join`, fail-closed roles |
| **I2** | Interface / BFF | WAIT | Ops | ActionResult, module boundaries, first write |
| **I3** | Product verticals | WAIT | Ops | Identity · Declarations · FFT read (freeze) |
| **I4** | Verification factory | WAIT | Test | Unit → contract → real E2E smoke |
| **I5** | Hardening | WAIT | Ops/Test | Security · recovery · obs · a11y/i18n · CI depth |
| **I6** | Evidence & decision | WAIT | Docs/Test | MOD ledgers + GUIDE-017 claim before READY |
| **I7** | Continuous control | WAIT | Normalize/Docs | Integrity · housekeeping · deprecation |
| **R** | Optional reopen | WAIT | Program | FFT 2B–2D or new context — approval required |

Recommended mission queue: **I1 → I2 → I3 (freeze) → I4 → I5/I6**.

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
| **Status** | **OPEN** — I1.1–I1.3 done; next **I1.4** |
| **Lane** | Ops + Guardian |
| **Goal** | Real session lifecycle at the edge and public auth surfaces; shells stay fail-closed |

| Stage | Build this | Guardian focus | Stage status |
| ----- | ---------- | -------------- | ------------ |
| **I1.1** | Greenfield `apps/web/proxy.ts` edge session gate | Backend + Security | **DONE** 2026-07-15 |
| **I1.2** | Public `/auth/*` (Neon Auth: login · forgot · reset) | Frontend + Security | **DONE** 2026-07-15 |
| **I1.3** | `/join?invitationId=…` + operator invite via `@afenda/auth` | Full stack + authz | **DONE** 2026-07-15 |
| **I1.4** | Role shells: unauth → login; wrong role → `/403` | Authz | WAIT |

**Farms:** `afenda-elite-nextjs-best-practice` · `neon-tenancy-efficiency` · `afenda-elite-frontend-scaffold`  
**Exit:** Anonymous, wrong-role, and happy-path session journeys have reproducible evidence (not package presence alone).

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
| Boundary | Neon SDK (`createNeonAuth` / `createAuthClient` / handler) only in `@afenda/auth`; UI via `@neondatabase/auth-ui`; no app-side SMTP for auth email |
| Gap close | `resolveAuthUiOrigin` (request host for reset `baseURL`) · `AUTH_LOGIN_PATH` SSOT · `/auth/sign-out` · auth island `auth-surface.css` · segment `loading`/`error` · typed `AuthUiLink` |

### Implement evidence — I1.3 (2026-07-15)

| Field | Evidence |
| ----- | -------- |
| Paths | `apps/web/app/(public)/join/{page,layout,loading,error}.tsx` · `features/auth/{join-shell,auth-island-layout,auth-surface-chrome}.tsx` · `@afenda/auth` `JOIN_PATH` · `buildJoinUrl` · `buildInviteJoinUrl` · `inviteOrgMember` (Origin = `APP_URL`) |
| Routes | `GET /join` (no id) → invitation-required shell; `GET /join?invitationId=…` → Neon `AcceptInvitationCard`; Neon mail `/auth/accept-invitation?invitationId=` → **308** `/join?invitationId=` (`apps/web/next.config.ts` redirects) |
| Verify | `pnpm --filter @afenda/auth typecheck` · `pnpm --filter @afenda/auth test` · `pnpm --filter @afenda/web typecheck` · `pnpm --filter @afenda/web lint` · `pnpm --filter @afenda/auth lint` — green |
| Boundary | SDK stay in `@afenda/auth`; UI via `@neondatabase/auth-ui`; invitee `signUp` enabled on auth island; no app-side SMTP |
| Gap close | Shared auth island layout/chrome · `/auth/sign-up` public · 403 → Sign in link |
---

## Phase I2 — Interface / BFF spine

| | |
| --- | --- |
| **Status** | WAIT (after I1) |
| **Lane** | Ops + Guardian |
| **Goal** | Stable ActionResult/error contracts and the first authenticated write path |

| Stage | Build this |
| ----- | ---------- |
| **I2.1** | ActionResult / shared error brands on Target paths |
| **I2.2** | Enforce feature → domain → `@afenda/db` (features never import db) |
| **I2.3** | First authenticated **write** vertical (prefer Identity invite or Declarations — not FFT 2B) |
| **I2.4** | OpenAPI / REST sync honesty (`check:openapi` · integrity) |

**Farms:** `afenda-elite-api-contract` · `afenda-elite-backend-modules`  
**Authority:** ARCH-029 · GUIDE-015 · API/REST/OPEN pack  
**Exit:** One write vertical works end-to-end under tenancy + contract checks.

---

## Phase I3 — Product verticals

| | |
| --- | --- |
| **Status** | WAIT (deepens after I2) |
| **Lane** | Ops (+ readiness) |
| **Goal** | Complete allowed product paths inside the FFT freeze envelope |

| Stage | Outcome | Boundary |
| ----- | ------- | -------- |
| **I3.1** Identity / Platform | Roles · assignments · RBAC audit beyond list ports | Platform / MOD |
| **I3.2** Declarations | Client list → submit/read under hard tenancy | Declarations MOD |
| **I3.3** FFT (frozen) | Operator read shell + Phase 2A RBAC only | FFT-MOD-008 Allowed/Forbidden |
| **I3.4** Org-admin shell | Operator UX composes Identity/Platform ports | AdminCN only if shell work needs it |

**Farms:** `afenda-elite-backend-modules` · `afenda-elite-module-readiness` · `feed-farm-trade` (boundary only unless reopen)  
**Exit:** Verticals under freeze have module-evidence rows for what they claim; no 2B–2D domain reopen.

---

## Phase I4 — Verification factory

| | |
| --- | --- |
| **Status** | WAIT (close the smoke gap as soon as I1–I2 exist) |
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

**Exit:** The chain below has positive, denial, failure, and recovery proof at the right layers.

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

Required adverse cases include: anonymous, wrong role/permission/org, invalid/stale input, duplicate submit, concurrent mutation, dependency timeout, partial failure, and safe recovery.

---

## Phase I5 — Enterprise hardening

| | |
| --- | --- |
| **Status** | WAIT (parallelizable after I1–I4 have substance; must finish before READY claims) |
| **Lane** | Ops / Test |
| **Goal** | Close non-negotiable production risks GUIDE-017 will reject |

| Stage | Focus | Exit (plain) |
| ----- | ----- | ------------ |
| **I5.1** | Security · identity · privacy · audit | No open non-waivable isolation, secret, corruption, or unsafe-error condition |
| **I5.2** | Data change · resilience · backup/restore | Restore/RPO/RTO demonstrated; irreversible/unvalidated paths block release |
| **I5.3** | Observability · supportability | Critical paths correlatable; alerts map to runbooks |
| **I5.4** | UX · a11y · i18n · performance | Declared states and budgets measured with owners |
| **I5.5** | CI · supply chain · migration · release automation | Merge/deploy gates ordered and honest (no silent skip) |
| **I5.6** | Simplification | Complexity reduced without behavior change after evidence exists |

**Do not invent thresholds here.** Adopt CWV / latency / capacity numbers in an owning authority with workload, environment, percentile, regression trigger, and owner — then treat them as PASS criteria.

**Baseline migrate ban stays:** `0000` living-roots SQL is a schema reference, not a production migration.

**Detail checklist:** [GUIDE-017](GUIDE-017-enterprise-quality-evidence-standard.md) (this phase only sequences where that work sits).

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

Snapshot of what “ON DISK vs still missing” looks like as of 2026-07-15:

| Area | State | What exists | What is still required |
| ---- | ----- | ----------- | ---------------------- |
| Toolchain / packages | ON DISK | pnpm · Node · Turbo · Biome · TS · `@afenda/*` | Clean CI install + full gate honesty |
| Routes / UI | PARTIAL | `/`, `/403`, `/admin`, `/fft`, `/client/dashboard` | Forms · error/recovery · responsive · locale · a11y |
| Authn / authz | PARTIAL | Session helpers · `proxy.ts` · `/auth/*` · `/join` · invite client · coarse shell roles | I1.4 role-shell browser proof · permission matrix |
| Data / tenancy | PARTIAL | Drizzle schema · `withOrg` reads | Writes · two-org isolation suite · restore · migrate discipline |
| Domains | PARTIAL | Read list ports | Mutations · adverse journeys · FFT beyond freeze = FROZEN |
| API / contracts | PARTIAL | Docs + check tooling | Product handlers/actions · ActionResult runtime · contract integration |
| E2E | MISSING | Playwright config / root commands | Real `e2e/` + `testing/e2e` factories |
| CI / Deploy | PARTIAL | Lint/typecheck/test · Actions→Vercel | Build depth · E2E · security · post-deploy smoke · rollback decision |
| Security / obs / perf / a11y | MISSING / NOT EVIDENCED | Intent + minimal surfaces | Threat model · telemetry · budgets · matrix evidence |

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
- ID **GUIDE-018** is registered in DOC-002 (Draft). Promote to Living when the program map is stable enough; never recycle Retired/Superseded IDs.
- Fullstack Guardian design notes belong in controlled Docs-lane Markdown (scratch → Draft → Living), not a second documentation root.
- ARCH-028 stays Closed for coding invention. New work is sequenced in this guide and detailed in owning ARCH/API/MOD docs or Approved slice groups.
