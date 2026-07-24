# Payroll schema design — Phase 2 walking skeleton

**Status:** Accepted for first migration (`0011_payroll_foundation`)  
**Authority:** [IMPLEMENTATION_PLAN.md](../payroll-cursor-agent-pack/docs/payroll/IMPLEMENTATION_PLAN.md) Phase 2 · [PAY-DEC-003](PAY-DEC-003-money-decimal-string.md) · [PAY-DEC-004](PAY-DEC-004-statutory-jurisdiction-scope.md)

## Conventions (mirror HR / sales)

| Rule | Application |
|------|-------------|
| Tenant root | `organization_id text NOT NULL` on every table |
| Org composite unique | `(organization_id, id)` on all mutation tables |
| Audit | `version`, `created_by`, `updated_by`, `created_at`, `updated_at` |
| Idempotency | `create_idempotency_key`, `create_request_fingerprint` on creates |
| Money in DB | `numeric(24, 12)` where stored; package boundary uses string decimal |
| Effective dating | `effective_from` / `effective_to` + CHECK range |
| FK scope | Composite `(organization_id, fk_id)` within `payroll_*` only |
| No cross-module FK | No references to `hr_*`, `payment`, `journal` |

## First migration scope (8 tables)

### `payroll_calendar`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organization_id | text NOT NULL | |
| code | text NOT NULL | Unique per org + effective_from |
| name | text NOT NULL | |
| timezone | text NOT NULL | IANA |
| status | text NOT NULL | `active` \| `archived` |
| effective_from | date NOT NULL | |
| effective_to | date | nullable |
| create_idempotency_key | text NOT NULL | |
| create_request_fingerprint | text NOT NULL | |
| version | integer NOT NULL default 1 | |
| created_by, updated_by | text NOT NULL | |
| created_at, updated_at | timestamptz NOT NULL | |

**Uniques:** `(organization_id, id)`, `(organization_id, create_idempotency_key)`, `(organization_id, code, effective_from)`  
**Indexes:** `(organization_id, status)`

### `payroll_pay_group`

| Column | Type | Notes |
|--------|------|-------|
| calendar_id | uuid NOT NULL | FK → payroll_calendar |
| code, name | text NOT NULL | |
| currency_code | text NOT NULL | ISO 4217 |
| status | text NOT NULL | `active` \| `archived` |
| + idempotency, version, audit | | |

**FK:** `(organization_id, calendar_id)` → `payroll_calendar`  
**Uniques:** `(organization_id, code)`, `(organization_id, create_idempotency_key)`

### `payroll_period`

| Column | Type | Notes |
|--------|------|-------|
| pay_group_id | uuid NOT NULL | FK → payroll_pay_group |
| period_start, period_end | date NOT NULL | CHECK end >= start |
| cutoff_date | date NOT NULL | |
| status | text NOT NULL | `open` \| `closed` |
| + idempotency, version, audit | | |

**FK:** `(organization_id, pay_group_id)` → `payroll_pay_group`  
**Unique:** `(organization_id, pay_group_id, period_start, period_end)`

### `payroll_earning_rule` / `payroll_deduction_rule`

| Column | Type | Notes |
|--------|------|-------|
| pay_group_id | uuid NOT NULL | FK |
| code, name | text NOT NULL | |
| rule_type | text NOT NULL | `fixed` \| `rate` |
| amount | numeric(24,12) | nullable when rate |
| rate | numeric(24,12) | nullable when fixed |
| currency_code | text NOT NULL | |
| rule_version | text NOT NULL | monotonic label |
| status | text NOT NULL | `active` \| `superseded` \| `archived` |
| effective_from, effective_to | date | |
| + idempotency, version, audit | | |

**Unique:** `(organization_id, pay_group_id, code, effective_from)`  
**Overlap:** enforced at store layer for active rules on same code

### `payroll_statutory_rule`

| Column | Type | Notes |
|--------|------|-------|
| pay_group_id | uuid NOT NULL | |
| code, name | text NOT NULL | |
| jurisdiction_code | text NOT NULL | generic placeholder (PAY-DEC-004) |
| config_json | jsonb NOT NULL | `{}` default — no country law |
| rule_version | text NOT NULL | |
| status, effective dates | | same as earning rules |
| + idempotency, version, audit | | |

