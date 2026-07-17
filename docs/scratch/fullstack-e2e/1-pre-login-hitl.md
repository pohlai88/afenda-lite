# Pre-Login HITL — fullstack E2E (UI-UX → FE → DB → BE)

| Field | Value |
|-------|-------|
| Posture | **Scratch** — not Living, Target, Accepted, or DOC-002 registered |
| Program | [GUIDE-018](../../guides/GUIDE-018-fullstack-e2e-integration-program.md) Phase I identity / edge authenticity (I1.*) as **evidence substrate** — this ledger does **not** reopen I1 or claim I6 / GUIDE-017 READY |
| Mission skill | [`afenda-elite-implementation-slices`](../../../.cursor/skills/afenda-elite-implementation-slices/SKILL.md) |
| Audience | Ops + Guardian (Frontend · Backend · Security) human-in-the-loop |
| Updated | 2026-07-17 |
| Disk inventory | Verified via `git ls-files` + `Test-Path` (PowerShell) |

## Status / posture (Scratch — not Living)

Working **human-in-the-loop (HITL)** checklist for the **Pre-Login** cut of fullstack E2E. It does **not** replace:

- [ARCH-026](../../architecture/ARCH-026-auth-session.md) · [ARCH-023](../../architecture/ARCH-023-multi-tenancy.md)
- GUIDE-018 Living stage status / evidence tables
- Neon Auth APPROVED map ([neon-auth-slice-map](../../../.cursor/skills/afenda-elite-implementation-slices/neon-auth-slice-map.md)) — **N1–N18 complete; do not invent N19**
- FE compose map ([9-neon-auth-fe-surface-compose-map.md](../neon-auth-optimisation/9-neon-auth-fe-surface-compose-map.md)) — cite for FE-01…FE-10 only

**Quality bar:** enterprise production only. No reduced-viability planning language. No shims/stubs as exit criteria.

**Stop line:** public unauthenticated surfaces → auth entry (Neon Auth UI / BFF / join / gate redirect). **Stop before** operator/client **post-login homes** (`/admin`, `/fft`, `/client/declarations`). Successful credential submit that lands on a role home is **out of scope** for this ledger (belongs to a future Post-Login HITL).

---

## Scope

### In scope (Pre-Login)

| Zone | Surfaces (disk) |
|------|-----------------|
| Public landing | `GET /` — `apps/web/app/(public)/page.tsx` (anonymous shell; signed-in bounce is **boundary** — see stop line) |
| Auth island | `GET /auth/{login,forgot-password,reset-password,sign-up,sign-out}` — `PUBLIC_AUTH_PATHS` in `packages/auth/src/auth-paths.ts` · thin page `apps/web/app/(public)/auth/[path]/page.tsx` |
| Join | `GET /join` · `GET /join?invitationId=…` — `apps/web/app/(public)/join/page.tsx` |
| Neon mail alias | `/auth/accept-invitation` → **308** `/join?…` — `apps/web/next.config.ts` redirects |
| Forbidden shell (anonymous) | `GET /403` — `apps/web/app/(public)/403/page.tsx` |
| Client gate aliases | `/client/login` → redirect `/auth/login` · `/client/preview-unavailable` — session-gate bypasses (`CLIENT_GATE_PATHS`) |
| Edge gate (anonymous denial) | Unauth document nav to matcher paths → `/auth/login` — `apps/web/proxy.ts` + `session-gate-policy.ts` + `@afenda/auth` `createSessionProxy` |
| Auth BFF | `apps/web/app/api/auth/[...path]/route.ts` → `createAuthApiHandlers()` |
| Health (dependency probe) | `GET /api/health/liveness` · `GET /api/health/readiness` — readiness pings DB `select 1` + auth env configured |

### Explicitly out of scope

| Item | Why |
|------|-----|
| Post-login homes `/admin` · `/fft` · `/client/declarations` | Stop line |
| Operator invite / assign / revoke Server Actions | Authenticated product writes |
| Declarations draft/submit · FFT list | Product verticals |
| Wrong-role → `/403` with a real session | Needs authenticated actor; optional **border** note only — not a Pre-Login pass criterion |
| FFT 2B–2D · inventing N19 · I6 / GUIDE-017 READY claims | Program locks |
| Collapse/legacy path recovery | Anti-contamination |

