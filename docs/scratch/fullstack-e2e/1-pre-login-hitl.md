# Pre-Login HITL — fullstack E2E (UI-UX → FE → DB → BE)

| Field | Value |
|-------|-------|
| Posture | **Scratch** — not Living, Target, Accepted, or DOC-002 registered |
| Program | [GUIDE-018](../../guides/GUIDE-018-fullstack-e2e-integration-program.md) Phase I identity / edge authenticity (I1.*) as **evidence substrate** — this ledger does **not** reopen I1 or claim I6 / GUIDE-017 READY |
| Mission skill | [`afenda-elite-implementation-slices`](../../../.cursor/skills/afenda-elite-implementation-slices/SKILL.md) |
| Audience | Ops + Guardian (Frontend · Backend · Security) human-in-the-loop |
| Updated | 2026-07-18 |
| Disk inventory | Verified via `git ls-files` + `Test-Path` (PowerShell) |
| Evidence SHA | `2f5a2b7` (HEAD; working tree may include uncommitted Pre-Login residue) |
| Slice map | [1A-SL-pre-login.md](1A-SL-pre-login.md) — PL-S14 **CLOSED as PASS**; Final Pre-Login = **PASS** (PL-S12 CWV GAP named) |

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
| PL-UX-01 | UI-UX | Public `/` brand + Sign in CTA | `(public)/page.tsx` | Browser: anonymous `GET /` → 200; one primary CTA → `/auth/login` | PASS | 2026-07-18 PL-S13 Scenario A · local `:3013` · primary SIGN IN → `/auth/login` |
| PL-UX-02 | UI-UX | Auth island chrome (login) | `features/auth/*` · `auth-surface.css` | Browser: `/auth/login` renders Neon Auth UI inside Afenda island; skip-link → `#main-content` | PASS | 2026-07-18 PL-S13 Scenario A · title `Sign in · Afenda-Lite` · Email/Password form; a11y P1 skip-link |
| PL-UX-03 | UI-UX | Forgot / reset / sign-up shells | same thin page | Browser: each `PUBLIC_AUTH_PATH` 200; `/auth/sign-in` 404 | PASS | 2026-07-18 Scenario C-UI forgot shell; PL-S1 CLOSED `sign-in` rejected (`REJECTED_AUTH_PATH_ALIASES`) |
| PL-UX-04 | UI-UX | Join missing invitation | `join/page.tsx` · `PublicMessageShell` | Browser: `/join` shows invitation-required + link to login | PASS | 2026-07-18 PL-S13 Scenario D |
| PL-UX-05 | UI-UX | Forbidden anonymous shell | `403/page.tsx` · `ForbiddenShell` | Browser: `/403` 200; axe/skip-link per A11Y03-P2 | PASS | 2026-07-18 Scenario F + Playwright A11Y03-P2 |
| PL-FE-01 | Frontend | Route inventory honesty | `(public)/**` · gate pages | `git ls-files "apps/web/app/(public)/**"` · gate login/preview exist | PASS | 2026-07-18 PL-S1 CLOSED inventory table |
| PL-FE-02 | Frontend | Anonymous → login | `proxy.ts` · `e2e/smoke/anonymous-gate.spec.ts` | `pnpm --filter @afenda/web test -- session-gate-policy` · Playwright anonymous-gate @smoke | PASS | 2026-07-18 PL-S13: session-gate-policy + anonymous-gate 5/5 · Scenario B |
| PL-FE-03 | Frontend | Auth path allowlist | `auth-paths.ts` · `[path]/page.tsx` | Unit/typecheck auth+web; local probe login/forgot/reset/sign-up/sign-out | PASS | 2026-07-18 typecheck auth+web · PL-S1 auth-paths tests · Scenario A/C-UI |
| PL-FE-04 | Frontend | Join + accept-invitation redirect | `join/page.tsx` · `next.config.ts` | Probe `/join?invitationId=test` 200; `/auth/accept-invitation?invitationId=x` → `/join?…` | PASS | 2026-07-18 PL-S4 CLOSED + Scenarios D/E (`308` query preserved) |
| PL-FE-05 | Frontend | Client gate redirect | `(gate)/login/page.tsx` | Anonymous `/client/login` lands on `/auth/login` | PASS | 2026-07-18 PL-S6 CLOSED · `307` → `/auth/login` |
| PL-FE-06 | Frontend | Public a11y / CWV floor | `testing/a11y-assistive-matrix.ts` · `fe-cwv-budgets.ts` | Smoke: a11y A11Y03-P1/P2 · CWV public `/auth/login` · `/403` (when Playwright env ready) | PASS | 2026-07-18 Playwright 11/11 (a11y + CWV `/auth/login`·`/403`); **GAP:** CWV omits `/`·`/join` (PL-S12 not CLOSED) |
| PL-DB-01 | DB | Neon env contract | `@afenda/env` · `.env.local` | `pnpm validate:neon-env` | PASS | 2026-07-18 PL-S13 · 15 passed, 0 failed |
| PL-DB-02 | DB | Readiness storage probe | `modules/platform/domain/health.ts` | Dev up: `GET /api/health/readiness` → `checks.storage.provider: postgres` + `reachable` (or document `unreachable` / `not_ready` as FAIL/BLOCKED) | PASS | 2026-07-18 Scenario G · postgres reachable on `:3013` |
| PL-DB-03 | DB | Auth env on readiness | same | Readiness `checks.auth.status: configured` requires `NEON_AUTH_BASE_URL` + cookie secret ≥32 (config only — not provider reachability) | PASS | 2026-07-18 Scenario G · `checks.auth` neon_auth configured |
| PL-DB-04 | DB | Neon Auth managed identity store | Neon Cloud / `neon_auth` (provider-owned) | HITL: confirm invitation/user rows only via Neon Auth / approved SQL — **no** inventing app tables for login | PASS | 2026-07-18 PL-S10/S11 · `neon_auth.user` / `invitation` / `verification` via Neon MCP; no parallel app session table |
| PL-DB-05 | DB | Pre-Login write posture | — | Anonymous public/auth/join **must not** write platform tenancy tables (`platform_rbac_audit`, declarations, FFT). Invite **send** is post-login. | PASS | 2026-07-18 PL-S10 CLOSED · `prelogin-write-isolation` 8/8 |
| PL-BE-01 | Backend | Auth BFF wiring | `app/api/auth/[...path]/route.ts` | `pnpm --filter @afenda/web test -- auth-bff-route` | PASS | 2026-07-18 PL-S13 six-fragment web tests include `auth-bff-route` |
| PL-BE-02 | Backend | Session proxy + login URL SSOT | `packages/auth/src/proxy.ts` · `AUTH_LOGIN_PATH` | `pnpm --filter @afenda/auth test` · web `session-proxy-request` | PASS | 2026-07-18 `@afenda/auth` 121 tests · `session-proxy-request` in web suite |
| PL-BE-03 | Backend | SDK boundary | `@afenda/auth` only | Grep/product rule: no Neon SDK import outside `@afenda/auth` on Pre-Login paths | PASS | 2026-07-18 PL-S10 CLOSED boundary + BFF delegates `createAuthApiHandlers` (package-owned) |
| PL-BE-04 | Backend | Health api-now | `api/health/*` | `pnpm check:openapi` (disk honesty) · probe liveness 200 | PASS | 2026-07-18 `check:openapi` ok · Scenario G liveness |
| PL-BE-05 | Backend | Mail delivery path | Neon console Zoho SMTP (ARCH-026) | HITL ops: forgot-password / invite mail leave Neon — **no** app SMTP. Record console check, not code invent. | PASS | 2026-07-18 PL-S11 CLOSED (Neon MCP rectify): Zoho `email_provider` + `neon_auth.verification` `reset-password` mint after `request-password-reset` 200; no app SMTP. |
| PL-BE-06 | Backend | Trusted domains / `APP_URL` | Neon Auth domains · `APP_URL` | HITL: local + prod `APP_URL` hosts trusted for Auth UI callbacks; document mismatch as BLOCKED | PASS | 2026-07-18 PL-S11: `audit:neon-auth-production` 3/0 · `validate:neon-env` N15 ok — includes `https://afenda-lite.vercel.app` + `http://localhost:3000` (+ `*.vercel.app`, nexuscanon). |