### `payroll_run`

| Column | Type | Notes |
|--------|------|-------|
| pay_group_id, period_id | uuid NOT NULL | FKs |
| run_type | text NOT NULL | `regular` \| `off_cycle` \| `adjustment` |
| sequence | integer NOT NULL default 1 | |
| status | text NOT NULL | `draft` \| `calculating` \| `calculated` \| `failed` \| `finalized` \| `reversed` |
| finalized_at, finalized_by | timestamptz / text | nullable |
| calculation_snapshot_hash | text | nullable |
| + idempotency, version, audit | | |

**Unique:** `(organization_id, pay_group_id, period_id, run_type, sequence)`  
**Immutability:** store rejects updates when `status = finalized` except transition to `reversed`

### `payroll_exception`

| Column | Type | Notes |
|--------|------|-------|
| run_id | uuid NOT NULL | FK → payroll_run |
| severity | text NOT NULL | `blocking` \| `warning` |
| exception_code | text NOT NULL | |
| message | text NOT NULL | |
| employee_ref | text | optional opaque ref — not HR FK |
| created_by | text NOT NULL | |
| created_at | timestamptz NOT NULL | append-only |

**FK:** `(organization_id, run_id)` → `payroll_run`

## Deferred (scaffold columns until later phases)

| Table | Phase |
|-------|-------|
| payroll_employee_assignment, payroll_recurring_earning, payroll_recurring_deduction, payroll_variable_input | 4 |
| payroll_run_employee, payroll_result_line, payroll_statutory_result | 5–6 |
| payroll_payslip, payroll_adjustment, payroll_reconciliation | 8–9 |

## Store contract (Phase 2)

Setup slice: calendar, pay group, period, earning/deduction/statutory rule CRUD + idempotency reads.  
Runs slice: run CRUD with optimistic version, exception append/list, finalized immutability guard.

No domain commands in Phase 2 — stores are tested directly via contract tests.

### Phase 2 exit gate — contract + live constraint inventory

**Store contract (`payroll-store-contract.test.ts`)** — memory always; Drizzle when `DATABASE_URL` + `REQUIRE_DATABASE_TESTS=1`:

| Scenario | Surface |
|---|---|
| Organization isolation | calendar read cross-org |
| Idempotent replay | calendar, pay group, period creates |
| Optimistic concurrency | stale calendar `expectedVersion` |
| Active rule overlap | earning, deduction, statutory (same code) |
| Run identity uniqueness | duplicate org + pay group + period + type + sequence |
| Finalized immutability | block non-reversal updates on finalized runs |
| Exception append/list | create blocking + warning; list org-scoped |
| Effective-date resolution | `getEarningRuleAtEffectiveDate`, `getDeductionRuleAtEffectiveDate`, `getStatutoryRuleAtEffectiveDate` |

**Live DB constraints (`payroll-schema-constraints.test.ts`)** — skipped locally without `DATABASE_URL`; under `REQUIRE_DATABASE_TESTS=1` with `DATABASE_URL` present, fails closed if migration `0011` columns are absent (probe: `payroll_calendar.code`); runs live inserts when foundation is applied:

| Class | Constraint | Proof |
|---|---|---|
| CHECK | `payroll_run_status_check` | invalid run status insert → `23514` |
| CHECK | `payroll_period_range_check` | inverted period range → `23514` |
| CHECK | `payroll_exception_severity_check` | invalid severity → `23514` |
| UNIQUE | `payroll_run_org_identity_uidx` | duplicate run identity → `23505` |
| UNIQUE | `payroll_pay_group_org_code_uidx` | duplicate pay group code → `23505` |
| FK | `payroll_exception_org_run_fk` | missing run → `23503` |
| FK | `payroll_pay_group_org_calendar_fk` | missing calendar → `23503` |

Migration `0011_payroll_foundation.sql` remains additive ALTER on scaffold tables; SQL-text assertions stay as a fast offline guard alongside live inserts.
