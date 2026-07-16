# RB-001 Multi-org Ops

| Field | Value |
|-------|-------|
| **ID** | RB-001 |
| **Category** | Runbook |
| **Version** | 1.3.2 |
| **Status** | Living |
| **Control State** | Closed |
| **Owner** | Platform |
| **Updated** | 2026-07-17 |

---

# 1. Purpose

Operator runbook for multi-org tenancy backfills, null audits, recovery posture, DB performance baseline evidence, and isolation checks after M1–M3.

**Authority:** [ARCH-023 Multi-Tenancy Model](../architecture/ARCH-023-multi-tenancy.md) (architecture SSOT — Neon shared-schema posture + production efficiency).  
**Audience:** operators applying tenancy backfills after M1–M3.

---

# 2. Scope

## 2.1 In scope

- Explicit Neon Auth organization id resolution
- FFT access backfill and tenant-root null audit
- Neon production recovery posture (PITR / snapshots)
- Neon DB performance baseline (CU / suspend / pooler / latency evidence)
- Migrations and isolation smoke related to multi-org

## 2.2 Out of scope

- Product feature design (owned by ARCH-023 / FFT module spines)
- Reopening Rejected / Deferred Decision lock rows without explicit approval

---

# 3. Procedure

## 3.1 Rules

1. **Never** stamp “first org” from `neon_auth.organization ORDER BY … LIMIT 1` when more than one Auth org exists.
2. Pass an explicit Neon Auth organization id for any script that fills null `organization_id` rows.
3. Prefer row-scoped `organization_id` already on tenant tables; fallback only when the CLI/env org is provided.

## 3.2 Resolve organization id

```sql
SELECT id, name, slug, "createdAt"
FROM neon_auth.organization
ORDER BY "createdAt" ASC NULLS LAST;
```

Use the id for the tenant you intend to backfill — not Neon Cloud `NEON_ORG_ID`.

## 3.3 FFT access backfill

```bash
pnpm validate:neon-env
node --env-file=.env.local scripts/backfill-fft-access.mjs --dry-run --organization-id=<org-uuid>
node --env-file=.env.local scripts/backfill-fft-access.mjs --organization-id=<org-uuid>
```

Or: `PORTAL_ORGANIZATION_ID=<org-uuid> pnpm backfill:fft-access`.

If every candidate row already has `organization_id`, the flag is optional.

## 3.4 Null audit

```bash
pnpm audit:tenancy-nulls
```

Must report zero nulls on the eight hard tenant roots after Gate 0 / migration `027`.

## 3.5 Auth tenant org (product)

Do not confuse Neon Cloud `NEON_ORG_ID` with Neon Auth organization id.

| Field | Value (prod as of 2026-07-12) |
|-------|-------------------------------|
| Auth org id | `4587e4c8-8119-4761-91ce-b874d3493aad` |
| Slug / name | `afenda-lite` |
| Count | 1 Auth org on production branch |
| Operator login | `SHARED_ADMIN_EMAIL=afenda@admin.com` (password in `.env.local`) |
| Local env | `PORTAL_ORG_SLUG` / `PORTAL_ORG_NAME` / `PORTAL_ORGANIZATION_ID` / `E2E_ORGANIZATION_ID` — see [post-lock cheat sheet](./RB-005-post-lock-coding-cheat-sheet.md) §3.4 |

## 3.6 FFT access backfill evidence (E1 — 2026-07-12)

```text
Dry-run: wouldGrant=0 (no-op — rows already stamped)
Live write: skipped (nothing to grant)
Command: node --env-file=.env.local scripts/backfill-fft-access.mjs --dry-run --organization-id=4587e4c8-8119-4761-91ce-b874d3493aad
```

## 3.7 Neon production recovery posture (N3)

**Org / project:** `org-fragrant-lake-90358173` (Launch) · `young-hat-54755363` (**Afenda-Lite**) · branch `br-tiny-hill-ao82jp6f` (`production`, protected).

