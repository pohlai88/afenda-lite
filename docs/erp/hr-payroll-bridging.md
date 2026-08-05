# HR ↔ Payroll Closure Guideline

**Scope:** `@afenda/human-resources` and `@afenda/payroll`
**Goal:** align the two bounded contexts, then close the missing surface, then ship enterprise-production-ready.
**Derived from:** both `README.md` files and both `AGENTS.md` files, then **validated against the source tree on 2026-08-05** (three read-only audits: payroll package, HR package + `apps/web` composition, root scripts/governance). Rows below are marked with their verified status; sign-off is still read from the doc, the manifest, and the fixtures — but this revision no longer claims gaps that the source tree already closes.

---

## 0. Three laws

Read these before opening an editor. Every later phase depends on them.

**L1 — Align before you add.**
No new domain feature is written until Phase B exits. Building `retro-pay` on top of a dual-transport handoff means writing it twice.

**L2 — One transport, one direction, one owner per fact.**
HR never imports Payroll. Payroll never imports HR. They share no transaction. One event triggers, one capability executes, one acknowledgement closes.

**L3 — Evidence outranks implementation.**
A feature is "done" when the fixture, the registry entry, the parity test, and the doc row exist. Green unit tests do not promote a lifecycle. HR's README already says this — apply the same bar to Payroll.

---

## Phase A — Decisions (blocks everything, produces no code)

Four decisions cannot be designed around. Write them down, date them, name an owner. Suggested artifact: `docs/erp/hr-payroll-decisions.md`, linked from both READMEs under **Authority**. (Not a `decisions/` directory — those are banned by repo rule; a single decisions register file under the live `docs/` trunk is the compliant shape.)

### A1 — Lifecycle coupling

Payroll is `lifecycle: "active"` (`packages/erp/payroll/src/composition/module.manifest.ts:31`, with `moduleDependencies.required: ["human-resources"]`). HR is `lifecycle: "scaffolded"` (`packages/erp/human-resources/src/composition/module.manifest.ts:213`). Payroll's entire workforce input originates in HR. An active consumer on a scaffolded producer is either rejected by governance or — worse — passes silently and ships.

**Verified 2026-08-05 — it passes silently.** `pnpm validate:modules` self-skips (its `modulesDir` points at the removed `docs-V2/modules` and exits 0), so `pnpm governance:packages` passes trivially. No live check compares lifecycles at all. The false signal is unguarded today.

| Option | Consequence |
| --- | --- |
| **Promote HR to `active`** | Requires Phase E evidence first. This is the real path. |
| **Demote Payroll to `scaffolded`** | Honest interim state. Do this today if HR promotion is more than one sprint away. |
| Leave as-is | Not an option. It is a false signal in the manifest. |

**Rule to encode:** a module may not declare `lifecycle: "active"` if any module it consumes a capability from is `scaffolded`. Enforce in `pnpm validate:modules` (see B7).

### A2 — Statutory calculator sourcing

`synth.v1` is test-only by your own doc, and production statutory activation is fail-closed. Until approved MY and VN calculators exist, Payroll is not production-ready in any sense — every other item on this page is secondary.

Decide per jurisdiction: build in-house, license a vendor table, or subscribe to a rates feed. Record the **authoritative source** for each instrument:

| Jurisdiction | Instrument | Authority to cite |
| --- | --- | --- |
| MY | EPF / KWSP employee + employer | KWSP contribution schedule |
| MY | SOCSO + EIS / PERKESO | PERKESO contribution tables |
| MY | PCB / MTD, EA form, CP8D, CP39 | LHDN |
| VN | SI / HI / UI (BHXH, BHYT, BHTN) | Vietnam Social Security + regional minimum-wage decree |
| VN | PIT, annual finalization | General Department of Taxation |

### A3 — Retention legal basis vs. privacy erasure

HR `privacy` deletes/anonymizes `hr_*`. Payroll must retain payslips, statutory identifiers, and contribution evidence for a legally mandated period. Nothing in either doc says HR deletion must not cascade into payroll evidence. **This is a legal defect, not a code defect.**

Baselines to confirm with counsel and then cite in the doc (I am not a lawyer; treat these as starting points, not advice):

- Malaysia — income tax records commonly retained ~7 years; EPF/SOCSO contribution records carry their own statutory retention.
- Vietnam — accounting documents used for accounting and statistics commonly retained ~10 years; payroll registers generally fall in this class.

**Decision to record:** Payroll applies **restriction**, not erasure, until the retention clock expires. Restriction = row survives, is excluded from all read models and exports, and is reachable only through an audited legal-hold path.