### Companion FE IDs (pre/auth/gate only)

From scratch compose map FE-01…FE-10: `/` · `/auth/*` public · `/join` · `/403` · `/client/login` · `/client/preview-unavailable`. **Do not** score FE-11…FE-15 here.

---

## Surface → evidence map

Fill **Status** only after human or commanded verify. Never invent PASS.

| Status | Meaning |
|--------|---------|
| `UNEVALUATED` | Not run this HITL pass |
| `PASS` | Verify command / browser probe met exit criterion with pasted evidence |
| `FAIL` | Ran; criterion not met |
| `BLOCKED` | Cannot run (env, secrets, Neon console, missing approval) — name the blocker |

| ID | Layer | Surface / concern | Disk anchor | Verify (commands or probe) | Status | Evidence / notes |
|----|-------|-------------------|-------------|----------------------------|--------|------------------|
| PL-UX-01 | UI-UX | Public `/` brand + Sign in CTA | `(public)/page.tsx` | Browser: anonymous `GET /` → 200; one primary CTA → `/auth/login` | UNEVALUATED | |
| PL-UX-02 | UI-UX | Auth island chrome (login) | `features/auth/*` · `auth-surface.css` | Browser: `/auth/login` renders Neon Auth UI inside Afenda island; skip-link → `#main-content` | UNEVALUATED | |
| PL-UX-03 | UI-UX | Forgot / reset / sign-up shells | same thin page | Browser: each `PUBLIC_AUTH_PATH` 200; `/auth/sign-in` 404 | UNEVALUATED | |
| PL-UX-04 | UI-UX | Join missing invitation | `join/page.tsx` · `PublicMessageShell` | Browser: `/join` shows invitation-required + link to login | UNEVALUATED | |
| PL-UX-05 | UI-UX | Forbidden anonymous shell | `403/page.tsx` · `ForbiddenShell` | Browser: `/403` 200; axe/skip-link per A11Y03-P2 | UNEVALUATED | |
| PL-FE-01 | Frontend | Route inventory honesty | `(public)/**` · gate pages | `git ls-files "apps/web/app/(public)/**"` · gate login/preview exist | UNEVALUATED | |
| PL-FE-02 | Frontend | Anonymous → login | `proxy.ts` · `e2e/smoke/anonymous-gate.spec.ts` | `pnpm --filter @afenda/web test -- session-gate-policy` · Playwright anonymous-gate @smoke | UNEVALUATED | |
| PL-FE-03 | Frontend | Auth path allowlist | `auth-paths.ts` · `[path]/page.tsx` | Unit/typecheck auth+web; local probe login/forgot/reset/sign-up/sign-out | UNEVALUATED | |
| PL-FE-04 | Frontend | Join + accept-invitation redirect | `join/page.tsx` · `next.config.ts` | Probe `/join?invitationId=test` 200; `/auth/accept-invitation?invitationId=x` → `/join?…` | UNEVALUATED | |
| PL-FE-05 | Frontend | Client gate redirect | `(gate)/login/page.tsx` | Anonymous `/client/login` lands on `/auth/login` | UNEVALUATED | |
| PL-FE-06 | Frontend | Public a11y / CWV floor | `testing/a11y-assistive-matrix.ts` · `fe-cwv-budgets.ts` | Smoke: a11y A11Y03-P1/P2 · CWV public `/auth/login` · `/403` (when Playwright env ready) | UNEVALUATED | |
| PL-DB-01 | DB | Neon env contract | `@afenda/env` · `.env.local` | `pnpm validate:neon-env` | UNEVALUATED | |
| PL-DB-02 | DB | Readiness storage probe | `modules/platform/domain/health.ts` | Dev up: `GET /api/health/readiness` → `storage: postgres` (or document `unreachable` as FAIL/BLOCKED) | UNEVALUATED | |
| PL-DB-03 | DB | Auth env on readiness | same | Readiness `auth: configured` requires `NEON_AUTH_BASE_URL` + cookie secret ≥32 | UNEVALUATED | |
| PL-DB-04 | DB | Neon Auth managed identity store | Neon Cloud / `neon_auth` (provider-owned) | HITL: confirm invitation/user rows only via Neon Auth / approved SQL — **no** inventing app tables for login | UNEVALUATED | |
| PL-DB-05 | DB | Pre-Login write posture | — | Anonymous public/auth/join **must not** write platform tenancy tables (`platform_rbac_audit`, declarations, FFT). Invite **send** is post-login. | UNEVALUATED | |
| PL-BE-01 | Backend | Auth BFF wiring | `app/api/auth/[...path]/route.ts` | `pnpm --filter @afenda/web test -- auth-bff-route` | UNEVALUATED | |
| PL-BE-02 | Backend | Session proxy + login URL SSOT | `packages/auth/src/proxy.ts` · `AUTH_LOGIN_PATH` | `pnpm --filter @afenda/auth test` · web `session-proxy-request` | UNEVALUATED | |
| PL-BE-03 | Backend | SDK boundary | `@afenda/auth` only | Grep/product rule: no Neon SDK import outside `@afenda/auth` on Pre-Login paths | UNEVALUATED | |
| PL-BE-04 | Backend | Health api-now | `api/health/*` | `pnpm check:openapi` (disk honesty) · probe liveness 200 | UNEVALUATED | |
| PL-BE-05 | Backend | Mail delivery path | Neon console Zoho SMTP (ARCH-026) | HITL ops: forgot-password / invite mail leave Neon — **no** app SMTP. Record console check, not code invent. | UNEVALUATED | |
| PL-BE-06 | Backend | Trusted domains / `APP_URL` | Neon Auth domains · `APP_URL` | HITL: local + prod `APP_URL` hosts trusted for Auth UI callbacks; document mismatch as BLOCKED | UNEVALUATED | |