Typed targets live in `@afenda/env` (`neon-recovery-posture`). Read-only verify: `pnpm validate:neon-env` (N1 contract + N3 retention/branch/snapshot inventory + N4 CU/latency). **CI/deploy stay restore-free and migrate-free** (`db:check` only).

### Controls — target vs live config

| Control | Target | Live config (API 2026-07-17) | Status |
|---------|--------|------------------------------|--------|
| Protected / default / primary branch | `br-tiny-hill-ao82jp6f` · protected | Confirmed MCP + API | **PASS** |
| PITR / history window | **7 days** (`history_retention_seconds=604800`) | `604800` via `GET /projects` | **PASS** |
| Snapshot schedule | Daily **17:00 UTC**, retain **14 days**, root branch | Inventory: five consecutive `snapshot_*` at 17:00:05Z, expire +14d; `/snapshot_schedules` **404** (not used) | **PASS** (inventory inference) |
| Latest scheduled snapshot | Age ≤ **26h** | `snap-dry-bread-aomnu65c` · `2026-07-16T17:00:05Z` | **PASS** |
| Manual snapshots | Before migrate / bulk / destructive | Name: `pre-<change>-YYYY-MM-DD` | Operator duty |
| Compute | min **0.25** / max **2** / suspend **0** | API default endpoint settings match | **PASS** |
| Region | `aws-ap-southeast-1` | Confirmed | **PASS** |

**Schedule evidence (independent audit 2026-07-17):** `/snapshot_schedules` HTTP **404**. Five consecutive scheduled rows on root — `snap-dry-bread-aomnu65c` (2026-07-16) · `snap-patient-heart-aobvdjcr` (2026-07-15) · `snap-lively-darkness-aomk92aa` (2026-07-14) · `snap-frosty-tree-ao1r9bb5` (2026-07-13) · `snap-purple-glitter-ao8tozz5` (2026-07-12) — each `hourUTC=17` · `retainDays=14`. Inventory inference is the automated PASS; script does **not** claim schedule-API PASS.

**Console verify (operator — periodic drift check):** Settings → Backup / Snapshots — confirm daily schedule toggle still **17:00 UTC / 14d** on root when Console access is available. Covered by ARCH-023 ASSUMPTION; not required to re-open N3 while consecutive inventory stays green.

**PITR vs snapshots:** history covers “something broke sometime yesterday”; named snapshots cover “known-good before Release X.” Use both. Launch PITR max is 7d — longer window needs Scale (**BLOCKED_EXTERNAL** / billing).

### RPO / RTO (numeric)

| Metric | Target | How measured | Live config | Drill measured |
|--------|--------|--------------|-------------|----------------|
| **RPO — PITR** | ≤ **60 seconds** lag from last known-good write to chosen restore timestamp (inside 7d window) | Wall-clock: incident last-good UTC → restore timestamp UTC | PITR window **7d** live | **Not measured this drill** — snapshot path used |
| **RPO — snapshot fallback** | ≤ **24 hours** | Age of latest successful scheduled snapshot at incident time | Daily 17:00 UTC inventory | **0.9 h (54.1 min)** — `snap-dry-bread-aomnu65c` age at recovery start · PASS ≤24h |
| **RTO — ephemeral drill** | ≤ **30 minutes** | Restore start UTC → SQL integrity PASS UTC on **drill** branch | n/a (procedure below) | **0.58 min** (2026-07-16T17:54:09Z → 17:54:44Z) · PASS ≤30 |
| **RTO — production cutover** | Not claimed in N3 | Requires separate explicit operator auth | Prod branch must stay untouched | **Out of scope** |

Do **not** claim PITR RPO readiness until a PITR-path drill is measured (or named **BLOCKED_EXTERNAL**). Snapshot RPO + ephemeral RTO measured 2026-07-16 (evidence below).

### Ephemeral restore drill procedure (executed 2026-07-16 — requires explicit operator auth this chat)

**Hard rules**