### A4 — Settlement authority

Payroll requests disbursement via `payroll.payment-requested.v1` and never learns the outcome. Decide now:

- Payroll may emit a compensating reversal **only while the disbursement is un-settled**.
- Once Payments reports settled, the recovery path is a **clawback receivable owned by Accounting**, not a payroll reversal.
- Therefore Payroll needs an inbound settlement fact (Phase D2). Without it, reversal is unbounded and can double-pay.

**Phase A exit:** `DECISIONS.md` merged, four decisions dated and owned, both READMEs link it.

---

## Phase B — Refactor and align (no new domain features)

### B1 — Transport: already collapsed (correction, verified 2026-08-05)

The original revision of this guideline claimed two divergent mechanisms (HR push-event vs. Payroll pull-port) and proposed three new `apps/web` workers. **The source tree disproves this — there is one transport, push-based with synchronous ingest, and it is live:**

```
HR command (queuePayrollDelivery)
  └─ hr_payroll_handoff_delivery row (status: pending) — one HR transaction
        │
apps/web producer (modules/platform/domain/human-resources-payroll-delivery.ts)
  ├─ 1. ingestApprovedPayrollHandoff(...)  → payroll_accepted_handoff row (idempotent)
  └─ 2. publish platform.human-resources.payroll-delivery.requested.v1
        (fan-out telemetry only — NOT the ingest path)
        │
HR feedback (recordPayrollDeliveryFeedback: acknowledged | rejected | correction_required)
```

- `PayrollWorkforceCapability` (`packages/erp/payroll/src/facade/contracts.ts`) is a declared **optional override**; production wires no workforce port (`apps/web/lib/erp/payroll-command-options.ts` — "no calculation-time pull from HR"). There is no pull and no double ingress.
- Retry/recovery exists: `recoverPendingPayrollDeliveries` + the HR reliability worker (`apps/web/modules/platform/domain/human-resources-reliability-worker.ts`), bounded attempts (default 3, max 10, terminal `failed`).
- Corrections are atomic supersessions (`store.createCorrection` with `expectedSourceVersion` optimistic locking, two-way `supersedesDeliveryId` / `supersededByDeliveryId` links).

**Remaining B1 work (the real residue):**

| Item | Detail |
| --- | --- |
| Non-atomic ingest + publish | Producer step 1 (payroll ingest) and step 2 (event publish) share no transaction. Safe today only because ingest is idempotent — which makes C1's hash-conflict rule load-bearing, not cosmetic. Document the invariant; do not "fix" it by coupling the transactions. |
| Dormant pull port | Decide: delete `workforce` from the capability options, or document it as a test-only seam. An undocumented optional ingress is how a second transport grows back. |
| README wording | Payroll's README still describes arrival "through `PayrollWorkforceCapability`". Rewrite both READMEs to describe the single push/sync-ingest transport above, identically. |

### B2 — Symmetry matrix (verified against source 2026-08-05)

Bring both packages to the same row set. Missing cells are the work — but several rows the first revision called missing already exist; those are now ✅ with paths.

