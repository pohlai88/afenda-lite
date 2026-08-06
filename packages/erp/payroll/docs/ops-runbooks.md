# Payroll operations runbooks

**Scope:** `@afenda/payroll` + `apps/web` drain routes  
**Audience:** on-call operators and composition owners  
**Authority:** [PRODUCTION_READINESS.md](../PRODUCTION_READINESS.md) · [hr-payroll-decisions.md](./hr-payroll-decisions.md) · bridging Phase E  
**Not:** Living DOC-001 controlled prose; not a waiver for statutory pack approval or lifecycle promotion.

Use these procedures when drains stall, handoffs stick, settlements fail, or finalize/reversal policy blocks an operator. Prefer package commands and cron drains over direct SQL. Never rewrite finalized result lines.

**Deployment state these procedures assume (as of 2026-08-06):** the ops-gated
migrations `0051`–`0056` have **not** been applied on any target, and this
checkout cannot verify any target's schema — `pnpm db:check` runs with
`DATABASE_URL` unset and asserts the migration journal only. The one prior
application claim is `0049_payroll_accepted_handoff.sql` on a **preview**
branch for the B5 parity loop
([development-roadmap.md § 2](./development-roadmap.md)); re-verify it before
relying on it, and treat production as unmigrated. Until Neon ops applies these
(sign-off gate [E9](./phase-e-signoff.md)), the jobs queue, retro-pay,
final-settlement, statutory-filings, period-lock, and HR statutory-profile
tables do not exist at runtime, so every procedure below that names one is a
procedure for a future deployment rather than a description of live behaviour.
Statutory calculation additionally fails closed everywhere:
`isStatutoryProductionReady()` is `false` because all eight MY/VN calculators
are `awaiting_review` (§6).

---

## 1. Outbox stall (`payroll.*` platform events)

**Symptoms**

- Payments drafts or Accounting postings never appear after finalize.
- Cron `/api/cron/payroll-outbox` returns `{ organizations: 0, processed: 0, failed: 0, skipped: 0, timedOut: false }` while pending rows remain.
- Outbox attempts climb toward the platform max (`PAYROLL_OUTBOX_MAX_ATTEMPTS = 10`, `apps/web/modules/platform/domain/payroll-outbox-drain.ts`).

**Preconditions**

- `PAYROLL_OUTBOX_DRAIN_ENABLED=true` — when it is `false` the route short-circuits to an all-zero counter payload with HTTP 200, which looks identical to "nothing to drain". Check the flag before investigating anything else.
- Valid `CRON_SECRET` on the caller
- Ops-gated migrations for the emitting surfaces already applied on the target branch (see the deployment-state note above — none are applied today)

**Diagnose**

1. Confirm cron auth: the route accepts exactly one form, the `Authorization: Bearer <CRON_SECRET>` header, compared against a SHA-256 digest. There is no alternate secret header; a mismatch returns `UNAUTHORIZED`, not a zero drain.
2. Check env drain knobs: `PAYROLL_OUTBOX_DRAIN_ORG_BATCH_SIZE`, `PAYROLL_OUTBOX_DRAIN_PER_ORG_LIMIT`, `PAYROLL_OUTBOX_DRAIN_TIME_BUDGET_MS`.
3. Inspect pending `platform_domain_event` rows whose `type` matches payroll lifecycle / payment-requested / posting-requested families (see `apps/web/modules/platform/domain/payroll-outbox-drain.ts`).
4. Read handler failure reasons in application logs for Payments draft intake and Accounting source posting — both fail closed on bad payloads.

**Recover**

1. Re-invoke `/api/cron/payroll-outbox` after fixing handler config or downstream availability.
2. If leases are stuck (worker crash mid-claim), wait out the claim lease (`PAYROLL_OUTBOX_CLAIM_LEASE_MS = 60_000`) then re-drain.
3. Do **not** insert payment or journal rows from Payroll. Replay is outbox-keyed; meaning stays with Payments/Accounting handlers.
4. After successful drain, verify reconciliation / settlement-ingress facts for the affected run employees.

**Escalate when**

- Attempts ≥ max with persistent handler `CONFLICT` / validation failures (payload bug — engineering).
- Downstream Payments/Accounting modules refuse mapping for a sealed event type (composition gap).

---

## 2. Stuck HR handoff / delivery

**Symptoms**

- HR queue shows pending delivery; Payroll accepted ledger has no row (or only a superseded row).
- Operator expects a run employee to appear but calculation sees no accepted handoff.

**Diagnose**

1. Confirm producer path: HR `queuePayrollDelivery` → synchronous Payroll ingest → optional platform fan-out (both package READMEs, bridging B1).
2. Check HR delivery status and feedback (`acknowledged` / `rejected` / `correction_required`).
3. On Payroll, look for `payroll_accepted_handoff` active identity for `(organizationId, employeeId, employmentId)`. This table only exists once `0049_payroll_accepted_handoff.sql` is applied — confirm that on the target first (see the deployment-state note); where it is absent, ingest fails at the storage layer instead of producing a missing-row symptom.
4. Hash conflict (C1): identical `deliveryId` with changed payload hash must reject — do not “force accept”.
5. Period freeze (C3): after `inputs_locked` / `closed`, non-termination handoffs seal `deferred_to_next_period` (success, not a producer retry loop).
6. Restriction: HR assemble of statutory-enriched handoffs fails `CONFLICT` while the subject is restriction-active.