1. Restore only to a **new** ephemeral branch — never mutate `br-tiny-hill-ao82jp6f`.
2. `finalize_restore=false` (or Console equivalent that does **not** replace production).
3. No snapshot delete, no branch reset of production, no `finalize_restore=true` on prod.
4. Redact connection strings / secrets from all logs and RB-001 records (ids + timestamps only).
5. Delete the drill branch after evidence capture.

**Steps (operator-approved only)**

1. Confirm `pnpm validate:neon-env` green (N1 + N3 checks).
2. Choose source: latest scheduled snapshot **or** PITR timestamp inside the 7d window.
3. Create restore → **new** branch name `restore-drill-n3-YYYY-MM-DD` (or Console-generated id). Record `source id` + `drill branch id`.
4. Mark **Recovery start** UTC.
5. On **drill** branch only: SQL integrity (tenant-root counts + null-org checks). Example shape:

```sql
-- drill branch only — never point product DATABASE_URL at drill
SELECT count(*) AS surveys FROM surveys;
SELECT count(*) AS fft_event FROM fft_event;
SELECT count(*) AS auth_orgs FROM neon_auth.organization;
SELECT count(*) AS surveys_null_org FROM surveys WHERE organization_id IS NULL;
```

6. Mark **SQL PASS** UTC; compute RTO minutes; compute applicable RPO path.
7. Delete drill branch; re-confirm production `protected=true` / `default=true`.
8. Paste the evidence template below into this runbook (no secrets).

### N3 evidence template (filled — 2026-07-16 ephemeral drill)

```text
N3 restore drill evidence
Date (UTC):           2026-07-16
Operator:             agent (Cursor) + human mission auth
Auth this chat:       "this chat explicitly authorizes ephemeral restore (finalize_restore=false) before any restore API/Console action"
Source type:          snapshot
Source id / timestamp: snap-dry-bread-aomnu65c (created 2026-07-16T17:00:05Z)
Drill branch id:      br-dry-dream-aogba8bv (name restore-drill-n3-2026-07-17)
finalize_restore:     false
Prod branch mutated:  NO (must remain br-tiny-hill-ao82jp6f)
Recovery start UTC:   2026-07-16T17:54:09Z
SQL PASS UTC:         2026-07-16T17:54:44Z
RTO minutes:          0.58 (target ≤ 30)
RPO path:             snapshot
RPO measured:         0.9 h / 54.1 min snapshot age at recovery start (target ≤ 24h)
SQL counts:           surveys=89 fft_event=35 auth_orgs=1 surveys_null_org=0
Data validation:      PASS
Cleanup:              drill branch deleted (HTTP 404 after DELETE); prod protected=true default=true; sole remaining branch br-tiny-hill-ao82jp6f
validate:neon-env:    PASS — Result: 10 passed, 0 failed (N1 + N3 retention/branch/snapshot inventory)
```

### Historical restore drill record (2026-07-12 — prior evidence; superseded by template above for N3)

```text
Source restore point: snap-icy-dawn-aoymlta8 (baseline-afenda-lite-cpack-2026-07-12)
Restored branch:      br-fancy-violet-aovhd2a5 (restore-drill-cpack-2026-07-12)
Recovery start:       2026-07-12T08:45:06Z
Recovery completed:   restore_status=restored; SQL ok (surveys=75, fft_event=35, auth_orgs=1, surveys_null_org=0)
Application smoke:    SQL connectivity + tenant-root counts on drill branch (finalize_restore=false — prod untouched)
Data validation:      PASS
Cleanup completed:    drill branch deleted; production remains protected=true default=true
Operator:             agent + operator approval (C-pack recommendation)
N3 note:              Superseded by 2026-07-16 filled evidence template above
```

## 3.7b Neon DB performance baseline (N4)

**Org / project / branch:** same as §3.7 (`young-hat-54755363` · `br-tiny-hill-ao82jp6f`).