| Artifact | HR | Payroll |
| --- | --- | --- |
| `README.md` | ✅ | ✅ |
| `AGENTS.md` | ✅ | ✅ |
| `PRODUCTION_READINESS.md` | ❌ **add** | ✅ |
| `docs/PRD.md` | ✅ | ✅ (`PAYROLL-PRD-MY-VN.md`) |
| `docs/development-roadmap.md` | ✅ | ❌ **add** |
| `docs/baseline-verification.md` | ✅ | ❌ **add** |
| `__tests__/fixtures/public-contract.fixture.json` | ✅ | ❌ **add** |
| `__tests__/fixtures/registry-projection.fixture.json` | ✅ | ❌ **add** |
| `__tests__/fixtures/consumer-inventory.fixture.json` | ✅ | ❌ **add** |
| `__tests__/fixtures/architecture-debt.fixture.json` | ✅ | ❌ **add** |
| Canonical operation registry | ✅ | ✅ **exists** — `src/kernel/operations/registry.ts` + per-feature `operation-registry.ts` (8 features) + registry test |
| Canonical emission registry | ✅ | partial — `src/kernel/emissions/mutation-tables.ts` + `features/payroll-runs/lifecycle-events.ts` + manifest `events.emits`; no single `emission-registry.ts` (B4) |
| Unit loop (`test:*:unit`) | ✅ `test:hr:unit` | partial — vitest `payroll` project exists (33 test files); no `test:payroll:unit` / `check:payroll` root scripts |
| Parity loop (`test:*:parity`, Neon) | ✅ dedicated config | partial — live-DB harnesses exist inside the unit project (`payroll-constraint-live.ts`, `payroll-store-parity-harness.ts`); no dedicated parity config, no failure-injection dir — **highest engineering priority (B5)** |
| Feature-first layout guard test | ✅ | ✅ **exists** — `__tests__/feature-first-layout.test.ts` |
| `./testing` subpath | ✅ declared | `src/testing/` exists, subpath undeclared in `exports` — **declare it** |
| Composition entries table in README | ✅ | ❌ **add** (composition dir itself exists: manifest, drizzle adapters, production ports, store slices) |
| Reliability worker | ✅ | ❌ **add** |
| Observability | ✅ module | partial — `PayrollObservabilityPort` in `src/kernel/execution/ports.ts`, threaded through command options; no feature module |
| Tenant-injection doctrine in README | ✅ | ❌ **add** |
| Privacy feature | ✅ | ✅ **exists** (D1) — `src/features/privacy/` restriction/retention/DSAR |
| Durable job feature | ✅ `bulk-jobs` | ✅ `payroll-jobs` (Phase D6) |
| Currency/clock/statutory injected into capability | n/a | ❌ **add** (B3 — confirmed: options accept only `authorization` required, `observability?`/`workforce?` optional) |

Also align governance posture: Payroll's README says `pnpm validate:modules --write`, HR's says `pnpm validate:modules`. Pick check-only for CI and `--write` for local; state it identically in both.

### B3 — Payroll capability signature

Current: `createPayrollCapabilityOptions({ authorization, workforce })`. That is not enough to compute money correctly.

```ts
export interface PayrollCapabilityOptions {
	authorization: PayrollAuthorizationCapability;
	workforce: PayrollWorkforceCapability;
	currency: PayrollCurrencyCapability;   // NEW
	clock: PayrollClockCapability;          // NEW — determinism + effective dating
	statutory: PayrollStatutoryCapability;  // NEW — calculator resolution, fail-closed
}
```

**Why `currency` is mandatory, not cosmetic:**

- VND is a **zero-decimal** currency. MYR is two-decimal. A single "12 fractional digits" parse rule says nothing about how a computed contribution is rounded to a payable amount.
- MY EPF is derived from a **wage-band schedule** at lower wages and **rounds up to the next ringgit** — a table lookup plus ceiling, not a percentage multiply.
- Rounding is therefore **calculator-owned per statutory rule**, not a global money setting. Encode rounding mode in the rule version, snapshot it onto the run.
- FX: if any pay component is agreed in a non-payout currency, the rate **date** policy must be pinned (period end vs. payment date) and the rate snapshotted onto the run.

**Why `clock` is mandatory:** every effective-dated resolution and every "current period" decision must be injectable, or parity tests are non-deterministic.

### B4 — Payroll emission registry (correction: operation registry already exists)

The first revision claimed Payroll had no operation registry. **Wrong** — `src/kernel/operations/registry.ts` (+ `define-registry.ts`, `module-ids.ts`) plus per-feature `operation-registry.ts` files in 8 features already declare operations, with `__tests__/operation-registry.test.ts` guarding them. The README undersells this; fix the README, not the code.

Remaining B4 work:

1. **Emission registry** — emissions are split across `src/kernel/emissions/mutation-tables.ts`, `src/features/payroll-runs/lifecycle-events.ts`, and the manifest's `events.emits`. Consolidate into one canonical `src/kernel/emissions/emission-registry.ts` that the fixture projects from.
2. **`registry-projection.fixture.json`** — the frozen projection of the operation + emission registries (B2 row).
3. **Stale authority citation** — `src/kernel/emissions/mutation-tables.ts:15` cites the retired `docs-V2` trunk. Remove it (banned trunk).

### B5 — Payroll parity loop (highest engineering priority in Phase B)

Payroll makes the strongest transactional claim in the repository — run row + audit + outbox committed in a single production DB transaction — and ships the weakest test loop. Mirror HR exactly:

| Loop | Command | Content |
| --- | --- | --- |
| Inner | `pnpm test:payroll:unit` / `pnpm check:payroll` | Memory only, parallel, no Neon |
| Package | `pnpm --filter @afenda/payroll test` | Unit project only |
| Outer | `REQUIRE_DATABASE_TESTS=1 pnpm test:payroll:parity` | Serial: parity, concurrency, failure injection |

