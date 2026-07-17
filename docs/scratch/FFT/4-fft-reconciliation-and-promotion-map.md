# FFT Reconciliation and Promotion Map

> **Status:** Scratch reconciliation
> **Authority:** Non-authoritative research material — does **not** replace Living `FFT-MOD-*`
> **Date:** 2026-07-17
> **Inputs:** [1-fft-architecture.md](1-fft-architecture.md), [2-fft-blueprint-oss-scorecard.md](2-fft-blueprint-oss-scorecard.md), [3-fft-improvement.md](3-fft-improvement.md)
> **Downstream:** [5-fft-relevant-architecture.md](5-fft-relevant-architecture.md) · [6-fft-implementation-slice-map.md](6-fft-implementation-slice-map.md)

## 1. Purpose

This note finalizes the scratch review sequence without rewriting the original
blueprint or turning the improvement critique into architecture authority.

The correct disposition is:

1. Keep `1-fft-architecture.md` as the source blueprint evaluated by the later
   scratch reports.
2. Keep `2-fft-blueprint-oss-scorecard.md` as the benchmark assessment.
3. Keep `3-fft-improvement.md` as critique and candidate-input material.
4. Use this file as the reconciliation map from scratch recommendations to
   controlled FFT documents.

All six scratch files in this folder remain research provenance. Living FFT authority remains the
controlled module pack under `docs/modules/feed-farm-trade/`.

## 2. Product Thesis To Retain

The durable conclusion across the three inputs is:

> Feed Farm Trade owns feed-specific commercial intent, commercial evidence,
> technical conversion, demand intelligence, governed collaboration, and
> module-level audit. Operational and financial execution remains in designated
> systems of record.

This keeps FFT from becoming a broad ERP, accounting, production, quality, or
farm-recordkeeping product. It also protects the real product distinction:
feed volume, species, production cycles, feed programs, mill source, freight,
technical evidence, contract utilization, and governed trade collaboration.

## 3. Current Authority Guardrails

The improvement recommendations must be interpreted through current Afenda-Lite
authority:

| Guardrail | Current authority | Effect on scratch recommendations |
| --- | --- | --- |
| Bounded contexts | `ARCH-006` keeps Afenda-Lite contexts as Identity, Declarations, Trade / FFT, and Platform | Proposed internal FFT capability groups are subdomains, aggregates, or catalogs, not new Afenda-Lite bounded contexts |
| Module shell | `FFT-MOD-001` locks FFT to AdminCN and `/fft/**` | Do not promote farm/dealer self-service or separate field apps without a new approved program |
| Tenancy | `ARCH-023` locks current shared-schema tenancy with hard `organization_id = $org` roots | Dedicated database and regional-cell ideas are future architecture candidates, not current FFT implementation instructions |
| Operations | `FFT-MOD-008` owns runtime flags and production gates | Do not use scratch research to enable deposits, pickup, imports, ERP writes, or other ops surfaces |
| Readiness | `FFT-MOD-009` and `FFT-MOD-010` own evidence and claim aggregation | Scratch documents cannot mark FFT ready or bypass evidence rows |
| Documentation control | `DOC-001` through `DOC-003` govern controlled updates | Promotion requires an explicit bounded reopen of each controlled document |

## 4. Disposition Matrix

