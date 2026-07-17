# FFT Relevant Architecture (Afenda-Lite Filtered)

> **Status:** Scratch architecture compose
> **Authority:** Non-authoritative research material — does **not** replace Living `FFT-MOD-*`
> **Date:** 2026-07-17
> **Mode:** Internal architecture (technical-writing)
> **Audience:** Engineers and agents shaping FFT Target contracts
> **Action enabled:** Load one relevant FFT architecture filtered by Living locks and Adopt dispositions
> **Lineage:** [1-fft-architecture.md](1-fft-architecture.md) -> [3-fft-improvement.md](3-fft-improvement.md) -> [4-fft-reconciliation-and-promotion-map.md](4-fft-reconciliation-and-promotion-map.md) -> this file -> [6-fft-implementation-slice-map.md](6-fft-implementation-slice-map.md)
> **Living authority:** [`docs/modules/feed-farm-trade/`](../../modules/feed-farm-trade/) · [`ARCH-006`](../../architecture/ARCH-006-bounded-contexts.md) · [`ARCH-023`](../../architecture/ARCH-023-multi-tenancy.md)

## 0. Audit snapshot (orchestrator)

Scratch Tier D audit against Living Tier A. Coverage is **Incomplete** by design (no automated scratch validator).

| ID | Requirement | Authority | Finding | Severity |
| --- | --- | --- | --- | --- |
| FFT-AUD-01 | Scratch must not claim Living authority | DOC-001 · AGENTS | `4` correctly labels non-authoritative; `1`/`3` are unlabeled aspirational blueprints | Observation |
| FFT-AUD-02 | Product scope must not contradict Living FFT | FFT-MOD-001/002 | Living FFT = AdminCN event/order/allocation trade; `1`/`3` describe vertical commercial CRM | Major (scratch-vs-Living scope conflict; not a disk bug) |
| FFT-AUD-03 | Bounded-context language | ARCH-006 | `3` proposes many "bounded contexts"; `4` corrects to FFT subdomains | Pass on `4`; Minor if agents cite `3` alone |
| FFT-AUD-04 | Tenancy / isolation | ARCH-023 | Dedicated-DB / regional cells conflict with shared-schema lock; `4` defers | Pass on `4` |
| FFT-AUD-05 | Actor / portal lock | FFT-MOD-001 | Farm/dealer portal + offline field app deferred by Living locks | Pass on `4` |
| FFT-AUD-06 | Systems of record | FFT-MOD-001/007 | ERP/ledger rebuild rejected; thesis in `4` aligns | Pass on `4` |
| FFT-AUD-07 | Promotion path completeness | DOC-001 | `4` maps destinations; this file closes the compose gap | Minor (addressed here) |
| FFT-AUD-08 | Readiness claims | FFT-MOD-009/010 | Scratch must not imply Module Enterprise Readiness; Living claim remains Not claimable | Observation |

```text
Applicable controls:       8 (locks + tenancy + BC + readiness + doc control + SoR)
Controls with checks:      2 (manual authority comparison; no automated scratch validator)
Checks executed:           0 automated (docs-only audit)
Checks passed:             0
Checks failed:             0
Controls without checks:   6 (manual disposition review)
Unevaluated controls:      0 gated scripts in this scope
Coverage Status: Incomplete
```

Do not report this scratch set as "clean." Incomplete coverage is expected for Tier D.

---

## 1. Relevance filter

| Layer | What it is | Authority |
| --- | --- | --- |
| **Living baseline** | Feed & farm **sales events**: catalog setup, orders, priority/FCFS allocation, audit/export, flag-gated ops | FFT-MOD-001 · FFT-MOD-002 · FFT-MOD-010 |
| **Relevant Target candidates** | Adopt-filtered contracts from the enterprise blueprint that strengthen domain precision without breaking locks | This file · promotion via `4` |
| **Out of relevance (deferred/rejected)** | Offline mobile, farm/dealer portal, dedicated DB tiers, regional cells, ERP ledger rebuild, broad generic CRM breadth | `4` disposition matrix |

```text
Living present:
  AdminCN /fft · requireFftAccess · event -> order -> allocate -> complete
  Shared schema · hard organization_id · Trade/FFT one ARCH-006 context

Relevant Target (candidates only):
  Subdomain map · aggregates/invariants · CQ/E ownership · classification
  Trial evidence classes · forecast provenance · Trade Relationship shared records
  Integration reconciliation · NFR evidence ownership

Not relevant until new program + controlled reopen:
  Offline sync · customer/dealer portal · dedicated-DB cells · full CPQ/CRM suite
```

---

## 2. Durable product thesis

> Feed Farm Trade owns feed-specific commercial intent, commercial evidence,
> technical conversion, demand intelligence, governed collaboration, and
> module-level audit. Operational and financial execution remains in designated
> systems of record.