**Proven template in-repo:** mirror `packages/erp/corporate-administration/__tests__/failure-injection/` — real Neon drizzle stores, an injected failing outbox port, rollback assertions on entity rows + mutation receipts + outbox events, with helper pair `neon-cleanup.ts` / `neon-parity.ts` (env-gated skip). Payroll needs its own helper pair under `__tests__/helpers/`; existing live-DB harnesses (`payroll-constraint-live.ts`, `payroll-store-parity-harness.ts`) are the starting point.

Failure-injection cases that must exist before ship:

1. Outbox insert fails after run row insert → whole transaction rolls back, no orphan run.
2. Audit insert fails → command fails closed, nothing persisted.
3. Two concurrent finalizes on one run → exactly one wins, one returns a conflict `Result`.
4. Worker crashes between event emit and dispatch → redelivery produces no second payment request.
5. Same `deliveryId` delivered twice concurrently → one accepted row, one idempotent ack.

### B6 — Drain the outbox

Payroll emits `payroll.payment-requested.v1` and `payroll.posting-requested.v1` (built in `src/features/payroll-runs/lifecycle-events.ts`, appended via `createSqlOutboxPort` at finalize). **Verified 2026-08-05: nothing consumes them — and no module's outbox is drained anywhere in the monorepo.** There is no platform dispatcher, worker, or cron reading any outbox; this is a platform-wide gap, not a payroll defect. (HR's handoff works despite this because its ingest is synchronous; the published platform event is fan-out telemetry.)

Consequence: draining requires a **platform outbox-dispatcher decision plus a Payments/Accounting-side consumer** — a cross-module slice, not a payroll-local worker. Track it as its own mission. Until then, add the governance check as a declared-debt gate: **every emission in the registry must have a registered dispatcher**. An undrained outbox is a silent "payroll ran but nobody got paid."

### B7 — Governance checks to add

**Context (verified 2026-08-05):** `validate:modules` self-skips (dead `docs-V2/modules` path) and `governance:packages` is a thin wrapper over it — so today there is **no live module governance at all**. Its dormant machinery included dependency-DAG and workspace-edge checks that would cover cross-imports; lifecycle coupling was never checked even when live. New checks should read module manifests directly rather than resurrecting the `docs-V2` roadmap dependency.

| Check | Rule |
| --- | --- |
| `governance:lifecycle-coupling` | `active` module may not depend on a `scaffolded` module (A1) — read `module.manifest.ts` lifecycles + `moduleDependencies` directly |
| `governance:erp-symmetry` | Both ERP packages carry the same doc, fixture, and script set (B2) |
| `governance:emission-drain` | Every registered emission has a registered dispatcher (B6) |
| `governance:cross-import` | No `@afenda/payroll` ↔ `@afenda/human-resources` import in production source (today only implicit: neither declares the other in `package.json`) |
| `governance:architecture-debt` | Fixture targets are enforced, not merely reported (HR already CI-binds its fixture; extend to payroll) |

**Phase B exit gate — all must be true:**

- [ ] One transport documented identically in both READMEs; the pull-only wording is gone. (Transport itself is already collapsed — B1; this is a docs + dormant-port decision.)
- [ ] Payroll parity loop runs green against Neon, including all five failure-injection cases.
- [ ] Payroll's four fixtures exist and are asserted in CI.
- [ ] Payroll emissions are drained by a registered dispatcher.
- [ ] Capability signature updated; no calculator reads a global clock or a hardcoded currency.
- [ ] Symmetry matrix has no ❌ except items explicitly deferred to Phase D with a dated ticket.

---

## Phase C — The handoff contract, implemented

These are the eight rules that stop the race. They are cheap: mostly documentation, one unique index, one status enum. Write them into both READMEs and both PRDs.

### C1 — Idempotency (corrected to actual schema, verified 2026-08-05)

`payroll_accepted_handoff` exists (`packages/data-plane/db/src/schema/payroll.ts:1054`) with unique `(org, createIdempotencyKey)`, a partial-unique active-identity constraint, and supersession checks — but **no `deliveryId` column**. Delivery identity rides on the producer-chosen idempotency key: the `apps/web` producer passes `payroll-delivery:${deliveryId}` — **`payloadHash` is not part of the consumer key**, while HR's event-side dedupe key *does* include the hash (`human-resources-payroll-delivery.ts:59`).

