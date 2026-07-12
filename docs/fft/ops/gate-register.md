# Phase 2A — Ops gate register (drift closure)

| Field | Value |
|-------|-------|
| **Doc type** | `OPS` — gate history and drift rules (historical; phase closed) |
| **Status** | **Closed** — Gate 7 complete; operational rollout finished 2026-07-10 |
| **Agent entry** | [../RUNTIME.md](../RUNTIME.md) |
| **Date** | 2026-07-09 (gates closed 2026-07-10) |
| **Authority** | [../spec/phase-2a-prd.md](../spec/phase-2a-prd.md) · [./release-readiness.md](./release-readiness.md) · [./rollout.md](./rollout.md) |
| **GitHub issue** | [#1](https://github.com/pohlai88/afenda-lite/issues/1) — **closed** (completed) |

This document is the **single operational SSOT** for Phase 2A rollout status, gate sequencing, and drift prevention. Agents and operators must read this before any Feed Farm Trade production work.

**PRD “implementation gate” (ADR + PRD + slices approved) is closed.** Ops rollout **finished** 2026-07-10 — historical reference only.

---

## Stop drift — binding rules (this application phase)

| Rule | Detail |
|------|--------|
| **Product boundary** | Tag `fft-phase-2a` → commit `8e650ff` (**immutable**). Do not retag. |
| **Post-boundary fixes** | Fix-lane only (e.g. `4d203a7` next-intl FftShell). **Merge to `main`** before the next production deploy. No new product tag. |
| **RBAC flag** | `FFT_RBAC_ENABLED=true` on Vercel production since **Gate 7** (2026-07-10). Local dev stays `false` unless running controlled matrix. Rollback = set flag `false` → `sync:vercel` → redeploy. |
| **Schema** | Migrations `013` (Phase 1) + `014` (RBAC) applied on production. **No new migrations** in this phase unless production-blocking. |
| **No 2C–2D code** | ADRs Accepted; slices **Proposed** until per-phase approval. **2B** implemented — flags default off. |
| **No product expansion** | No new permissions, roles, RBAC UI, or trade features. |
| **No repo normalization** | `lib/` / `components/` / layout / declaration refactors — **separate lane**, not mixed into Feed Farm Trade commits. |
| **No conflation** | Guardian Auth, portal atmosphere, declaration domain — **out of scope** for this rollout. |

---

## Canonical refs

| Item | Value |
|------|--------|
| Production URL | `https://afenda-lite.vercel.app` (legacy alias `iam-check.vercel.app`) |
| Production Neon branch | `br-tiny-hill-ao82jp6f` (**only**) |
| Phase 1 tag | `fft-phase-1` → `1bc1294` |
| Phase 2A tag | `fft-phase-2a` → `8e650ff` |
| Post-tag hotfix branch | `fix/fft-next-intl-trade-shell` |
| Post-tag hotfix commit | `4d203a7` — `components/fft/trade-shell.tsx` |
| Production deploy (hotfix) | `dpl_3pPtX2wDjSGM2ydPvHjQBVwy5w93` |

---

## Gate status (2026-07-09)

Operational gates map to [./release-readiness.md](./release-readiness.md) promotion order. They are **rollout tracking labels**, not a second PRD implementation gate.

| Gate | Description | Status |
|------|-------------|--------|
| **1** | Flag-dark safety review | ✅ Passed |
| **2** | Explicit `FFT_RBAC_ENABLED=false` sync | ✅ Passed |
| **3** | Flag=false production deploy smoke | ✅ Passed |
| **4 repair** | Production DB migrate (`013` + `014`) | ✅ Complete |
| **4 fix** | next-intl FftShell SSR crash (`4d203a7`) | ✅ Merged to `main` (`ee14f10`) |
| **4 admin** | Phase 1 admin matrix (flag off) | ✅ Passed |
| **4B** | Phase 1 sales allowlist matrix (flag off) | ✅ **PASS** — rows 6–10 passed on live app (2026-07-10) |
| **5** | `requestTransferAction` / transfer-lite triage | ✅ Complete — flag=false no patch; pre-Gate-6 permission alignment recorded |
| **6** | Controlled `FFT_RBAC_ENABLED=true` | ✅ **PASS** — local controlled matrix 17/17 (2026-07-10) |
| **7** | Production RBAC enable | ✅ **PASS** — DB cutover + `allow_localhost` hardened + production `flag=true` + compact smoke 17/17 (2026-07-10) |

**Phase 2A ops rollout:** Gates **1–7** ✅ complete (2026-07-10). Production runtime: `br-tiny-hill-ao82jp6f` / `ep-dawn-bird`, `FFT_RBAC_ENABLED=true` on Vercel. **2B–2D:** ADRs Accepted; implementation gated on [../spec/phase-2bcd-slices.md](../spec/phase-2bcd-slices.md) approval.

---

## Gate 4B — sales allowlist matrix (closed — data/setup)

**Purpose:** Verify Phase 1 allowlisted sales behavior in production with `FFT_RBAC_ENABLED=false`.

**Lane:** Ops / production data setup. **Not** code cleanup, Normalize, or 2B–2D.

### Sales test identity (close drift)

| Account | Role in app | Feed Farm Trade access |
|---------|-------------|------------------|
| `SHARED_ADMIN_EMAIL` | Phase 1 admin (`isAdminSession`) | Full admin trade path — **not** the sales matrix account |
| `PREVIEW_CLIENT_EMAIL` | S16 declaration **preview client** | **Not** auto-allowlisted. `scripts/seed-production.mjs` does **not** insert into `fft_sales_member`. Use only if explicitly allowlisted in production data. |

**Redirect to `/client` is expected** when a signed-in non-allowlisted user hits `/fft`:

1. `requireFftAccess()` → `/auth/sign-in?reason=fft-access-denied`
2. Auth page sees existing session → `getAuthenticatedLandingHref()` → `/client`

This is **not** an RBAC regression. It indicates missing `fft_sales_member` row or wrong test user.

### Production data checks (branch `br-tiny-hill-ao82jp6f` only)

```sql
-- 1. Confirm table exists
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name like 'hot_sales%';

-- 2. Inspect allowlist columns
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'fft_sales_member'
order by ordinal_position;

-- 3. Check intended sales email (use actual column names from step 2)
select * from fft_sales_member where active = true;
```

If the sales test email is missing: add via **approved admin UI** (`/fft/vi/admin/events/{id}/setup` → Sales allowlist) or documented production data-ops. Record as **production data setup**, not code scope.

### Production evidence (2026-07-09 data setup · 2026-07-10 matrix)

**Data branches:** allowlist + open event seeded on `br-tiny-hill-ao82jp6f` (gate SSOT) and `br-super-hill-aojc9a4p` (live Vercel deploy DB).

```sql
select email, active from fft_sales_member where active = true;
-- Result (both branches): 1 row — preview-client@iam-check.com (domain: iam-check.com)

-- br-tiny-hill-ao82jp6f open event: GATE-4B-PROD-20260709 · Gate 4B Production SKU · qty=100
-- br-super-hill-aojc9a4p open event (matrix): Gate 4B Ops Event 20260709 · Gate 4B SKU · qty=100
```

**Matrix re-run (rows 6–10 only)** — `https://iam-check.vercel.app`, sales session on allowlisted `iam-check.com` account, `FFT_RBAC_ENABLED=false`:

| Row | Result | Evidence |
|-----|--------|----------|
| 6 | ✅ PASS | `/fft/vi/events` — no `/client` bounce |
| 7 | ✅ PASS | Order submit → `/my-orders` with new customer row |
| 8 | ✅ PASS | Same order visible on `/fft/vi/my-orders` |
| 9 | ✅ PASS | `/fft/vi/admin/events` → redirected to `/fft/vi/events` |
| 10 | ✅ PASS | RSC `requireFftPermission("event.create")` redirect; `createTradeEventAction` replay as sales → HTTP **303**, no `eventId` created |

Runner: `node scripts/gate-4b-rows-6-10.mjs` (Playwright, production base URL).

**Verdict:**

```text
Sales account: iam-check.com / allowlist row: yes
Active open event + product: yes (live deploy · Gate 4B Ops Event 20260709)
Row 6–10: pass (5/5)
Gate 4B: PASS
```

**DB drift caveat (historical — resolved 2026-07-10):**

```text
Pre-cutover runtime DB: dev-spec-b / br-super-hill-aojc9a4p (ep-curly-sky)
Post-cutover runtime DB: production / br-tiny-hill-ao82jp6f (ep-dawn-bird)
Gate 4B matrix rows 6–10 were run on pre-cutover DB; post-cutover flag=false smoke re-verified trade ingress.
```

**Remaining ops (not matrix):** ~~align live Vercel `DATABASE_URL` to `br-tiny-hill-ao82jp6f`~~ ✅ done — see [Gate 7 DB cutover](#gate-7--production-db-cutover-complete).

### Event/product prerequisite (rows 7–8)

Before order-create tests, production needs:

- At least one **open** Feed Farm Trade event
- At least one product with supply configured
- Setup complete enough that sales UI is not a dead end

Admin create-event → setup flow already passed; use that path for minimal test data if approved.

### Gate 4B matrix (re-run only these)

| # | Scenario | Expected |
|---|----------|----------|
| 6 | Allowlisted sales `/fft/vi/events` | Trade events page — **not** `/client` bounce |
| 7 | Allowlisted sales order create | Order created or valid submit flow |
| 8 | Allowlisted sales `/fft/vi/my-orders` | Own orders visible |
| 9 | Allowlisted sales `/fft/vi/admin/events` | Redirected / denied (non-admin) |
| 10 | Allowlisted sales `/fft/vi/admin/events/new` | Denied server-side / not allowed |

Row 10: prefer **server action guard** evidence over UI-only routing checks ([ADR-001](../adr/001-rbac.md) server-side enforcement).

### Gate 4B verdict template

```text
Sales account: <email domain only> / allowlist row: yes|no
Active open event + product: yes|no
Row 6–10: pass|fail + notes
Gate 4B: PASS | FAIL
```

---

## Gate 5 — `requestTransferAction` / transfer-lite triage

**Status:** ✅ Complete — triage only; no flag=false code patch.

**Date:** 2026-07-10  
**Runtime flag:** `FFT_RBAC_ENABLED=false`

### Finding

`requestTransferAction` currently uses:

```ts
const access = await requireFftAccess();
```

It does not currently call:

```ts
requireFftPermission("transfer.request")
```

### Flag=false verdict

No production patch is required while RBAC remains dark.

Under the current Phase 1 path:

- trade entry is gated by Phase 1 admin or `fft_sales_member` allowlist;
- non-admin users can only request transfer for their own orders;
- business validity is still checked by `canTransferOrder(order, event)`.

This is sufficient for Phase 1 transfer-lite with `FFT_RBAC_ENABLED=false`.

### Pre-Gate-6 note

Before any controlled `FFT_RBAC_ENABLED=true` run, `requestTransferAction` must be aligned with the RBAC permission path, preferably:

```ts
requireFftPermission("transfer.request", ...)
```

or otherwise proven to enforce `transfer.request` on the RBAC-enabled path.

This is a Gate 6 prep item, not a Phase 2B/2C/2D expansion. See [ADR-001](../adr/001-rbac.md) (server-side permission checks for sensitive trade actions).

**Code alignment:** ✅ Complete — `requestTransferAction` enforces `requireFftPermission("transfer.request", { eventId })` @ `51e9a5b`.

---

## Gate 6 — controlled RBAC matrix (local only)

**Status:** ✅ **PASS** — controlled local run with `FFT_RBAC_ENABLED=true`. **Production flag remains `false`** until Gate 7.

**Date:** 2026-07-10  
**Lane:** Ops verification only — not production RBAC enable, not 2B–2D.

### Preconditions

| Item | Value |
|------|--------|
| Code | `51e9a5b` — `requestTransferAction` → `requireFftPermission("transfer.request")` |
| Local flag | `FFT_RBAC_ENABLED=true` in `env.config` → `npm run env:compose` → restart `npm run dev` |
| DB branch | `dev-spec-b` / `br-super-hill-aojc9a4p` (matches live Vercel deploy DB) |
| Sales RBAC | Platform `sales_executive` assignment for preview client (`f83b7908-…`) |
| Deny fixture | Role `Gate6 No Transfer` (`a1111111-…`) — `event.view`, `order.create`, `order.view_own` only |
| Harness | `scripts/gate-6-controlled-matrix.mjs` (ops-only, not committed) |

### Matrix results (17/17 PASS)

| Check | Result | Evidence |
|-------|--------|----------|
| Unknown team denies | PASS | `modules/fft/domain/rbac.test.ts` |
| Unknown BU denies | PASS | `rbac.test.ts` |
| Sensitive missing grant denies | PASS | `rbac.test.ts` |
| Sensitive explicit grant allows | PASS | `rbac.test.ts` |
| RBAC unit baseline | PASS | `rbac.test.ts` full pass |
| RBAC admin page (admin) | PASS | `/fft/vi/admin/rbac` |
| Event create page (admin) | PASS | `/fft/vi/admin/events/new` |
| Event create action (admin) | PASS | setup redirect after create |
| Event create action (sales replay) | PASS | HTTP 303 |
| Sales events / order create / my-orders | PASS | Playwright journey |
| Transfer with `transfer.request` | PASS | UI submit + DB `transfer_status=requested` |
| Transfer without `transfer.request` | PASS | Action replay HTTP 303 after RBAC-only role swap |
| RBAC admin page (sales) | PASS | Redirect `/fft/vi/events` |
| Sensitive action denied | PASS | `allocation.override` — unit tests + action replay policy |
| Sensitive grant audit row | PASS | `fft_rbac_audit` `role.permission_grant` rows present |

**Verdict template:**

```
Gate 6: PASS (17/17)
Runtime: local localhost:3000, FFT_RBAC_ENABLED=true (not Vercel production)
Commit: 51e9a5b
DB: br-super-hill-aojc9a4p
```

### Harness notes (failures resolved)

1. **Stale dev server** — matrix hit old `flag=false` process; fix: kill port 3000, `env:compose`, restart dev.
2. **Transfer allow check** — RSC action replay does not reconstruct `FormData`; use UI submit + DB poll (not pending-approval text).
3. **Transfer deny** — requires allowlist off + `Gate6 No Transfer` role; integrated in harness with `restoreSalesRbacBaseline()`.
4. **Role assignment upsert** — partial unique index on active assignments; use SELECT-then-UPDATE, not blind INSERT.

### Post-Gate-6 constraints (historical)

- Gate 7 production enable is **complete** (2026-07-10).
- **Do not** start Phase 2B–2D without new ADR/slice approval.

---

## Gate 7 — production DB cutover (complete)

**Status:** ✅ **PASS** — Vercel production runtime aligned to canonical Neon branch. **Production RBAC flag remains `false`**; explicit enable is a separate Gate 7 promotion step.

**Date:** 2026-07-10  
**Lane:** Ops only — no app code, no migrations, no RBAC enable.

### Pre-cutover drift (confirmed)

| Item | Before | Canonical target |
|------|--------|------------------|
| Vercel `DATABASE_URL` host | `ep-curly-sky-aojpc61y-pooler` (`br-super-hill-aojc9a4p` / `dev-spec-b`) | `ep-dawn-bird-aofi3f7j-pooler` (`br-tiny-hill-ao82jp6f`) |
| Vercel `NEON_AUTH_BASE_URL` | `ep-curly-sky` (dev-spec-b) | `ep-dawn-bird` (production) |
| Committed `neon-auth.manifest.json` | `dev-spec-b` / `ep-curly-sky` | Must match production auth URL |

**Incident:** First env sync without manifest update caused production **500** (`assertNeonAuthManifestMatchesEnv` fail-closed). Recovery: sync manifest to production branch + redeploy from `main`.

### Canonical branch data (`br-tiny-hill-ao82jp6f`)

| Check | Result |
|-------|--------|
| Migrations `013_hot_sales.sql` + `014_fft_rbac.sql` | ✅ Applied |
| Sales allowlist | ✅ `preview-client@iam-check.com` (`active=true`) |
| RBAC seed / assignments | ✅ 11 roles; assignments: `admin@iam-check.com` → Client Admin (`platform`); `preview-client@iam-check.com` → Sales Executive (`own`) |
| Open event (smoke) | ✅ `GATE-4B-PROD-20260709` — Gate 4B Production Event 20260709 |

### Cutover actions

1. `npm run env:compose` + `npm run sync:vercel` — `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `FFT_RBAC_ENABLED=false` (+ 10 other canonical keys).
2. `lib/auth/neon-auth.manifest.json` → production branch (`d05eae2`).
3. `vercel deploy --prod --yes` from `main` → `dpl_8btf19EFofKLQmcswLJQWNXfGEVV`.
4. Local dev uses production branch (`ep-dawn-bird`) in `env.config` / `env.secret`.

### Post-cutover smoke (`FFT_RBAC_ENABLED=false`)

Target: `https://iam-check.vercel.app`  
Runner: `node --env-file=.env scripts/gate-7-cutover-smoke.mjs`

| Check | Result | Evidence |
|-------|--------|----------|
| Health liveness | ✅ PASS | `GET /api/health/liveness` → `status: alive` |
| Health readiness | ✅ PASS | `GET /api/health/readiness` → `status: ready`, pooler connected |
| Sales `/fft/vi/events` (allowlisted) | ✅ PASS | No `/client` bounce |
| Admin `/fft/vi/admin/events` | ✅ PASS | Admin events page loads |

**Verdict:**

```text
Gate 7 DB cutover: PASS
Runtime DB: br-tiny-hill-ao82jp6f / ep-dawn-bird
Deploy: dpl_8btf19EFofKLQmcswLJQWNXfGEVV
Manifest: d05eae2
FFT_RBAC_ENABLED (Vercel): false
Production RBAC enable: NOT DONE (explicit promotion still required)
```

### Gate 7 promotion blockers (RBAC enable — closed)

| Item | Resolution |
|------|------------|
| `allow_localhost: true` on production | ✅ Disabled via `configure:neon-auth-production --disable-localhost`; manifest `allowLocalhost: false` (`da34fdc`); MCP verified `allow_localhost: false` |
| `FFT_RBAC_ENABLED=true` on Vercel | ✅ Synced + redeployed (`dpl_Eyi4bNeaw9yE8m31pWSBVY3pCaWg`) |
| Production compact matrix `flag=true` | ✅ **17/17 PASS** (`dpl_BCqJqHsjQ8z2Tih1684Gp11ThreK` after hotfix `930dde0`) |

### Gate 7 — production RBAC enable (complete)

**Status:** ✅ **PASS** — production `FFT_RBAC_ENABLED=true` with UI + action-level smoke evidence.

**Date:** 2026-07-10  
**Lane:** Ops rollout + production-blocking hotfix on frozen boundary (`930dde0` — own-scope self-service permission context).

#### Pre-enable hygiene

```text
allow_localhost: disabled on br-tiny-hill-ao82jp6f (Neon CLI)
manifest allowLocalhost: false (da34fdc)
pre-enable deploy: dpl_6hxsWFKNhnngVSx2xJu9zopSH6Yv (flag=false health smoke PASS)
```

#### Enable sequence

1. `FFT_RBAC_ENABLED=true` in production env (`npm run env:compose` → `npm run sync:vercel`).
2. `vercel deploy --prod --yes` → `dpl_Eyi4bNeaw9yE8m31pWSBVY3pCaWg`.
3. Production-blocking hotfix `930dde0` — `requireFftPermission` supplies `resourceOwnerUserId` for sales self-service codes when RBAC `own` scope is active.
4. Redeploy → `dpl_BCqJqHsjQ8z2Tih1684Gp11ThreK`.

#### Compact production smoke (`flag=true`)

Target: `https://iam-check.vercel.app`  
Runner: `node --env-file=.env scripts/gate-7-production-smoke.mjs`

| Check | Result |
|-------|--------|
| Health liveness / readiness | ✅ PASS |
| Unknown team / BU denies (unit) | ✅ PASS |
| Sensitive missing grant denies (unit) | ✅ PASS |
| Admin RBAC / events / events/new | ✅ PASS |
| Admin event create action | ✅ PASS |
| Sales events (no `/client` bounce) | ✅ PASS |
| Sales order create + my-orders | ✅ PASS |
| Sales own transfer request | ✅ PASS (post-allocation) |
| Sales admin RBAC denied | ✅ PASS |
| Sales events/new denied (RSC) | ✅ PASS |
| Sales event.create replay denied | ✅ PASS |
| Sales allocation admin denied | ✅ PASS |

**Verdict:**

```text
Gate 7 production RBAC enable: PASS (17/17)
Runtime DB: br-tiny-hill-ao82jp6f / ep-dawn-bird
FFT_RBAC_ENABLED (Vercel): true
Deploy: dpl_BCqJqHsjQ8z2Tih1684Gp11ThreK
Hotfix: 930dde0
```

#### Rollback path (verified policy)

```bash
# env.config: FFT_RBAC_ENABLED=false
# env.secret: production DATABASE_URL (ep-dawn-bird) for sync only
npm run env:compose
npm run sync:vercel
vercel deploy --prod --yes
```

Phase 1 allowlist + admin path resumes immediately when flag is `false` (dual-read not active).

#### Brief monitoring (post-enable)

No unexpected 500s, `/client` bounces, `team_scope_unresolved`, `bu_scope_unresolved`, or incorrect admin/sales denials observed during smoke window.

---

## Hotfix merge requirement

✅ **Complete (2026-07-09):** `fix/fft-next-intl-trade-shell` @ `4d203a7` merged to `main` as `ee14f10`. Safe to deploy from `main` without reintroducing the FftShell SSR crash.

---

## Stashed / WIP policy

Keep unrelated stashes parked until Gate 4B closes. Test-only deltas belong in a separate **Test lane** commit after rollout gates — do not pop into production deploys.

---

## Classification reference (Gate 4 sales failure)

| Symptom | Likely cause | Lane |
|---------|--------------|------|
| `/client` after `/fft` | Non-allowlisted session; preview client without `fft_sales_member` row | Gate 4B data |
| Order create fails | No open event / no products | Gate 4B data |
| Admin routes fail | Separate issue — admin matrix already passed | Not Gate 4B |

**Not:** RBAC flag regression · schema migration issue (post-014) · permission redesign

---

## Agent prompt (Gate 4B — paste-ready)

```md
Lane: Ops / data setup only.
Boundary: fft-phase-2a @ 8e650ff; FFT_RBAC_ENABLED=false.
Target: https://iam-check.vercel.app · DB branch br-tiny-hill-ao82jp6f only.

Tasks:
1. Confirm sales test email in fft_sales_member (active).
2. Do not assume PREVIEW_CLIENT_EMAIL is allowlisted.
3. Ensure open event + product exists for order flow.
4. Re-run Gate 4B rows 6–10; report verdict.

Forbidden: RBAC enable, schema change, new permissions/UI, 2B–2D, lib/components cleanup.
```

---

## Phase 2B — deposit + pickup ops (implementation landed 2026-07-10)

**Status:** Code complete; **production flags default off**.

| Item | Value |
|------|-------|
| Migrations | `015_fft_deposit.sql`, `016_fft_pickup_ops.sql` |
| Flags | `FFT_DEPOSIT_ENABLED`, `FFT_PICKUP_OPS_ENABLED` — default `false` on Vercel |
| Admin routes | `/fft/[locale]/admin/events/[id]/deposits`, `.../pickup` |
| Rollback | Set flags `false`; Phase 1 column writes resume via dual-read paths |

### Dev promotion checklist

1. `npm run db:migrate` on production branch.
2. Set flags `true` in `env.config` → `npm run env:compose`.
3. `npm run test:unit -- modules/fft/domain/deposit modules/fft/domain/pickup`.
4. Manual smoke: deposit receipt → projection; pickup fulfillment → rollup qty.
5. Production: migrate prod branch → enable flags via `sync:vercel` → redeploy → smoke.

**Not in 2B:** 2C Excel/notifications, 2D ERP sync.

### Phase 2B closure tag

Cut **`fft-phase-2b`** on `main` after:

1. Migrations `015`–`016` applied on prod branch.
2. Unit tests pass: `npm run test:unit -- modules/fft/domain/deposit modules/fft/domain/pickup`.
3. Dev smoke: deposit receipt → projection; pickup fulfillment → rollup.
4. Prod promotion (flags still default off until checklist below passes).

---

## Phase 2C — Excel import + notifications (implementation landed 2026-07-10)

**Status:** Code complete; **production flags default off**.

| Item | Value |
|------|-------|
| Migrations | `017_fft_import.sql`, `018_fft_notifications.sql`, `020_fft_notification_extended.sql`, `023_fft_notification_deferred_triggers.sql` |
| Flags | `FFT_NOTIFICATIONS_ENABLED`, `FFT_EMAIL_FROM`, `RESEND_API_KEY` — default off/unset on Vercel |
| Admin routes | `/fft/[locale]/admin/events/[id]/imports` |
| Domain | `modules/fft/domain/import-store.ts`, `notification-send.ts`, `notification-store.ts` |
| Rollback | Set `FFT_NOTIFICATIONS_ENABLED=false`; imports remain gated by RBAC only |

### Dev promotion checklist

1. `npm run db:migrate` on production branch.
2. Import smoke: upload → dry-run → confirm (product + priority types minimum).
3. Set `FFT_NOTIFICATIONS_ENABLED=true`, `FFT_EMAIL_FROM`, `RESEND_API_KEY` in `env.secret` → `npm run env:compose`.
4. `npm run test:unit -- modules/fft/domain/import-validators modules/fft/domain/notification-render`.
5. Trigger one notification (e.g. order submit) — verify Resend delivery + `fft_notification_log` row.
6. Production: migrate prod branch → add Resend keys to Vercel (not via `env pull`) → enable flag → redeploy → smoke.
7. Schedule `npm run process:trade-closing-soon` (cron) when notifications enabled.

**Triggers:** all ADR-003 keys wired including `event.closing_soon` (cron) and `deposit.pending` (order + bulk import).

**Not in 2C:** 2D ERP sync, custom SMTP for Neon Auth.

### Phase 2C closure tag

Cut **`fft-phase-2c`** on `main` after:

1. Migrations `017`–`018`, `020` applied on prod branch.
2. Import + notification unit tests pass (see above).
3. Notification smoke with flag on in dev; idempotency verified on duplicate trigger.
4. E2E imports step green in `e2e/trade-fft.spec.ts`.

---

## Phase 2D — ERP sync framework + DLQ (2D-1/2D-2 landed 2026-07-10)

**Status:** Framework + ops UI complete; **vendor adapter (2D-3) per customer**; flag default off.

| Item | Value |
|------|-------|
| Migration | `019_fft_erp_sync.sql` |
| Flag | `FFT_ERP_SYNC_ENABLED` — default `false` |
| Admin route | `/fft/[locale]/admin/erp-sync` (linked from events admin nav when flag on) |
| Permissions | `export.finance` (view/process), `sync.retry` (manual DLQ retry — audited) |
| Runner | `npm run process:erp-sync` or admin “Process pending jobs” |
| Rollback | Set flag `false` — enqueue stops; noop adapter when disabled |

### Dev promotion checklist

1. `npm run db:migrate` on target branch.
2. Set `FFT_ERP_SYNC_ENABLED=true` in `env.config` → `npm run env:compose`.
3. `npm run test:unit -- modules/fft/domain/erp-sync-store`.
4. Submit order/deposit/pickup → verify job enqueued; run `npm run process:erp-sync`.
5. DLQ: force failure (noop adapter off) → expand detail panel → manual retry → verify `fft_audit` row `erp_sync.retry`.

**Not in 2D-2:** Customer vendor pack (`modules/fft/domain/erp/<vendor>/`).

---

## Prod flag promotion — 2B / 2C / 2D (ordered)

Enable **one phase at a time** on production; never enable all flags in a single deploy without smoke between each.

| Step | Action | Verify |
|------|--------|--------|
| 0 | `npm run audit:fft-promotion` | JSON `{ ok: true }` |
| 1 | Apply migrations `015`–`023` on `br-tiny-hill-ao82jp6f` | `\d fft_*` tables present |
| 2 | Deploy app with all phase flags **false** | Phase 1 + 2A paths unchanged |
| 3 | `FFT_DEPOSIT_ENABLED=true`, `FFT_PICKUP_OPS_ENABLED=true` | Deposit + pickup admin smoke |
| 4 | `FFT_NOTIFICATIONS_ENABLED=true` + Resend sender | One mail + log row — **Resend closed 2026-07-11** (see below) |
| 5 | `FFT_ERP_SYNC_ENABLED=true` | Job enqueue + process smoke (noop ok) |

### Resend provider (Phase 2C outbound mail) — closed 2026-07-11

**Decision:** 2026-07-10 deferred; **closed 2026-07-11** — XERP Resend credentials reused (`nexuscanon.com` verified sender).

| Item | Production state |
|------|------------------|
| `FFT_NOTIFICATIONS_ENABLED` | `true` |
| `RESEND_API_KEY` | **Set** on Vercel production (via `setVercelEnvKey`; still local-only in sync manifest) |
| `FFT_EMAIL_FROM` | **Set** — `no-reply@nexuscanon.com` (XERP Resend domain; bare address — display-name form broke Vercel build) |
| Excel import admin (`/fft/.../imports`) | **Live** |
| `npm run process:trade-closing-soon` | **Allowed** to schedule after one delivery-row `sent` smoke |

**Close evidence (2026-07-11):**

1. Provisioned from afenda-erp `.secret.config` / `RESEND_FROM` (not Neon Auth / MailerSend).
2. Local: `RESEND_API_KEY` in `env.secret`; `FFT_EMAIL_FROM` in `env.config` → `npm run env:compose`.
3. Vercel production: both keys set via `setVercelEnvKey` — **not** `vercel env pull`.
4. Redeploy: `vercel redeploy` of last Ready prod → aliased `https://iam-check.vercel.app` (2026-07-11). Note: `Name <email>` From form failed Vercel build; bare `no-reply@nexuscanon.com` succeeds.
5. Remaining human smoke: one trade notification → `fft_notification_delivery.status=sent`; then schedule closing-soon cron.

Rollback any step: set affected flag(s) `false` → `npm run sync:vercel` → redeploy. RBAC flag stays `true`.

Tag after promotion evidence (human — on `main` after smoke):

```bash
git tag -a fft-phase-2b -m "Phase 2B deposit + pickup ops"
git tag -a fft-phase-2c -m "Phase 2C import + notifications"
git tag -a fft-phase-2d -m "Phase 2D ERP sync framework + DLQ"
git push origin fft-phase-2b fft-phase-2c fft-phase-2d
```

| Tag | When |
|-----|------|
| `fft-phase-2b` | After step 3 smoke on prod (or dev-only if prod promotion deferred) |
| `fft-phase-2c` | After step 4 smoke |
| `fft-phase-2d` | After step 5 smoke (2D-3 optional per customer) |

---

## Related docs

| Doc | Role |
|-----|------|
| [README.md](./README.md) | Documentation index |
| [./rollout.md](./rollout.md) | Checklist items |
| [./release-readiness.md](./release-readiness.md) | Promotion order + matrix |
| [../spec/phase-2a-slices.md](../spec/phase-2a-slices.md) | Implementation **closed** |
| [../spec/phase-2a-prd.md](../spec/phase-2a-prd.md) | Product contract (Accepted) |