Differentiation stays on feed volume, species, production cycles, feed programs,
mill source, freight, technical evidence, contract utilization, and governed
trade collaboration — not on recreating ERP, MES, WMS, LIMS, formulation, or
full farm-management ledgers.

---

## 3. Platform locks that shape relevance

These Living locks constrain every candidate below. This scratch file does not
override them.

| Lock | Living rule |
| --- | --- |
| Bounded context | Afenda-Lite contexts remain Identity, Declarations, **Trade / FFT**, Platform ([ARCH-006](../../architecture/ARCH-006-bounded-contexts.md)). Internal FFT capability groups are **subdomains / aggregates / catalogs**, not new Afenda-Lite contexts. |
| Shell and actors | Shared AdminCN on `/fft/**`; organization-admin sales + ops; no end-customer storefront ([FFT-MOD-001](../../modules/feed-farm-trade/FFT-MOD-001-module-architecture.md)). |
| Entry | `requireFftAccess` / platform `fft.access`; org admin alone does not grant. |
| Tenancy | Shared schema; hard `organization_id = $org` ([ARCH-023](../../architecture/ARCH-023-multi-tenancy.md)). |
| Domain home | `modules/fft` + Actions; no Trade <-> Declarations domain imports. |
| Ops | Runtime flags and production gates owned by [FFT-MOD-008](../../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md). |
| Readiness | Evidence and claims owned by [FFT-MOD-009](../../modules/feed-farm-trade/FFT-MOD-009-verification.md) / [FFT-MOD-010](../../modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md). Scratch cannot mark Claimable. |

---

## 4. FFT subdomain map (Adopt with terminology correction)

Under the single Trade / FFT bounded context, relevant internal subdomains:

```text
Trade / FFT (ARCH-006)
├── Living baseline
│   ├── Sales Event and Catalog
│   ├── Order Capture
│   ├── Allocation
│   ├── Audit and Export
│   └── Flag-gated Ops (deposits / pickup / imports / ERP push)
└── Target candidates (require controlled reopen before Living authority)
    ├── Party and Farm Graph
    ├── Territory and Relationship
    ├── Sales Activity and Opportunity (feed semantics)
    ├── Technical Assessment and Feed Trial
    ├── Product Commercialization and Quotation
    ├── Contract and Commitment
    ├── Trade Collaboration (shared records)
    ├── Forecast and Demand
    ├── Customer Case (complaint commercial graph)
    ├── Document and Evidence
    ├── Integration
    └── Analytics Semantic Layer (governed KPI definitions)
```

Do **not** invent additional Afenda-Lite bounded contexts from this map.

---

## 5. Relevant Target capabilities (Adopt only)

### 5.1 Living baseline (present)

Retained as the current product spine:

- Time-boxed trade events, products, supply caps, customer priority
- Order window, transfer, allocation, completion
- Permission codes via FFT RBAC catalog
- Audit view and export
- P3 ops surfaces only when flags + FFT-MOD-008 allow

### 5.2 Candidate domain contracts (Adopt)

Promote later into controlled docs only after explicit reopen ([4 §6](4-fft-reconciliation-and-promotion-map.md)):

| Candidate | Intent | Later home |
| --- | --- | --- |
| Aggregate and invariant catalog | Enforce stage, ownership, immutability, and won/lost evidence rules for commercial records | FFT-MOD-004 |
| Governed document lifecycle | Status, version, previous version, approval, supersession, cancellation reason | FFT-MOD-004 · FFT-MOD-007 |
| Party / Account / Farm Site / external reference | Stop interchangeable customer/farm/legal-entity terms | FFT-MOD-002 · FFT-MOD-004 |
| Master-data and identity resolution | Matching, duplicates, ERP references, aliases, ownership changes | FFT-MOD-004 · FFT-MOD-007 |
| Command / query / event / projection ownership | Prevent integrations from silently editing internal state | FFT-MOD-007 |
| Canonical domain events | Owner, schema version, idempotency, sensitivity, replay | FFT-MOD-007 |
| Data classification and field authorization | Margin, cost, technical results, partner-shared, export, AI | FFT-MOD-005 |
| Technical assessment vs controlled trial | Separate commercial observation, field evaluation, controlled trial, formal study reference | FFT-MOD-002 · FFT-MOD-004 · FFT-MOD-009 |
| Forecast assumption and scenario model | Assumptions, calculation version, override reason, snapshot, reconciliation | FFT-MOD-004 · FFT-MOD-009 |
| Trade Relationship shared-record model | Private vs shared vs referenced records; ownership; revocation; dispute | FFT-MOD-002 · FFT-MOD-004 · FFT-MOD-005 · FFT-MOD-007 |
| Integration ownership and reconciliation | Connector ownership, tolerances, failure visibility, replay | FFT-MOD-007 · FFT-MOD-009 |
| NFR evidence ownership | Bind SLOs and enterprise controls to evidence owners — not to scratch claims | FFT-MOD-009 · FFT-MOD-010 |

