# HR ↔ Payroll Closure Guideline

**Scope:** `@afenda/human-resources` and `@afenda/payroll`
**Goal:** align the two bounded contexts, then close the missing surface, then ship enterprise-production-ready.
**Derived from:** both `README.md` files and both `AGENTS.md` files only. Anything already implemented but undocumented still counts as a gap — sign-off is read from the doc, the manifest, and the fixtures, not from the source tree.

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

Four decisions cannot be designed around. Write them down, date them, name an owner. Suggested artifact: `packages/erp/DECISIONS.md`, linked from both READMEs under **Authority**.

### A1 — Lifecycle coupling

Payroll is `lifecycle: "active"`. HR is `lifecycle: "scaffolded"`. Payroll's entire workforce input originates in HR. An active consumer on a scaffolded producer is either rejected by governance or — worse — passes silently and ships.

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

### B1 — Collapse the transport

Today the two READMEs describe two different mechanisms for the same fact. HR *publishes handoff facts* (push/event). Payroll says facts *arrive through `PayrollWorkforceCapability`* (pull/port). If both paths exist you get double ingress and divergent state. Collapse to:

```
HR command
  └─ hr_payroll_handoff row  ─┐  (one HR transaction)
  └─ audit fact               │
  └─ outbox: hr.payroll-handoff.approved.v1
                              │
        apps/web worker  ─────┘   (no shared transaction)
                              │
  Payroll capability call ────┘
  └─ payroll_accepted_handoff row  ─┐ (one Payroll transaction)
  └─ audit fact                     │
  └─ outbox: acknowledgement        │
                                    │
        apps/web worker  ───────────┘
                                    │
  HR acknowledgement command ───────┘
```

**Event is the only trigger. Capability is the only API.** Neither package imports the other; `apps/web` remains the only place both names appear.

New files:

| File | Purpose |
| --- | --- |
| `apps/web/lib/erp/payroll-handoff-ingress-worker.ts` | Drains `hr.payroll-handoff.approved.v1` → calls Payroll capability |
| `apps/web/lib/erp/payroll-handoff-ack-worker.ts` | Drains Payroll acknowledgement → calls HR ack command |
| `apps/web/lib/erp/payroll-outbox-worker.ts` | Drains `payroll.payment-requested.v1` / `payroll.posting-requested.v1` (B6) |

Existing HR composition entries (`hr-payroll-delivery.ts`, `human-resources-payroll-delivery.ts`) stay as the producer side.

### B2 — Symmetry matrix

Payroll has one production-readiness doc and nothing else. HR has fixtures, roadmap, baseline verification, and three test loops. Bring both to the same row set. Missing cells are the work.

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
| Canonical operation registry | ✅ | ❌ **add** |
| Canonical emission registry | partial | `mutation-tables.ts` only — **extend** |
| Unit loop (`test:*:unit`) | ✅ | ❌ **add** |
| Parity loop (`test:*:parity`, Neon) | ✅ | ❌ **add** — highest engineering priority |
| Feature-first layout guard test | ✅ | ❌ **add** |
| `./testing` subpath | ✅ declared | `testing/` exists, subpath undeclared — **decide and document** |
| Composition entries table in README | ✅ | ❌ **add** |
| Reliability worker | ✅ | ❌ **add** |
| Observability module | ✅ | ❌ **add** |
| Tenant-injection doctrine in README | ✅ | ❌ **add** |
| Privacy feature | ✅ | ❌ **add** (Phase D1) |
| Durable job feature | ✅ `bulk-jobs` | ❌ **add** (Phase D6) |
| Currency injected into capability | ✅ | ❌ **add** (B3) |

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

### B4 — Payroll operation and emission registries

HR's README states canonical registries decide authorization, audit, transaction, idempotency, and event behaviour. Payroll documents only `mutation-tables.ts`. **Payroll's idempotency and authorization policy is currently undeclared** — which is exactly where a double-pay bug lives.

Add:

```
src/kernel/registry/operation-registry.ts
src/kernel/emissions/emission-registry.ts
```

Every Payroll command declares, in one place: permission, audit requirement, transaction requirement, idempotency key strategy, emitted events. The `registry-projection.fixture.json` is the frozen projection of that registry.