Deeper source check (`accepted-handoff.drizzle.ts:97-105`, `accepted-handoff.memory.ts:47-55`): **the hash-conflict hard reject already exists** — replay of the same idempotency key with a changed `payloadHash` returns `CONFLICT` ("Idempotency key replay with a changed payload is rejected") in both adapters, and `payloadHash` is stored on every row. C1's core rule is closed.

| Case | Behaviour |
| --- | --- |
| Same `deliveryId`, same `payloadHash` | ✅ Idempotent replay returns the sealed row |
| Same `deliveryId`, different `payloadHash` | ✅ `CONFLICT` hard reject (both adapters) |
| New `deliveryId`, superseding content | ⚠️ Accepted — but see C2: revision is not checked |

Residual C1 work: the rejection is a generic `CONFLICT` `Result`, not the typed `payload_hash_conflict` acceptance union of C4, and no payroll run exception is raised — wire those when C4 lands. The real open defect in this area is **C2**, below.

### C2 — Ordering (confirmed open defect, verified 2026-08-05)

Every fact carries `(employeeId, effectiveDate, contractVersion)`. Payroll must reject any `contractVersion` ≤ the version already stored active for that identity. **This is the rule that actually kills the race** — retries, redelivery, and out-of-order arrival all become harmless.

**Current code does not check it.** The supersession CTE in `accepted-handoff.drizzle.ts` (and the memory adapter) supersedes whatever row is active on identity match alone — a stale delivery arriving under a fresh idempotency key, carrying an older `contractVersion`, will silently supersede newer accepted data. This is the highest-value small fix in the whole guideline: compare `contractVersion` against the active row and return a `stale_revision`-class `CONFLICT` instead of superseding.

### C3 — Period freeze

```
open → inputs_locked → calculated → approved → finalized → posted
```

Handoffs are accepted **only** in `open`. After `inputs_locked`, an incoming correction is stored as a next-period retro item (Phase D3) and never mutates the current run.

### C4 — Explicit acknowledgement

Payroll returns a discriminated result; HR records it and never assumes success.

```ts
type HandoffAcceptance =
	| { status: "accepted"; acceptedHandoffId: string; periodId: string }
	| { status: "rejected"; reason: HandoffRejectionReason }
	| { status: "deferred_to_next_period"; reason: HandoffDeferralReason; targetPeriodId: string };

type HandoffRejectionReason =
	| "payload_hash_conflict"
	| "stale_revision"
	| "unknown_employee"
	| "no_pay_group_membership"
	| "schema_version_unsupported"
	| "organization_mismatch";
```

Rejections re-enter HR's correction workflow. `deferred_to_next_period` is **not** a failure and must not trigger producer retry.

### C5 — Scope split

HR facts answer *"is this person payable, on what terms, effective when."*
Payroll pay-group membership answers *"is this person in this run."*
Neither side infers the other's answer. Never derive pay-group from HR department.

### C6 — Termination is a fact, not a recalculation

A mid-period termination arriving after `inputs_locked` creates a Payroll **exception requiring human clearance**. It never silently changes a calculated run.

### C7 — Retention beats erasure

HR privacy deletion is scoped to `hr_*` only. Payroll evidence is held under a separate statutory legal basis and applies restriction until the retention clock expires (A3). Write this in both READMEs and both PRDs — it is the one rule an auditor will ask for by name.

### C8 — Reversal is bounded by settlement

Compensating correction only while un-settled; otherwise clawback receivable in Accounting (A4). Requires D2.

### C9 — Segregation of duties on finalize (confirmed gap, verified 2026-08-05)

Finalization is the highest-risk action in the module and has **no maker-checker in code**. Actual permission codes (`src/kernel/execution/permissions.ts`) are `payroll.run.create/calculate/review/finalize/reverse` — **there is no `payroll.run.approve` anywhere in the repo**, and `finalizePayrollRun` (`src/features/payroll-runs/finalization.ts`) stamps `finalizedBy: actorUserId` with no identity comparison against who calculated or reviewed.

- Add `payroll.run.approve` as a distinct permission (or bind maker-checker to the existing `review` step — decide and record which).
- Reject when the finalize `actorUserId` equals the approve/review `actorUserId` on the same run.
- Break-glass override requires a distinct permission and writes a dedicated audit reason.

**Decision 2026-08-05:** maker-checker shipped as calculate-actor ≠ finalize-actor on the `calculated → finalized` transition; distinct `payroll.run.approve` + break-glass permission land with the approval-workflow slice (tracked in the A-decisions register).

### C10 — Tenant-injection doctrine for Payroll