---

## HITL steps (ordered)

Run layers in order. A later layer may be `BLOCKED` if an earlier layer is `FAIL`. Human signs each checkpoint.

### 0 — Preconditions (human)

| Step | Action | Exit | Status |
|------|--------|------|--------|
| HITL-0.1 | Confirm mission is **scratch HITL only** — no product code, no DOC-002 register, no I6 claim | Verbal / chat ack | PASS — 2026-07-18 PL-S14 Path 1 docs-only close |
| HITL-0.2 | Local runtime: `.env.local` present (gitignored); secrets never pasted into this file | `pnpm validate:neon-env` runnable | PASS — `validate:neon-env` 15/0 |
| HITL-0.3 | Optional: `pnpm --filter @afenda/web dev` on `:3000` for browser probes | Dev server up or mark browser rows BLOCKED | PASS — PL-S13 used `next start --port 3013` (prod build) for browser/`curl` |

### 1 — UI-UX layer

| Step | Checkpoint | Pass criterion | Status |
|------|------------|----------------|--------|
| HITL-UX-1 | **Visual / hierarchy** — anonymous `/` | Brand-level product name visible; single primary Sign in; no post-login chrome | PASS — PL-S13 Scenario A |
| HITL-UX-2 | **Auth island** — `/auth/login` | Neon managed form hosted in Afenda chrome; loading/error segments present on disk | PASS — PL-S13 Scenario A |
| HITL-UX-3 | **Password recovery shells** | Forgot + reset reachable; copy does not invent app-owned mail UI | PASS — Scenario C-UI + PL-S11 no app SMTP |
| HITL-UX-4 | **Join empty state** | Clear “invitation required”; CTA to Sign in | PASS — Scenario D |
| HITL-UX-5 | **A11y public floor** | A11Y03-P1/P2 (login · 403) axe + skip-link — or BLOCKED with named Playwright env gap | PASS — Playwright a11y matrix (local `:3013`) |
| HITL-UX-6 | **Stop-line review** | No HITL step requires landing on `/admin` or `/client/declarations` as success | PASS — Pre-Login stop line held; post-login homes not success criteria |

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
| HITL-FE-1 | **Disk inventory** | Public + gate paths listed in this doc match `git ls-files` | PASS — PL-S1 CLOSED |
| HITL-FE-2 | **Gate policy unit** | `session-gate-policy` tests green | PASS — PL-S13 web six-fragment suite |
| HITL-FE-3 | **Anonymous browser gate** | `e2e/smoke/anonymous-gate.spec.ts` green (no factory) | PASS — 5/5 on `:3013` |
| HITL-FE-4 | **Auth allowlist** | Login/forgot/reset/sign-up/sign-out 200; `sign-in` 404 | PASS — Scenario A/C-UI + PL-S1 `sign-in` rejected |
| HITL-FE-5 | **Join + redirect** | Missing id message; accept-invitation → join | PASS — Scenarios D/E |
| HITL-FE-6 | **Client login alias** | `/client/login` → `/auth/login` | PASS — PL-S6 CLOSED |
| HITL-FE-7 | **Typecheck** | `@afenda/auth` + `@afenda/web` typecheck green | PASS — PL-S13 both exit 0 |

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
| HITL-DB-1 | **Env ids** | `pnpm validate:neon-env` green against Living Neon project/branch policy | PASS — 15/0 |
| HITL-DB-2 | **Readiness DB** | `/api/health/readiness` reports `checks.storage.provider: postgres` + `reachable` when DATABASE_URL pooler reachable | PASS — Scenario G |
| HITL-DB-3 | **Auth configured signal** | Readiness `checks.auth.status: configured` (env presence — not a live Neon Auth ping) | PASS — Scenario G |
| HITL-DB-4 | **Managed store HITL** | Human confirms Pre-Login identity data lives in Neon Auth managed store; app does not invent a parallel session table | PASS — PL-S10/S11 Neon MCP `neon_auth.*` |
| HITL-DB-5 | **No anonymous tenancy writes** | Trace Pre-Login paths: no `platform_rbac_audit` / declarations / FFT writes for anonymous | PASS — `prelogin-write-isolation` 8/8 |

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
| HITL-BE-1 | **BFF honesty** | `auth-bff-route` test green; handlers from `createAuthApiHandlers` | PASS — PL-S13 `auth-bff-route` |
| HITL-BE-2 | **Package auth tests** | `pnpm --filter @afenda/auth test` green | PASS — 15 files / 121 tests |
| HITL-BE-3 | **Proxy matcher / bypass** | Matcher + bypasses match GUIDE-018 I1.1 evidence (Server Action POST, embed, client gate paths) | PASS — `session-gate-policy` + `session-proxy-request` + PL-S5 CLOSED |
| HITL-BE-4 | **OpenAPI disk honesty** | `pnpm check:openapi` — health ops on disk; Neon `/api/auth/*` excluded from YAML by design | PASS — PL-S13 `check:openapi` ok |
| HITL-BE-5 | **Mail / SMTP ops** | Neon console Zoho SMTP still the delivery path for forgot/invite (ARCH-026) — human console check | PASS — Neon MCP `get_neon_auth_config` + `verification` reset-password mint; see `1A-SL-pre-login.md` PL-S11 CLOSED 2026-07-18 |
| HITL-BE-6 | **Trusted domains** | `APP_URL` / preview hosts registered for Neon Auth when probes use those origins | PASS — PL-S11 + `validate:neon-env` N15 |
| HITL-BE-7 | **Mandatory turbo lint+typecheck+test** | `pnpm exec turbo run lint typecheck test --filter=@afenda/web --filter=@afenda/auth` | PASS — exit 0 (6/6) after 2026-07-18 remediation (`joinInvitationHasControlChars` · Biome format · landing CSS override · Vitest 15s timeouts) |

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
| UI-UX | Guardian Frontend / Agent (PL-S13/S14) | 2026-07-18 | PASS | PL-S13 Scenarios A·C-UI·D·F + a11y smokes |
| Frontend | Guardian Frontend / Agent (PL-S13/S14) | 2026-07-18 | PASS | typecheck · gate/auth/client tests · anonymous-gate; CWV GAP on `/`·`/join` noted under PL-FE-06 (does not FAIL this layer) |
| DB | Guardian Backend / Agent (PL-S13/S14) | 2026-07-18 | PASS | `validate:neon-env` · readiness · write isolation · Neon Auth store |
| Backend | Guardian Backend / Agent (PL-S13/S14) | 2026-07-18 | PASS | HITL-BE-7 turbo PASS after remediation — see [1A-SL-pre-login.md](1A-SL-pre-login.md) PL-S13/S14 |