### 5.3 Example aggregate invariants (candidates)

**Opportunity (if promoted as Target commercial record)**

- One tenant owner and one accountable sales owner
- Valid stage transitions; mandatory next action while open
- Probability controlled by stage; immutable stage history
- Close-date change requires reason; lost requires standardized reason
- Won requires accepted quote, contract, or order evidence

**Quotation (if promoted)**

- One legal entity, customer, and currency
- Approved price source and margin calculation
- Immutable issued version; revisions create a new version
- Idempotent order-conversion request

Living event/order/allocation aggregates remain the present SSOT until controlled
promotion replaces or extends vocabulary.

---

## 6. Systems of record

| Information | System of record | FFT responsibility |
| --- | --- | --- |
| Trade event, order, allocation, trade RBAC | FFT | Own |
| Opportunity / trial / forecast (Target candidates) | FFT when promoted | Own commercial contracts |
| Customer master, inventory, production, invoice, payment | ERP / MES / WMS / finance | Integrate; display; governed requests |
| Formula | Formulation system | Reference and commercial specification only |
| Lot / certificate / QMS case | LIMS / QMS | Link from commercial complaint graph |
| Farm production records | Farm platform (selective) | Commercial view; do not replace farm OS |

**Reject:** rebuilding general ledger, AR, inventory valuation, MES, WMS, formulation, laboratory execution, complete QMS, or complete farm-production management inside FFT.

---

## 7. Explicit non-goals

### Deferred (future approved program)

- Offline synchronization protocol and separate field mobile application
- Farm or dealer self-service portal
- Dedicated-database service tiers and regional cells
- Broad CRM / CPQ / rebate / channel expansion beyond feed-specific semantics already justified by Living or approved Target slices

### Rejected

- Replacing ERP / finance / production / warehouse / formulation / lab / quality ledgers
- Bypassing permission codes, `FFT_*` flags, or FFT-MOD-009 evidence through scratch prose
- Treating this file, `1`, `3`, or `4` as Living architecture or readiness proof

---

## 8. Candidate event set (for later FFT-MOD-007)

Initial catalogue candidates only — not published contracts:

```text
AccountCreated / FarmSiteRegistered / FarmCapacityChanged
OpportunityQualified / OpportunityStageChanged
TechnicalAssessmentCompleted
FeedTrialStarted / FeedTrialResultApproved
QuotationApproved / QuotationIssued / QuotationAccepted
ContractActivated / VolumeCommitmentChanged
DemandForecastPublished / ForecastSnapshotFrozen
TradeRelationshipActivated / TradeRelationshipScopeChanged / TradeRelationshipRevoked
OrderRequestSubmitted / DeliveryStatusReceived / PaymentStatusReceived
ComplaintOpened / ComplaintLinkedToLot
KpiDefinitionActivated
```

Each event, if promoted, must define owner, producer, consumers, tenant, legal
entity, schema version, idempotency key, correlation ID, business timestamp,
sensitivity class, retention, and replay rules.

---

## 9. Promotion pointer

This file closes the compose gap identified in FFT-AUD-07. It does **not**
authorize controlled-document edits or code.

Implementation discovery continues in
[6-fft-implementation-slice-map.md](6-fft-implementation-slice-map.md) (`FT1`–`FT18`).
Every `FT*` starts UNEVALUATED and remains scratch until controlled reopen.

1. Product owner approves dispositions in [4-fft-reconciliation-and-promotion-map.md](4-fft-reconciliation-and-promotion-map.md).
2. Reopen named Living docs by ID and bounded purpose (DOC-001).
3. Write each requirement once into its owning FFT-MOD document.
4. Link related docs; do not duplicate authority.
5. Update evidence in FFT-MOD-009 before any readiness claim change.
6. Return Control State to Closed.

Highest-signal controlled batch (from `4` §7): FFT-MOD-002 -> FFT-MOD-004 ->
FFT-MOD-005 -> FFT-MOD-007 -> FFT-MOD-009.

---

## 10. Notes

- Quality bar is enterprise production. Shrink **scope**, not quality.
- Preserve `1` as the aspirational blueprint, `3` as critique, and `4` as
  disposition SSOT for promotion routing.
- Agents coding Living FFT should load FFT-MOD-001 / 008 / 010 first — not this
  scratch file.
- Agents drafting Target contracts may load this file after `4`, then stop for
  explicit controlled reopen before any Living write.

```text
1 aspirational blueprint
-> 2 benchmark scorecard
-> 3 improvement critique
-> 4 promotion map
-> 5 relevant architecture (this file)
-> 6 FT slice map
-> controlled FFT-MOD updates only after approval
```