---

## HITL steps (ordered)

Run layers in order. A later layer may be `BLOCKED` if an earlier layer is `FAIL`. Human signs each checkpoint.

### 0 — Preconditions (human)

| Step | Action | Exit |
|------|--------|------|
| HITL-0.1 | Confirm mission is **scratch HITL only** — no product code, no DOC-002 register, no I6 claim | Verbal / chat ack |
| HITL-0.2 | Local runtime: `.env.local` present (gitignored); secrets never pasted into this file | `pnpm validate:neon-env` runnable |
| HITL-0.3 | Optional: `pnpm --filter @afenda/web dev` on `:3000` for browser probes | Dev server up or mark browser rows BLOCKED |

### 1 — UI-UX layer

| Step | Checkpoint | Pass criterion | Status |
|------|------------|----------------|--------|
| HITL-UX-1 | **Visual / hierarchy** — anonymous `/` | Brand-level product name visible; single primary Sign in; no post-login chrome | UNEVALUATED |
| HITL-UX-2 | **Auth island** — `/auth/login` | Neon managed form hosted in Afenda chrome; loading/error segments present on disk | UNEVALUATED |
| HITL-UX-3 | **Password recovery shells** | Forgot + reset reachable; copy does not invent app-owned mail UI | UNEVALUATED |
| HITL-UX-4 | **Join empty state** | Clear “invitation required”; CTA to Sign in | UNEVALUATED |
| HITL-UX-5 | **A11y public floor** | A11Y03-P1/P2 (login · 403) axe + skip-link — or BLOCKED with named Playwright env gap | UNEVALUATED |
| HITL-UX-6 | **Stop-line review** | No HITL step requires landing on `/admin` or `/client/declarations` as success | UNEVALUATED |

**UI-UX verify bundle (when env ready):**

```powershell
# Inventory (public a11y rows only — P3/P4 are post-login; do not require them for Pre-Login PASS)
pnpm --filter @afenda/web test -- ux-a11y-i18n-perf-matrix.inventory
# Standing smoke (public rows; authenticated rows skip without factory — acceptable for Pre-Login)
pnpm exec playwright test e2e/smoke/a11y-assistive-matrix.spec.ts e2e/smoke/fe-cwv-budgets.spec.ts
```

### 2 — Frontend layer