**Recover**

1. For rejected / correction_required: HR issues a correction delivery with `supersedesDeliveryId` and a newer `sourceVersion`.
2. For deferred_to_next_period: open or target the next period; use `retro-pay` for money corrections, not live mutation of a locked period.
3. For pending deliveries: run HR `recoverPendingPayrollDeliveries` / reliability worker — do not dual-write `payroll_*` from the app.
4. For missing DDL: stop and obtain ops approval to apply the accepted-handoff migration (PL-S9).

**Dry-run / preview**

`assembleApprovedPayrollHandoff` is the read-only preview before queueing. No separate `previewPayrollHandoff` command is required; document diffs against the assemble result.

---

## 3. Failed settlement ingress / reconciliation

**Symptoms**

- Finalize emitted payment/posting requests, but settlement-ingress never matches.
- Run reversal is blocked as settled while finance believes payment failed.

**Diagnose**

1. Confirm outbox drain completed for `payroll.payment-requested.v1` / `payroll.posting-requested.v1`.
2. Confirm Payments/Accounting handlers wrote inbound facts consumed by `settlement-ingress` (`recordPaymentSettlement`, `recordPostingConfirmation`).
3. Parse disbursement references: `payroll-run:{runId}:employee:{employeeId}`.
4. List open discrepancies with `listPayrollReconciliationsForRun`; do not edit finalized payroll lines.

**Recover**

1. Repair downstream draft/posting configuration, then re-drain outbox if facts were never emitted successfully.
2. Resolve discrepancies with the versioned reconciliation command `resolvePayrollReconciliation`; `resolveReconciliationDiscrepancy` is the settlement-ingress side of the same closure. Never mutate sealed run outputs.
3. If payment settled in error, recovery is Accounting clawback (A4), not payroll reversal.

---

## 4. Reversal after settlement (C8 / A4)

**Rule**

Payroll may reverse a run **only while disbursement is un-settled**. Once Payments reports settled, refuse payroll reversal and route recovery to Accounting clawback.

**Operator steps**

1. Attempt `reversePayrollRun` / `reversePayrollRunAction`.
2. On `CONFLICT` citing settlement: stop. Capture run id, employee ids, payment references, and correlation ids for Accounting.
3. Do not delete or rewrite `payroll_result_line` / statutory result rows.
4. Accounting opens clawback receivable outside Payroll ownership.

---

## 5. Finalize SoD / break-glass (C9)

**Rule**

The actor who calculated a run (`run.updatedBy` at calculate) cannot finalize it. Same SoD applies to final-settlement finalize.

**Normal recovery**

1. A different authorized operator with `payroll.run.finalize` (or settlement finalize permission) performs finalize.
2. Confirm maker ≠ checker in audit evidence.

**Break-glass**

There is **no** package break-glass finalize override today. A distinct approval / break-glass path lands with the approval-workflow slice. Until then:

1. Do not bypass SoD by rewriting `updatedBy` in the database.
2. Use a second human operator account with finalize permission.
3. If no second operator exists in an emergency, escalate to the Payroll owner for an explicit approval-workflow mission — do not invent an in-place override.

---

## 6. Statutory calculation / filing refused (`awaiting_review`)

**Symptoms**

- Calculate / final-settlement calculate / filing generate returns `CONFLICT`: statutory not approved for production.
- Readiness: `isStatutoryProductionReady() === false`.

**Meaning**

Expected until a named reviewer sets `productionApproval: approved` on the jurisdiction calculator and ships reviewed rule-pack `configJson`. A2 sourcing is closed (build in-house); pack review is the remaining gate.

**Operator steps**

1. Confirm the rule’s `calculatorId` is registered (`my.*.v1` / `vn.*.v1` / `synth.v1`).
2. For test environments only, exercise `synth.v1` with synthetic config — never treat synth as a live jurisdiction.
3. Escalate pack review to the Payroll / tax reviewer named in the Phase E sign-off checklist. Do not mark calculators `approved` from ops alone.

---

## 7. Payroll jobs drain stall

**Symptoms**

- Large calculate jobs remain `running` / lease expired / dead-lettered.
- Cron `/api/cron/payroll-jobs` idle while due work exists.

**Recover**

1. Ensure `PAYROLL_JOBS_DRAIN_ENABLED=true` and cron secret.
2. Re-invoke drain; leases expire then become reclaimable (`FOR UPDATE SKIP LOCKED`).
3. Inspect dead letters via `listPayrollDeadLettersAction`; replay with `replayPayrollDeadLetterAction` after fixing root cause.
4. Chunk merge is additive — do not wipe earlier chunk outputs manually.