Typed CU/suspend/latency targets live in `@afenda/env` (`neon-performance-posture`). Read-only verify: `pnpm validate:neon-env` (N4 compute + pooled-host evidence + timed `SELECT 1`). **Do not raise CU, suspend timeout, connection limits, or retention in this slice.** Public readiness stays boolean reachability — latency baseline is ops/validate only (no public health contract expansion).

### Controls — target vs live (API / MCP 2026-07-17)

| Control | Target | Live evidence | Status |
|---------|--------|---------------|--------|
| Autoscaling min CU | **0.25** | `autoscaling_limit_min_cu=0.25` · endpoint `ep-dawn-bird-aofi3f7j` | **PASS** |
| Autoscaling max CU | **2** | `autoscaling_limit_max_cu=2` | **PASS** |
| Suspend / scale-to-zero | **0** s | `suspend_timeout_seconds=0` | **PASS** |
| Product pooler URL | `DATABASE_URL` contains `-pooler` | N1 contract + validate | **PASS** |
| Endpoint pooled host | `-pooler` host evidence | API/MCP pooled host present (hostname redacted) | **PASS** |
| `SELECT 1` latency baseline | Recorded; ≤ **5000** ms guardrail | Emitted by `validate:neon-env` as `latencyMs=…` (single probe, not soak) | **PASS** (ops) |
| Concurrency snapshot | `max_connections` + activity | `max_connections=901` · activity active=1 idle=1 (read-only) | **PASS** (evidence) |
| `pg_stat_statements` | Enabled | extension present | **PASS** |
| Slow-query top-N | Redacted mean/total ms only | Top means < 40 ms; statements are ops/DDL/health — no tenant literals committed | **PASS** (evidence) |
| Org-index inventory (ERP roots) | Leading `organization_id` indexes on every public org-scoped table | **11/11** public tables with `organization_id`: declarations (surveys + client_* ×3) · FFT Living roots ×4 (`fft_event`, `fft_sales_member`, `fft_role`, `fft_role_assignment`) · platform role / assignment / audit — all indexed (MCP 2026-07-17) | **PASS** |
| CU / connection / retention raise | Forbidden without evidence + auth | Unchanged this slice | **PASS** (discipline) |
| Automated DB performance alerts | Hourly GitHub Actions monitor | Latency + aggregate connection pressure; deduplicated issue lifecycle | **READY** (activates on `main`) |

### Procedure (read-only)

1. `pnpm validate:neon-env` — expect N4 CU/suspend + pooled host + `SELECT 1` latency rows green.
2. `pnpm monitor:neon-performance` — expect latency ≤5000 ms and aggregate active+idle connections <80% of `max_connections`.
3. `.github/workflows/neon-performance-monitor.yml` runs hourly against the GitHub `production` environment. Failure opens or updates one `[Ops] Neon DB performance monitor failing` issue; recovery comments and closes it.
4. Optional MCP/SQL (direct): B2 concurrency · B3 org indexes · B6 / `list_slow_queries` — **redact** query text and all URLs/params from any paste.
5. Do **not** PATCH compute CU, suspend, `max_connections`, or retention. Do **not** run soak/k6 against production.
6. If latency repeatedly exceeds the validate guardrail after pooler + short-transaction hygiene: escalate with evidence — CU raise needs separate explicit auth (not N4).

### Recommendation (CU)

Keep **0.25–2 / suspend 0**. No raise. Connection pressure is negligible at capture; slow-query means are sub-40 ms. Re-measure after material product write growth before considering max-CU changes.

### Client timeout / retry honesty

Product DB client is Neon HTTP Drizzle (`@neondatabase/serverless` via `@afenda/db`) — no app-level `statement_timeout`, pool max, or retry wrapper. Documented limits: Neon HTTP transport + pooled URL. Do not invent a Pool client in N4.

### Alerts honesty

Neon Launch provides dashboards but no native automated alerts; Neon metric export requires Scale plus an external observability provider. N4 therefore uses the existing GitHub Actions + production-secret surface: hourly read-only latency and aggregate connection-pressure probes, workflow failure, and a deduplicated GitHub issue with recovery closure. CU/suspend drift remains a read-only `validate:neon-env`/operator check; the monitor does not mutate Neon or expose sensitive query details.