| Recommendation from `3-fft-improvement.md` | Disposition | Controlled destination | Notes |
| --- | --- | --- | --- |
| Explicit FFT internal capability map | Adopt with terminology correction | `FFT-MOD-002` | Use subdomains, aggregates, or catalogs. Do not create new Afenda-Lite bounded contexts without `ARCH-006` approval. |
| Aggregate and invariant catalog | Adopt as candidate | `FFT-MOD-004` | Good promotion target for Opportunity, Quotation, Trial, Forecast, Trade Relationship, and Complaint records. |
| Command, query, event, and projection ownership | Adopt as candidate | `FFT-MOD-007` | Converts broad API-first language into executable integration contracts and adapter rules. |
| Canonical domain events | Adopt as candidate | `FFT-MOD-007` | Needs event owner, producer, consumer, schema version, idempotency, sensitivity, and replay policy. |
| Governed document lifecycle patterns | Adopt as candidate | `FFT-MOD-004`, `FFT-MOD-007` | Especially useful for quotations, contracts, forecasts, approvals, and complaints. |
| Party, Account, Farm Site, and external-reference distinction | Adopt as candidate | `FFT-MOD-002`, `FFT-MOD-004` | Prevents customer, farm, legal entity, and account terms from becoming interchangeable. |
| Master-data and identity-resolution rules | Adopt as candidate | `FFT-MOD-004`, `FFT-MOD-007` | Promote matching, duplicate handling, ERP references, historical aliases, and cross-tenant references. |
| Data-classification and field-authorization matrix | Adopt as candidate | `FFT-MOD-005` | Useful for margin, cost, technical results, partner-shared fields, exports, logs, retention, and AI use. |
| Technical assessment versus controlled trial distinction | Adopt as candidate | `FFT-MOD-002`, `FFT-MOD-004`, `FFT-MOD-009` | Separate commercial observations, structured field evaluations, controlled technical trials, and external study references. |
| Forecast assumption and scenario model | Adopt as candidate | `FFT-MOD-004`, `FFT-MOD-009` | Promote assumptions, calculation version, overrides, confidence, snapshots, and reconciliation evidence. |
| Trade Relationship shared-record model | Adopt as candidate | `FFT-MOD-002`, `FFT-MOD-004`, `FFT-MOD-005`, `FFT-MOD-007` | Strongest candidate for making collaboration precise: ownership, proposed changes, approval, revocation, retention, corrections, and dispute handling. |
| Integration ownership and reconciliation standard | Adopt as candidate | `FFT-MOD-007`, `FFT-MOD-009` | Aligns with the existing system-of-record boundary and evidence requirements. |
| NFR evidence ownership model | Adopt as candidate | `FFT-MOD-009`, `FFT-MOD-010` | Scratch may identify evidence needs; only the verification ledger can prove them. |
| Offline synchronization protocol | Defer to future approved program | `FFT-MOD-010` | Current FFT authority does not authorize a separate offline mobile or broad field application surface. Capture as deferred scope only. |
| Farm or dealer self-service portal | Defer to future approved program | `FFT-MOD-010` | Current actor lock is organization-admin sales and ops, not end-customer storefronts. |
| Dedicated database service tiers and regional cells | Defer to architecture program | `ARCH-023`, `FFT-MOD-010` | Conflicts with current shared-schema branch policy unless reopened through architecture control. |
| Broad CRM, CPQ, rebate, and channel expansion | Defer unless sliced and approved | `FFT-MOD-010` | Keep the feed-specific commercial semantics; do not import generic ERP breadth from benchmark products. |
| Rebuilding ERP, finance, production, warehouse, formulation, lab, or quality ledgers | Reject | `FFT-MOD-001`, `FFT-MOD-007` | FFT should integrate these systems of record and own governed commercial visibility or requests. |
| Bypassing module flags, permission codes, or readiness evidence through scratch recommendations | Reject | `FFT-MOD-005`, `FFT-MOD-008`, `FFT-MOD-009` | Scratch research does not authorize code, operations, or readiness claims. |

## 5. Promotion Targets

Accepted candidates should be promoted once, into their owning controlled home:

| Candidate area | Owning controlled document |
| --- | --- |
| Product locks and module shape | `FFT-MOD-001` |
| Domain ownership, vocabulary, and subdomain map | `FFT-MOD-002` |
| Data model, aggregates, invariants, lifecycle fields | `FFT-MOD-004` |
| Authorization, data classification, field access, export policy | `FFT-MOD-005` |
| API, events, commands, adapters, integration reconciliation | `FFT-MOD-007` |
| Runtime gates, flags, production promotion | `FFT-MOD-008` |
| Evidence rows, NFR proof, verification procedures | `FFT-MOD-009` |
| Deferred scope, roadmap, readiness aggregation | `FFT-MOD-010` |

## 6. Promotion Sequence

Use this sequence before any scratch recommendation becomes controlled FFT
authority:

1. Product owner approves each disposition by topic.
2. The target controlled document is explicitly reopened by ID and bounded
   purpose.
3. The approved requirement is written only into its owning document.
4. Related controlled documents are linked, not duplicated.
5. Verification updates the document metadata and evidence as required.
6. The controlled document returns to `Closed`.

No code work, runtime flag promotion, readiness claim, or customer-facing scope
change should start from this scratch file alone.

## 7. Recommended Next Controlled Batch

If the product owner wants to promote the strongest research results, the
highest-signal batch is:

1. `FFT-MOD-002`: add an internal FFT subdomain map and vocabulary corrections.
2. `FFT-MOD-004`: add aggregate, invariant, lifecycle, and forecast/trial
   data-contract candidates.
3. `FFT-MOD-005`: add data-classification and field-authorization vocabulary.
4. `FFT-MOD-007`: add command, event, integration, and reconciliation catalog
   structure.
5. `FFT-MOD-009`: add evidence ownership for the promoted requirements.

This batch strengthens the enterprise production contract without expanding FFT
into deferred portals, offline apps, dedicated tenancy tiers, or external-system
ledger replacement.

## 8. Notes

`1-fft-architecture.md` should not be updated in place unless the intent is to
publish a new version of the scratch blueprint and then refresh the scorecard
and critique. That is more churn than value for the current goal.

Creating this fourth reconciliation file preserves traceability:

```text
1 source blueprint
-> 2 benchmark scorecard
-> 3 improvement critique
-> 4 promotion map
-> 5 relevant architecture
-> 6 FT slice map
-> controlled FFT-MOD updates only after approval
```