HR states that schemas reject tenant-field injection and the composition root stamps `organizationId`, `actorUserId`, `correlationId` after validation, deriving hard-tenant-root names from `packages/data-plane/db/src/hard-tenant-roots.ts`. Payroll says nothing. Copy the doctrine verbatim and add the schema-level rejection tests.

---

## Phase D — Missing features and functions

Only start here once Phase B's exit gate is green.

### D0 — Facts your handoff does not yet carry

Before building calculators, widen the contract. These are required by MY/VN statutory math and appear nowhere in either README:

| Fact | Needed for | Owner |
| --- | --- | --- |
| Tax residency status | VN PIT resident vs. non-resident rates; MY residence rules | HR |
| Dependants / relief declarations | VN family deduction; MY PCB reliefs | HR |
| Statutory identifiers (tax file no., EPF/SOCSO no., SI book no.) | Filings and contributions | HR (held), Payroll (restricted-read) |
| Regional minimum-wage zone (VN) | SI/HI/UI contribution caps | HR or Payroll setup — **decide and record** |
| Nationality / expatriate flag | Contribution eligibility and rate variants | HR |
| Year-to-date aggregates | **MY PCB is a cumulative annualized method** — a period-only calculator cannot be correct | Payroll (owns YTD from its own history) |
| Prior-employer YTD in hire year | Mid-year joiners' correct annual tax | HR handoff at hire |

**Architectural consequence:** the statutory calculator port signature must accept year-to-date aggregates and prior-employer figures, not only current-period gross. Fix this in the port before writing any calculator, or you will rewrite all of them.

### D1 — `payroll/privacy` ✅

Payroll holds payslips, tax numbers, and statutory identifiers. Shipped 2026-08-05:

| Operation | Purpose |
| --- | --- |
| `projectPayrollFields` | Contextual field projection (`payroll.payslip.read-all`) |
| `restrictPayrollSubject` | Restriction, not erasure (A3/C7) |
| `liftPayrollRestriction` | Audited restriction release |
| `recordPayrollRetentionEvidence` | Evidence row per retention decision |
| `expirePayrollRetention` | Retention-clock expiry → eligible for erasure only — never erases |
| `respondToPayrollSubjectAccess` | DSAR export bounded by `payroll.payslip.read-own` |

Keep `payroll.payslip.read-own` and `payroll.payslip.read-all` distinct through every one of these. Payslip reads evaluate restriction only when a privacy port is composed.

### D2 — `payroll/settlement-ingress`

`reconciliation` currently has no documented input. Add inbound facts from Payments and Accounting:

| Operation | Purpose |
| --- | --- |
| `recordPaymentSettlement` | settled / failed / returned / partially settled |
| `recordPostingConfirmation` | Accounting journal posted, with reference |
| `openReconciliationDiscrepancy` | Auto-open when expected ≠ confirmed |
| `resolveReconciliationDiscrepancy` | Audited close with reason |

Blocks C8. Without it, reversal is unbounded.

### D3 — `payroll/retro-pay`

Backdated increases, late variable inputs, and corrections arriving after `inputs_locked`.

| Operation | Purpose |
| --- | --- |
| `queueRetroItem` | Deferred correction lands here (C3) |
| `calculateRetroDifference` | Recompute the sealed prior period under its **snapshotted rule version**, diff against actual |
| `applyRetroToPeriod` | Emit retro lines into the open period, labelled with origin period |
| `listRetroItems` | Exception review |

**Critical:** recomputation must use the rule version pinned on the original run snapshot, not today's rules — otherwise a rate change silently rewrites history.

**CLOSED 2026-08-05.** `retro-pay` recomputes from `payroll_run_employee.snapshot_json`, which already pins every earning, deduction, and statutory rule version the sealed run priced under; the live setup tables are never read. The unmodified recompute is reconciled against the sealed `payroll_result_line` rows before any difference is taken, so a period that is not reproducible is refused rather than approximated. Corrections land in `payroll_retro_item` (idempotent queue, C3), differences apply only into an `open` target period on an unsealed run, and emitted `payroll_retro_line` rows carry their origin period and run. Production migrate remains ops-gated (`0052_payroll_retro_pay`).

### D4 — `payroll/final-settlement`

Termination pay is mandatory in both jurisdictions and absent from your nine features.

| Operation | Purpose |
| --- | --- |
| `initiateFinalSettlement` | Triggered by an HR termination fact |
| `calculateFinalSettlement` | Pro-rated pay, leave encashment, notice pay/in-lieu, outstanding recoveries |
| `finalizeFinalSettlement` | Last statutory contributions, final tax treatment |
| `issueFinalSettlementStatement` | Terminal payslip variant |

