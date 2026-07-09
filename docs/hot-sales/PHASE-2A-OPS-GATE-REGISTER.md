# Phase 2A — Ops gate register (drift closure)

| Field | Value |
|-------|-------|
| **Status** | **Active** — operational rollout only; **implementation closed** |
| **Date** | 2026-07-09 |
| **Authority** | [PRD-V2-Phase2.md](./PRD-V2-Phase2.md) · [PHASE-2A-RELEASE-READINESS.md](./PHASE-2A-RELEASE-READINESS.md) · [PHASE-2A-OPS-ROLLOUT.md](./PHASE-2A-OPS-ROLLOUT.md) |
| **GitHub issue** | [#1](https://github.com/pohlai88/iam-check/issues/1) |

This document is the **single operational SSOT** for Phase 2A rollout status, gate sequencing, and drift prevention. Agents and operators must read this before any Hot Sales production work.

**PRD “implementation gate” (ADR + PRD + slices approved) is closed.** The active phase is **ops rollout**, not new 2A product work.

---

## Stop drift — binding rules (this application phase)

| Rule | Detail |
|------|--------|
| **Product boundary** | Tag `hot-sales-phase-2a` → commit `8e650ff` (**immutable**). Do not retag. |
| **Post-boundary fixes** | Fix-lane only (e.g. `4d203a7` next-intl TradeShell). **Merge to `main`** before the next production deploy. No new product tag. |
| **RBAC flag** | `HOT_SALES_RBAC_ENABLED=false` (unset = false) until **Gate 6** evidence exists. |
| **Schema** | Migrations `013` (Phase 1) + `014` (RBAC) applied on production. **No new migrations** in this phase unless production-blocking. |
| **No 2B–2D** | Finance, pickup, Excel, notifications, ERP — **blocked** until separate ADR/slice approval. |
| **No product expansion** | No new permissions, roles, RBAC UI, or trade features. |
| **No repo normalization** | `lib/` / `components/` / layout / declaration refactors — **separate lane**, not mixed into Hot Sales commits. |
| **No conflation** | Guardian Auth, portal atmosphere, declaration domain — **out of scope** for this rollout. |

---

## Canonical refs

| Item | Value |
|------|--------|
| Production URL | `https://iam-check.vercel.app` |
| Production Neon branch | `br-tiny-hill-ao82jp6f` (**only** — not `dev-spec-b`) |
| Phase 1 tag | `hot-sales-phase-1` → `1bc1294` |
| Phase 2A tag | `hot-sales-phase-2a` → `8e650ff` |
| Post-tag hotfix branch | `fix/hot-sales-next-intl-trade-shell` |
| Post-tag hotfix commit | `4d203a7` — `components/trade/trade-shell.tsx` |
| Production deploy (hotfix) | `dpl_3pPtX2wDjSGM2ydPvHjQBVwy5w93` |

---

## Gate status (2026-07-09)

Operational gates map to [PHASE-2A-RELEASE-READINESS.md](./PHASE-2A-RELEASE-READINESS.md) promotion order. They are **rollout tracking labels**, not a second PRD implementation gate.

| Gate | Description | Status |
|------|-------------|--------|
| **1** | Flag-dark safety review | ✅ Passed |
| **2** | Explicit `HOT_SALES_RBAC_ENABLED=false` sync | ✅ Passed |
| **3** | Flag=false production deploy smoke | ✅ Passed |
| **4 repair** | Production DB migrate (`013` + `014`) | ✅ Complete |
| **4 fix** | next-intl TradeShell SSR crash (`4d203a7`) | ✅ Merged to `main` (`ee14f10`) |
| **4 admin** | Phase 1 admin matrix (flag off) | ✅ Passed |
| **4B** | Phase 1 sales allowlist matrix (flag off) | ✅ **Closed — data/setup** (matrix rows 6–10 pending operator data) |
| **5** | `requestTransferAction` / transfer-lite triage | ⏸ Blocked until Gate 4B matrix re-run passes |
| **6** | Controlled `HOT_SALES_RBAC_ENABLED=true` | ⏸ Blocked |
| **7** | Production RBAC enable | ⏸ Blocked |

**Gate 4 overall:** admin ✅, sales allowlist **classified as data/setup** ✅. **Do not advance to Gate 5** until operator adds production data and matrix rows 6–10 pass.

---

## Gate 4B — sales allowlist matrix (closed — data/setup)

**Purpose:** Verify Phase 1 allowlisted sales behavior in production with `HOT_SALES_RBAC_ENABLED=false`.

**Lane:** Ops / production data setup. **Not** code cleanup, Normalize, or 2B–2D.

### Sales test identity (close drift)

| Account | Role in app | Hot Sales access |
|---------|-------------|------------------|
| `SHARED_ADMIN_EMAIL` | Phase 1 admin (`isAdminSession`) | Full admin trade path — **not** the sales matrix account |
| `PREVIEW_CLIENT_EMAIL` | S16 declaration **preview client** | **Not** auto-allowlisted. `scripts/seed-production.mjs` does **not** insert into `hot_sales_sales_member`. Use only if explicitly allowlisted in production data. |

**Redirect to `/client` is expected** when a signed-in non-allowlisted user hits `/trade`:

1. `requireTradeAccess()` → `/auth/sign-in?reason=trade-access-denied`
2. Auth page sees existing session → `getAuthenticatedLandingHref()` → `/client`

This is **not** an RBAC regression. It indicates missing `hot_sales_sales_member` row or wrong test user.

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
  and table_name = 'hot_sales_sales_member'
order by ordinal_position;

-- 3. Check intended sales email (use actual column names from step 2)
select * from hot_sales_sales_member where active = true;
```

If the sales test email is missing: add via **approved admin UI** (`/trade/vi/admin/events/{id}/setup` → Sales allowlist) or documented production data-ops. Record as **production data setup**, not code scope.

### Production evidence (2026-07-09)

**Branch verified:** `production` (`br-tiny-hill-ao82jp6f`) — not `dev-spec-b`.

```sql
select * from hot_sales_sales_member where active = true;
-- Result: 0 rows (table exists; no allowlisted sales users in production)

select count(*) from hot_sales_event;
-- Result (post-setup): 1 open event + 1 product on br-tiny-hill-ao82jp6f
-- Event: GATE-4B-PROD-20260709 · Gate 4B Production SKU · final_confirmed_quantity=100
```

**Verdict (classification):**

```text
Sales account: none allowlisted / allowlist row: no
Active open event + product: yes (br-tiny-hill-ao82jp6f · GATE-4B-PROD-20260709)
Rows 6–10: deferred — pending operator production data setup
/client bounce with PREVIEW_CLIENT_EMAIL or any non-allowlisted session: expected (not code)
Gate 4B: CLOSED — data/setup lane (not code)
```

**Operator next steps (production data only):**

1. Sign in as `SHARED_ADMIN_EMAIL` → create event via `/trade/vi/admin/events/new`
2. Complete setup → add intended sales email to allowlist on event setup
3. Re-run matrix rows 6–10 with that allowlisted account
4. Record matrix pass before advancing to Gate 5

### Event/product prerequisite (rows 7–8)

Before order-create tests, production needs:

- At least one **open** Hot Sales event
- At least one product with supply configured
- Setup complete enough that sales UI is not a dead end

Admin create-event → setup flow already passed; use that path for minimal test data if approved.

### Gate 4B matrix (re-run only these)

| # | Scenario | Expected |
|---|----------|----------|
| 6 | Allowlisted sales `/trade/vi/events` | Trade events page — **not** `/client` bounce |
| 7 | Allowlisted sales order create | Order created or valid submit flow |
| 8 | Allowlisted sales `/trade/vi/my-orders` | Own orders visible |
| 9 | Allowlisted sales `/trade/vi/admin/events` | Redirected / denied (non-admin) |
| 10 | Allowlisted sales `/trade/vi/admin/events/new` | Denied server-side / not allowed |

Row 10: prefer **server action guard** evidence over UI-only routing checks ([ADR-001](./ADR-001-phase-2-rbac.md) server-side enforcement).

### Gate 4B verdict template

```text
Sales account: <email domain only> / allowlist row: yes|no
Active open event + product: yes|no
Row 6–10: pass|fail + notes
Gate 4B: PASS | FAIL
```

---

## Hotfix merge requirement

✅ **Complete (2026-07-09):** `fix/hot-sales-next-intl-trade-shell` @ `4d203a7` merged to `main` as `ee14f10`. Safe to deploy from `main` without reintroducing the TradeShell SSR crash.

---

## Stashed / WIP policy

Keep unrelated stashes parked until Gate 4B closes. Test-only deltas belong in a separate **Test lane** commit after rollout gates — do not pop into production deploys.

---

## Classification reference (Gate 4 sales failure)

| Symptom | Likely cause | Lane |
|---------|--------------|------|
| `/client` after `/trade` | Non-allowlisted session; preview client without `hot_sales_sales_member` row | Gate 4B data |
| Order create fails | No open event / no products | Gate 4B data |
| Admin routes fail | Separate issue — admin matrix already passed | Not Gate 4B |

**Not:** RBAC flag regression · schema migration issue (post-014) · permission redesign

---

## Agent prompt (Gate 4B — paste-ready)

```md
Lane: Ops / data setup only.
Boundary: hot-sales-phase-2a @ 8e650ff; HOT_SALES_RBAC_ENABLED=false.
Target: https://iam-check.vercel.app · DB branch br-tiny-hill-ao82jp6f only.

Tasks:
1. Confirm sales test email in hot_sales_sales_member (active).
2. Do not assume PREVIEW_CLIENT_EMAIL is allowlisted.
3. Ensure open event + product exists for order flow.
4. Re-run Gate 4B rows 6–10; report verdict.

Forbidden: RBAC enable, schema change, new permissions/UI, 2B–2D, lib/components cleanup.
```

---

## Related docs

| Doc | Role |
|-----|------|
| [README.md](./README.md) | Documentation index |
| [PHASE-2A-OPS-ROLLOUT.md](./PHASE-2A-OPS-ROLLOUT.md) | Checklist items |
| [PHASE-2A-RELEASE-READINESS.md](./PHASE-2A-RELEASE-READINESS.md) | Promotion order + matrix |
| [PHASE-2A-SLICES.md](./PHASE-2A-SLICES.md) | Implementation **closed** |
| [PRD-V2-Phase2.md](./PRD-V2-Phase2.md) | Product contract (Accepted) |