### B5 — Payroll parity loop (highest engineering priority in Phase B)

Payroll makes the strongest transactional claim in the repository — run row + audit + outbox committed in a single production DB transaction — and ships the weakest test loop. Mirror HR exactly:

| Loop | Command | Content |
| --- | --- | --- |
| Inner | `pnpm test:payroll:unit` / `pnpm check:payroll` | Memory only, parallel, no Neon |
| Package | `pnpm --filter @afenda/payroll test` | Unit project only |
| Outer | `REQUIRE_DATABASE_TESTS=1 pnpm test:payroll:parity` | Serial: parity, concurrency, failure injection |

Failure-injection cases that must exist before ship:

1. Outbox insert fails after run row insert → whole transaction rolls back, no orphan run.
2. Audit insert fails → command fails closed, nothing persisted.
3. Two concurrent finalizes on one run → exactly one wins, one returns a conflict `Result`.
4. Worker crashes between event emit and dispatch → redelivery produces no second payment request.
5. Same `deliveryId` delivered twice concurrently → one accepted row, one idempotent ack.

### B6 — Drain the outbox

Payroll emits `payroll.payment-requested.v1` and `payroll.posting-requested.v1`. Nothing documented consumes them. Register both with the platform dispatcher (or build `payroll-outbox-worker.ts`) and add a governance check: **every emission in the registry must have a registered dispatcher**. An undrained outbox is a silent "payroll ran but nobody got paid."

### B7 — Governance checks to add

| Check | Rule |
| --- | --- |
| `governance:lifecycle-coupling` | `active` module may not depend on a `scaffolded` module (A1) |
| `governance:erp-symmetry` | Both ERP packages carry the same doc, fixture, and script set (B2) |
| `governance:emission-drain` | Every registered emission has a registered dispatcher (B6) |
| `governance:cross-import` | No `@afenda/payroll` ↔ `@afenda/human-resources` import in production source |
| `governance:architecture-debt` | Fixture targets are enforced, not merely reported |

**Phase B exit gate — all must be true:**

- [ ] One transport documented identically in both READMEs; the pull-only wording is gone.
- [ ] Payroll parity loop runs green against Neon, including all five failure-injection cases.
- [ ] Payroll's four fixtures exist and are asserted in CI.
- [ ] Payroll emissions are drained by a registered dispatcher.
- [ ] Capability signature updated; no calculator reads a global clock or a hardcoded currency.
- [ ] Symmetry matrix has no ❌ except items explicitly deferred to Phase D with a dated ticket.

---

## Phase C — The handoff contract, implemented

These are the eight rules that stop the race. They are cheap: mostly documentation, one unique index, one status enum. Write them into both READMEs and both PRDs.

### C1 — Idempotency

Unique constraint on `payroll_accepted_handoff (organizationId, deliveryId)`.

| Case | Behaviour |
| --- | --- |
| Same `deliveryId`, same `payloadHash` | Acknowledge, no-op |
| Same `deliveryId`, different `payloadHash` | **Hard reject** + raise run exception. Never silently overwrite. |
| New `deliveryId`, superseding content | Accept per C2 ordering |

HR's producer already dedupes by `deliveryId + payloadHash`; Payroll must enforce the same key on the consumer side. Producer-side dedupe alone is not idempotency.

### C2 — Ordering

Every fact carries `(employeeId, effectiveFrom, revision)`. Payroll rejects any `revision` ≤ the revision already stored for that `(employeeId, effectiveFrom)`. **This is the rule that actually kills the race** — retries, redelivery, and out-of-order arrival all become harmless.

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

### C9 — Segregation of duties on finalize

Finalization is the highest-risk action in the module and has no maker-checker documented.

- Keep `payroll.run.approve` and `payroll.run.finalize` as distinct permissions.
- Reject when `actorUserId` of finalize equals `actorUserId` of approve on the same run.
- Break-glass override requires a distinct permission and writes a dedicated audit reason.

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

### D1 — `payroll/privacy`

Payroll holds payslips, tax numbers, and statutory identifiers — the most sensitive rows in the workspace — with no projection, retention, restriction, or evidence workflow.