Leave-balance-at-termination is an **HR fact** delivered through the handoff, not a Payroll computation.

### D5 — `payroll/statutory-filings`

Covers periodic and annual obligations. Absent entirely.

| Operation | Purpose |
| --- | --- |
| `generateStatutoryFiling` | Period filing artifact per jurisdiction/instrument |
| `generateAnnualStatement` | MY EA form; VN annual PIT finalization data |
| `sealFilingEvidence` | Immutable, versioned, reproducible from the run snapshot |
| `listFilingObligations` | Calendar of what is due when |

Requires the A2 rate tables to be effective-dated and version-pinned.

### D6 — `payroll/payroll-jobs`

**CLOSED 2026-08-05.** `payroll-jobs` mirrors HR reliability: enqueue a calculation job, claim with `FOR UPDATE SKIP LOCKED`, execute chunked work, retry with backoff, dead-letter, and replay. Checkpoints record `nextIndex` + processed employee ids so a crash at employee 4,000 of 5,000 resumes the remaining chunk instead of restarting. Chunk persistence merges employee outputs (does not wipe earlier chunks). Web drain: `/api/cron/payroll-jobs` behind `PAYROLL_JOBS_DRAIN_ENABLED` + `CRON_SECRET`. Production migrate remains ops-gated (`0051_payroll_jobs`).

### D7 — HR-side gaps (verified 2026-08-05; several rows already closed)

| Gap | Status | Deliverable |
| --- | --- | --- |
| Handoff event naming | ✅ **exists** | `hr.payroll-handoff.v1` schema in `@afenda/events` + platform event `platform.human-resources.payroll-delivery.requested.v1` (registered, fixture-tested). Document them in the README; no new event needed |
| Dry run | partial | `assembleApprovedPayrollHandoff` is a read-only de facto preview called before queueing; decide whether a dedicated `previewPayrollHandoff` diff operation is still wanted, or document the existing query as the dry run |
| Ack/correction ops | ✅ **exists** | `recordPayrollDeliveryFeedback` (`acknowledged \| rejected \| correction_required`) + correction via `queuePayrollDelivery` with `supersedesDeliveryId` and atomic `createCorrection`. Document; no new ops needed |
| No restriction concept | ✅ **exists** | `restrictEmployeeData` / `liftEmployeeDataRestriction` (`human-resources.privacy.restriction.place` / `.lift`); export excluded + anonymization blocked while active; platform privacy store persists restrictions |
| Cut-off semantics absent | ❌ (docs) | Document which period a handoff binds to and what a late approval does |
| Mid-period termination contract absent | ❌ (docs) | Document the fact shape and the C6 exception path |
| No promotion criteria | ❌ real gap | Explicit `scaffolded → active` gate list (Phase E) |
| No `PRODUCTION_READINESS.md` | ❌ real gap | Mirror Payroll's |
| Debt targets not enforced | ✅ **exists** | `__tests__/architecture-debt-report.test.ts` asserts the fixture in the package test run (CI-bound); optionally add a named root script |
| No breaking-change policy for `public-contract.fixture.json` | ❌ (docs) | Write the rule: what a diff requires |

---

## Phase E — Production evidence and sign-off

1. **HR `PRODUCTION_READINESS.md`** — mirror Payroll's structure.
2. **Promotion criteria** — the explicit checklist that moves HR from `scaffolded` to `active`. Nobody can prove HR is done today because the gate is unwritten.
3. **Payroll readiness update** — replace the `synth.v1` caveat with the approved-calculator evidence from A2.
4. **Runbooks** — outbox stall, stuck handoff, failed settlement, reversal-after-settlement, break-glass finalize.
5. **Both manifests updated**, `pnpm validate:modules` + `pnpm governance:packages` green.
6. **Sign-off record** — date, owner, and the evidence link for each gate.

---

## Order of work