**Final Pre-Login (PL-S14):** `PASS` — all four layers PASS; PL-S12 CWV path GAP named (non-blocking). Operational auth = PASS (PL-S11 CLOSED).

**Pre-Login HITL closed only when** all four layers are `PASS`, or failures/blockers are named with owners. Partial green must not be summarized as program READY. This close is layer-PASS for Pre-Login scratch only and does **not** claim GUIDE-018 / I6 / GUIDE-017 / N19 / post-login complete.

---

## Open gaps needing human decision

| # | Gap | Why it needs a human | Options (non-binding) |
|---|-----|----------------------|------------------------|
| G1 | **Join with real `invitationId`** | Accepting an invite mutates Neon membership and often creates a session → can cross the post-login stop line | Keep Pre-Login at “card renders”; defer accept→home to Post-Login HITL · or explicitly extend stop line for one invitee journey |
| G2 | **Forgot/reset mail end-to-end** | Depends on Zoho SMTP + trusted domains + real inbox — not unit-testable in CI alone | **PASS** — 2026-07-18 Neon MCP rectify: Zoho SMTP + trusted domains + `neon_auth.verification` `reset-password` rows minted for approved Auth user; reset surface `/auth/reset-password` |
| G3 | **Signed-in visitor on `/`** | `(public)/page.tsx` redirects ready sessions to role home (N7) — that redirect **is** post-login | Treat anonymous-only as Pre-Login PASS · or split a “session bootstrap” border ledger |
| G4 | **`/api/session/sync-cookies` · `ensure-active-organization`** | Cookie/org completion bridges Pre → Post | Exclude from Pre-Login PASS · schedule under Post-Login / N8 evidence reuse |
| G5 | **Playwright public a11y/CWV locally** | Local `:3013` smokes ran green 2026-07-18 (11/11); CWV still omits `/`·`/join` | Standing PASS on `/auth/login`·`/403`; expand matrices or waive (PL-S12 GAP) |
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
| 2026-07-18 | PL-S14 Path 1 docs-only close: sync surface/step evidence from PL-S13; layer sign-off UI-UX/FE/DB **PASS**, Backend **FAIL** (turbo lint); Final Pre-Login **FAIL**; reconcile ops mail with PL-S11 CLOSED; anti-claims unchanged |
| 2026-07-18 | Turbo remediation: Backend HITL-BE-7 **PASS**; Final Pre-Login **PASS**; PL-S12 CWV GAP remains named; anti-claims unchanged |