## 3.8 Migrations

```bash
pnpm db:check
# Forward migrate only (never sole-0000 baseline on br-tiny-hill-ao82jp6f):
AFENDA_ALLOW_DB_MIGRATE=1 pnpm db:migrate
```

Canonical path: `pnpm --filter @afenda/db db:migrate` (root `pnpm db:migrate` forwards). Deploy workflows do not migrate. Destructive DDL also needs `AFENDA_ALLOW_DESTRUCTIVE_MIGRATE=1`.

M2: `028_scoped_template_key_unique.sql` — scoped `(organization_id, template_key)` uniqueness.

## 3.9 Org switcher (M1)

Local / staged multi-org chrome:

```bash
# .env.local
PORTAL_ORG_SWITCHER_ENABLED=true
```

Do not enable on Vercel production until operators have a second membership and a rollback plan.

## 3.10 Isolation smoke (M3)

```bash
# Always: missing UUID → not-found
pnpm test:e2e:journey -- e2e/tenancy-isolation.spec.ts

# Optional foreign fixtures (cross-org):
# E2E_FOREIGN_SURVEY_ID / E2E_FOREIGN_USER_ID / E2E_FOREIGN_EVENT_ID
```

## 3.11 E2E FFT allowlist org resolve (D8 closed)

`testing/e2e/fft-allowlist.ts` resolves org in this order:

1. `PORTAL_ORGANIZATION_ID` or `E2E_ORGANIZATION_ID` (explicit fixture)
2. Sole `neon_auth.member` row for the operator user
3. Fail closed if the user has multiple memberships without an explicit org

---

# 4. References

| ID / Evidence | Relationship |
| --- | --- |
| [ARCH-023](../architecture/ARCH-023-multi-tenancy.md) | Tenancy Decision lock / Living SSOT |
| [RB-005](./RB-005-post-lock-coding-cheat-sheet.md) | Post-lock command card |
| [neon-tenancy-efficiency/reference.md](../../.cursor/skills/neon-tenancy-efficiency/reference.md) | Efficiency ladder A→E |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.3.2 | 2026-07-17 | N4 Path-to-100%: org-index evidence aligned to living public set (11/11) — removed inflated “FFT eight roots” claim. |
| 1.3.1 | 2026-07-17 | N4 alert repair: hourly GitHub latency/connection-pressure monitor with deduplicated failure issue and recovery closure. |
| 1.3.0 | 2026-07-17 | N4 DB performance baseline: CU/suspend/pooler/latency validate posture; redacted concurrency/slow-query/index evidence; alerts BLOCKED_EXTERNAL. |
| 1.2.2 | 2026-07-17 | N3 audit Path-to-100%: five-day consecutive snapshot inventory recorded; Console toggle framed as periodic ASSUMPTION (schedule API absent). |
| 1.2.1 | 2026-07-17 | N3 ephemeral restore drill executed: measured RPO (snapshot 0.9h) + RTO (0.58 min); evidence template filled; drill branch deleted; prod unchanged. |
| 1.2.0 | 2026-07-17 | N3: numeric RPO/RTO + measurement; target vs live vs drill; ephemeral drill procedure (`finalize_restore=false`) + evidence template; live API matrix; validate:neon-env recovery checks. |
| 1.1.0 | 2026-07-14 | DOC-003 six-section retrofit; package-manager commands remain `pnpm`. |
| 1.0.2 | 2026-07-14 | Bounded reopen: package-manager cutover — document `pnpm` / `pnpm exec` (repo SSOT `packageManager` + `pnpm-lock.yaml`). |

---

# 6. Notes

Runnable A→E command set: [`.cursor/skills/neon-tenancy-efficiency/reference.md`](../../.cursor/skills/neon-tenancy-efficiency/reference.md). **Closed 2026-07-12** (A–E). Accepted constraints (not backlog): **D4** deferred M5, **D5** shared-schema non-goal.