| # | Item | Phase | Status (2026-08-05, `feat/hr-payroll-closure`) |
| --- | --- | --- | --- |
| 1 | Lifecycle decision + governance gates | A1/B7 | ✅ payroll demoted to `scaffolded`; lifecycle-coupling + erp-symmetry + emission-drain + cross-import + architecture-debt gates live in `governance:packages` |
| 2 | Calculator sourcing decision | A2 | ⏳ **open — longest lead time**; payroll stays synth-only, fail-closed until decided |
| 3 | Retention legal basis | A3 | ◐ decision recorded (restriction-not-erasure, `hr-payroll-decisions.md`); counsel-confirmed citations still open |
| 4 | C1 hash-conflict reject + C2 ordering + C9 maker-checker | C | ✅ C1 pre-existed; C2 `sourceVersion` ordering + advisory-lock supersession + no-axis validation reject; C9 calculate≠finalize guard |
| 5 | Payroll parity loop + failure injection | B5 | ✅ lanes exclusive; ingress Neon cases PARTIAL until `payroll_accepted_handoff` migration reaches the test target |
| 6 | Emission registry + four fixtures + `check:payroll` / `test:payroll:*` scripts | B4/B2 | ✅ |
| 7 | Transport residue: README truth both sides | B1 | ✅ single-transport wording identical; workforce port is a ledger-backed default with test-only override |
| 8 | Outbox drain | B6 | ✅ platform drain + cron route + payments/accounting event mapping in `apps/web` |
| 9 | Capability signature: currency, clock, statutory | B3 | ✅ required composition inputs |
| 10 | D0 fact widening | D0 | ⏳ **open** — needs HR-side capture (columns + gated migration) first; do not widen the event schema with unpopulated fields |
| 11 | `settlement-ingress` | D2 | ✅ + C8 reversal-bounded-by-settlement guard |
| 12 | `privacy` | D1 | ✅ restriction + retention evidence + DSAR; erasure still forbidden without counsel citation |
| 13 | `payroll-jobs` | D6 | ✅ durable claim/lease/retry/DLQ + chunk merge + `/api/cron/payroll-jobs` |
| 14 | `retro-pay`, `final-settlement`, `statutory-filings` | D3–D5 | ◐ `retro-pay` ✅ (queue / snapshot-pinned recompute / apply into an open period / review; migrate `0052_payroll_retro_pay` ops-gated); `final-settlement` + `statutory-filings` ⏳ open |
| 15 | HR D7 residue | D7 | ✅ restriction ops, PRODUCTION_READINESS promotion gate, cut-off + termination + breaking-change docs (C3/C6 enforcement rows honestly partial — payroll-side enforcement + tests pending) |
| 16 | Phase E evidence + promotion | E | ⏳ open — gated on 2, 3, 10, 14 and D7's two partial rows |

Remaining critical path: **A2 sourcing (longest lead) → D0 capture + widening → D3–D5 → Phase E.** Everything in Phases B and C is closed.

---

## Appendix A — Naming conventions for new work

| Kind | Pattern | Example |
| --- | --- | --- |
| Feature dir | `src/features/<kebab-case>/` | `src/features/settlement-ingress/` |
| Event | `<context>.<fact>.v<major>` | `hr.payroll-handoff.approved.v1` |
| Permission | `<context>.<resource>.<action>` | `payroll.run.finalize` |
| Fixture | `__tests__/fixtures/<name>.fixture.json` | `public-contract.fixture.json` |
| Root script | `pnpm <verb>:<pkg>:<loop>` | `pnpm test:payroll:parity` |
| Governance check | `pnpm governance:<subject>` | `pnpm governance:emission-drain` |

Uniform ERP roots stay `facade/`, `kernel/`, `composition/`, `features/`, `testing/`, plus root `index.ts`. Features never import `facade`, `composition`, or `testing`, and never accept the composite store.

## Appendix B — Verify commands

```bash
# Inner loop
pnpm check:hr
pnpm check:payroll                      # NEW

# Package
pnpm --filter @afenda/human-resources check
pnpm --filter @afenda/payroll check

# Outer loop (Neon)
REQUIRE_DATABASE_TESTS=1 pnpm test:hr:parity
REQUIRE_DATABASE_TESTS=1 pnpm test:payroll:parity   # NEW

# PowerShell outer loop
$env:REQUIRE_DATABASE_TESTS = "1"; pnpm test:payroll:parity

# After manifest or register changes
pnpm validate:modules
pnpm governance:packages
```

## Appendix C — Assumptions and limits

- Originally derived from four documents only; **corrected against the source tree on 2026-08-05**. Rows marked ✅ **exists** were verified on disk with paths. Remaining ❌ rows were confirmed absent by grep/listing, not assumed.
- Retention periods in A3 are starting points for counsel, not legal advice. Record the confirmed citation in `DECISIONS.md`.
- Statutory rates and schedules change. Nothing in this guideline hardcodes a rate; it requires effective-dated, version-pinned, sourced rate tables instead.
- Whether the platform already provides a shared outbox dispatcher, durable job runner, or clock capability is unknown from the docs. If it does, register with it rather than building a Payroll-local copy.