| Step | Checkpoint | Pass criterion | Status |
|------|------------|----------------|--------|
| HITL-FE-1 | **Disk inventory** | Public + gate paths listed in this doc match `git ls-files` | UNEVALUATED |
| HITL-FE-2 | **Gate policy unit** | `session-gate-policy` tests green | UNEVALUATED |
| HITL-FE-3 | **Anonymous browser gate** | `e2e/smoke/anonymous-gate.spec.ts` green (no factory) | UNEVALUATED |
| HITL-FE-4 | **Auth allowlist** | Login/forgot/reset/sign-up/sign-out 200; `sign-in` 404 | UNEVALUATED |
| HITL-FE-5 | **Join + redirect** | Missing id message; accept-invitation → join | UNEVALUATED |
| HITL-FE-6 | **Client login alias** | `/client/login` → `/auth/login` | UNEVALUATED |
| HITL-FE-7 | **Typecheck** | `@afenda/auth` + `@afenda/web` typecheck green | UNEVALUATED |

**Frontend verify bundle:**

```powershell
pnpm --filter @afenda/auth typecheck
pnpm --filter @afenda/web typecheck
pnpm --filter @afenda/web test -- session-gate-policy session-proxy-request client-paths auth-bff-route role-shells
pnpm exec playwright test e2e/smoke/anonymous-gate.spec.ts
```

**Local route probes (no secrets in repo):**

```powershell
# With dev server running — expect 200 on public; 307 Location /auth/login on protected
# curl.exe -sI http://localhost:3000/
# curl.exe -sI http://localhost:3000/auth/login
# curl.exe -sI http://localhost:3000/auth/sign-in
# curl.exe -sI http://localhost:3000/admin
# curl.exe -sI "http://localhost:3000/auth/accept-invitation?invitationId=probe"
```

### 3 — DB layer

| Step | Checkpoint | Pass criterion | Status |
|------|------------|----------------|--------|
| HITL-DB-1 | **Env ids** | `pnpm validate:neon-env` green against Living Neon project/branch policy | UNEVALUATED |
| HITL-DB-2 | **Readiness DB** | `/api/health/readiness` reports `storage: postgres` when DATABASE_URL pooler reachable | UNEVALUATED |
| HITL-DB-3 | **Auth configured signal** | Readiness `auth: configured` (env presence — not a live Neon Auth ping) | UNEVALUATED |
| HITL-DB-4 | **Managed store HITL** | Human confirms Pre-Login identity data lives in Neon Auth managed store; app does not invent a parallel session table | UNEVALUATED |
| HITL-DB-5 | **No anonymous tenancy writes** | Trace Pre-Login paths: no `platform_rbac_audit` / declarations / FFT writes for anonymous | UNEVALUATED |

**DB verify bundle:**

```powershell
pnpm validate:neon-env
# Dev server:
# curl.exe -s http://localhost:3000/api/health/liveness
# curl.exe -s http://localhost:3000/api/health/readiness
```

**Note:** Baseline migrate ban on production branch `br-tiny-hill-ao82jp6f` still applies — Pre-Login HITL must not apply `packages/db` `0000_*` baseline.

### 4 — Backend layer

| Step | Checkpoint | Pass criterion | Status |
|------|------------|----------------|--------|
| HITL-BE-1 | **BFF honesty** | `auth-bff-route` test green; handlers from `createAuthApiHandlers` | UNEVALUATED |
| HITL-BE-2 | **Package auth tests** | `pnpm --filter @afenda/auth test` green | UNEVALUATED |
| HITL-BE-3 | **Proxy matcher / bypass** | Matcher + bypasses match GUIDE-018 I1.1 evidence (Server Action POST, embed, client gate paths) | UNEVALUATED |
| HITL-BE-4 | **OpenAPI disk honesty** | `pnpm check:openapi` — health ops on disk; Neon `/api/auth/*` excluded from YAML by design | UNEVALUATED |
| HITL-BE-5 | **Mail / SMTP ops** | Neon console Zoho SMTP still the delivery path for forgot/invite (ARCH-026) — human console check | UNEVALUATED |
| HITL-BE-6 | **Trusted domains** | `APP_URL` / preview hosts registered for Neon Auth when probes use those origins | UNEVALUATED |