| Operation | Purpose |
| --- | --- |
| `projectPayrollFields` | Contextual field projection, mirroring HR |
| `restrictPayrollSubject` | Restriction, not erasure (A3/C7) |
| `liftPayrollRestriction` | Audited legal-hold release |
| `recordPayrollRetentionEvidence` | Evidence row per restriction decision |
| `expirePayrollRetention` | Retention-clock expiry → eligible for erasure |
| `respondToPayrollSubjectAccess` | DSAR export bounded by `payroll.payslip.read-own` |

Keep `payroll.payslip.read-own` and `payroll.payslip.read-all` distinct through every one of these.

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

Payroll runs are long batches over thousands of employees with no durable job infrastructure, while HR has `bulk-jobs` with leases, dead letters, and recovery. Mirror it: durable claims, leases, acknowledgements, retries, dead letters, recovery. A calculation batch that dies at employee 4,000 of 5,000 must resume, not restart or half-commit.

### D7 — HR-side gaps

| Gap | Deliverable |
| --- | --- |
| Unnamed, unversioned handoff event | `hr.payroll-handoff.approved.v1` + registry entry + schema + fixture |
| No dry run | `previewPayrollHandoff` — validate and diff before approval |
| Ack/correction unnamed | `acknowledgePayrollDelivery`, `recordPayrollDeliveryRejection`, `issuePayrollHandoffCorrection` |
| No restriction concept | `restrictEmployeeData` alongside deletion, matching C7 |
| Cut-off semantics absent | Document which period a handoff binds to and what a late approval does |
| Mid-period termination contract absent | Document the fact shape and the C6 exception path |
| No promotion criteria | Explicit `scaffolded → active` gate list (Phase E) |
| No `PRODUCTION_READINESS.md` | Mirror Payroll's |
| Debt targets not enforced | Bind `architecture-debt.fixture.json` to a CI command |
| No breaking-change policy for `public-contract.fixture.json` | Write the rule: what a diff requires |

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

| # | Item | Phase | Why here |
| --- | --- | --- | --- |
| 1 | Lifecycle decision | A1 | Costs nothing, unblocks honesty |
| 2 | Calculator sourcing decision | A2 | Longest lead time — start it in parallel with everything |
| 3 | Retention legal basis | A3 | Needs counsel; long clock |
| 4 | Transport collapse | B1 | Every later feature inherits it |
| 5 | C1–C3 + C7 (idempotency, ordering, freeze, retention) | C | Cheapest, kills the race class outright |
| 6 | Payroll parity loop + failure injection | B5 | Biggest engineering gap |
| 7 | Outbox drain | B6 | Silent-failure risk |
| 8 | Operation/emission registry + four fixtures | B4/B2 | Governance floor |
| 9 | Capability signature: currency, clock, statutory | B3 | Blocks all calculator work |
| 10 | D0 fact widening | D0 | Blocks calculators; rewrite risk if skipped |
| 11 | `settlement-ingress` | D2 | Unblocks C8 |
| 12 | `privacy` | D1 | Legal exposure |
| 13 | `payroll-jobs` | D6 | Needed before large-tenant runs |
| 14 | `retro-pay`, `final-settlement`, `statutory-filings` | D3–D5 | Domain completion |
| 15 | HR D7 items | D7 | Parallelizable throughout |
| 16 | Phase E evidence + promotion | E | Ship |

Items 1, 5, and 10 are the ones to write first. They are almost entirely documentation plus one unique index, and they eliminate the whole class of failure you are worried about.

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

- Derived from four documents only. Items marked missing may exist in code; if so, the fix is to document, fixture, and register them — that is still Phase B work, not a free pass.
- Retention periods in A3 are starting points for counsel, not legal advice. Record the confirmed citation in `DECISIONS.md`.
- Statutory rates and schedules change. Nothing in this guideline hardcodes a rate; it requires effective-dated, version-pinned, sourced rate tables instead.
- Whether the platform already provides a shared outbox dispatcher, durable job runner, or clock capability is unknown from the docs. If it does, register with it rather than building a Payroll-local copy.