**Backend verify bundle:**

```powershell
pnpm --filter @afenda/auth test
pnpm --filter @afenda/web test -- auth-bff-route
pnpm check:openapi
pnpm exec turbo run lint typecheck test --filter=@afenda/web --filter=@afenda/auth
```

---

## Layer sign-off

| Layer | Owner role | Date | Result (`PASS` / `FAIL` / `BLOCKED`) | Blocker / link |
|-------|------------|------|--------------------------------------|----------------|
| UI-UX | | | UNEVALUATED | |
| Frontend | | | UNEVALUATED | |
| DB | | | UNEVALUATED | |
| Backend | | | UNEVALUATED | |

**Pre-Login HITL closed only when** all four layers are `PASS`, or failures/blockers are named with owners. Partial green must not be summarized as program READY.

---

## Open gaps needing human decision

| # | Gap | Why it needs a human | Options (non-binding) |
|---|-----|----------------------|------------------------|
| G1 | **Join with real `invitationId`** | Accepting an invite mutates Neon membership and often creates a session → can cross the post-login stop line | Keep Pre-Login at “card renders”; defer accept→home to Post-Login HITL · or explicitly extend stop line for one invitee journey |
| G2 | **Forgot/reset mail end-to-end** | Depends on Zoho SMTP + trusted domains + real inbox — not unit-testable in CI alone | Ops console HITL checklist · or BLOCKED until named mailbox available |
| G3 | **Signed-in visitor on `/`** | `(public)/page.tsx` redirects ready sessions to role home (N7) — that redirect **is** post-login | Treat anonymous-only as Pre-Login PASS · or split a “session bootstrap” border ledger |
| G4 | **`/api/session/sync-cookies` · `ensure-active-organization`** | Cookie/org completion bridges Pre → Post | Exclude from Pre-Login PASS · schedule under Post-Login / N8 evidence reuse |
| G5 | **Playwright public a11y/CWV locally** | May be BLOCKED without browser toolchain; CI standing `e2e-smoke` is separate ops truth | Accept CI run evidence · or require local Playwright |
| G6 | **Wrong-role `/403`** | Needs authenticated wrong-role actor — not anonymous Pre-Login | Leave out · or optional border case with factory client hitting `/admin` |
| G7 | **Next HITL artifact** | Post-Login ledger exists as companion | Use [2-post-login-hitl.md](2-post-login-hitl.md); do not fold Post-Login into this file |
| G8 | **Promotion** | Scratch stays non-authoritative until DOC-001 mission | Keep scratch · or later promote excerpts into GUIDE-018 / runbook only with Docs-lane approval |

---

## Anti-claims (binding for this scratch)

- Do **not** mark GUIDE-018 **I6** or [GUIDE-017](../../guides/GUIDE-017-enterprise-quality-evidence-standard.md) READY from this ledger.
- Do **not** invent Neon **N19** or reopen FFT **2B–2D**.
- Do **not** treat UNEVALUATED rows as PASS.
- Do **not** restore Collapse trees or invent routes/APIs/env keys absent from disk / `@afenda/env`.

---

## Authority pointers

| Need | Link |
|------|------|
| Program map | [GUIDE-018](../../guides/GUIDE-018-fullstack-e2e-integration-program.md) § Phase I1 |
| Auth packaging | [ARCH-026](../../architecture/ARCH-026-auth-session.md) |
| Tenancy lock | [ARCH-023](../../architecture/ARCH-023-multi-tenancy.md) |
| FE surface IDs | [9-neon-auth-fe-surface-compose-map.md](../neon-auth-optimisation/9-neon-auth-fe-surface-compose-map.md) |
| Slice skill | [afenda-elite-implementation-slices](../../../.cursor/skills/afenda-elite-implementation-slices/SKILL.md) |
| Test factory | [testing/README.md](../../../testing/README.md) · adverse A1 anonymous gate |

## Change log

| Date | Summary |
|------|---------|
| 2026-07-17 | Initial Pre-Login HITL scratch — four layers, disk-mapped surfaces, UNEVALUATED evidence grid, open gaps G1–G8 |
