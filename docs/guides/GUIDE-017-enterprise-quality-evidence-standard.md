# GUIDE-017 Enterprise Quality and Evidence Standard

| Field             | Value      |
| ----------------- | ---------- |
| **ID**            | GUIDE-017  |
| **Category**      | Guide      |
| **Version**       | 1.0.0      |
| **Status**        | Living     |
| **Control State** | Closed     |
| **Owner**         | Platform   |
| **Updated**       | 2026-07-14 |

---

# 1. Purpose

Define the cross-cutting evidence vocabulary and decision rules used to evaluate whether an explicitly scoped Afenda capability or release has demonstrated enterprise production quality.

Enterprise production quality is an **evidence state**. It is not established by a design adjective, deployment event, roadmap milestone, document lifecycle, configured integration, or historical success.

This guide enables reviewers to:

- identify the exact claim being evaluated;
- join every mandatory criterion to current, reproducible evidence;
- distinguish failure, blockage, missing evidence, and justified non-applicability;
- govern temporary risk acceptance without converting it to PASS; and
- issue a traceable READY, CONDITIONALLY READY, or NOT READY decision.

---

# 2. Scope

## 2.1 In Scope

- Product- and release-level evidence terminology
- Claim identity and evidence-record requirements
- Evidence freshness, inheritance, and applicability decisions
- Exception and accepted-risk governance
- Minimum enterprise evaluation dimensions
- Aggregation and release/capability decision rules
- Evidence-index and operational-handoff requirements

## 2.2 Out of Scope

- Architecture, bounded-context, package, tenancy, or implementation decisions
- Product-module AC ownership, evidence-ledger schema, or Module Enterprise Readiness claims ([MOD-002](../modules/MOD-002-modules-index.md))
- Interface/API change-gate criteria ([ARCH-029](../architecture/ARCH-029-interface-api-architecture.md) §3.14 and [GUIDE-014](../api/guides/GUIDE-014-api-contract-verification-standard.md))
- Domain-specific accounting, tax, inventory, payment, or legal requirements
- The parked future-product ERP scope in [docs/scratch](../scratch/REQ-saas-erp-multitenant-fullstack.md)
- A claim that Afenda-Lite, Afenda-Elite, any module, or any release is currently ready

## 2.3 Authority Boundary

| Concern | Authority |
| ------- | --------- |
| Documentation lifecycle and control | [DOC-001](../_control/DOC-001-documentation-control-standard.md) |
| Cross-cutting evidence vocabulary and release/capability aggregation | **This guide** |
| Module criteria, evidence rows, and Module Enterprise Readiness | [MOD-002](../modules/MOD-002-modules-index.md) plus the owning MOD-001…010 spine |
| Interface/API architecture and active change gate | [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md) |
| Planned detailed API verification standard | [GUIDE-014](../api/guides/GUIDE-014-api-contract-verification-standard.md) |
| Architecture and product behavior | Owning Living/Target ARCH, API, REST, Runbook, and Module documents |

This guide aggregates evidence supplied by owning authorities. It does not rewrite their criteria, evidence schemas, or results.

---

# 3. Enterprise Quality and Evidence Standard

## 3.1 Claim Identity

No readiness decision is valid unless the claim records:

| Field | Required content |
| ----- | ---------------- |
| Claim scope | Exact product, capability, module set, route set, migration, or release boundary |
| Revision | Immutable commit, artifact digest, or release-candidate identifier |
| Environment | Named production-equivalent environment and material configuration profile |
| Criterion set | Controlled authorities and exact gate/criterion IDs evaluated |
| Decision owner | Accountable function authorized to issue the decision |
| Decision date | ISO date |
| Evidence index | Stable references to the evidence records used |
| Exclusions | Authority-backed non-applicability decisions; never silent omissions |

A broader claim cannot inherit a narrower claim without evaluating the additional scope. A module claim never certifies a product edition or release.

## 3.2 Evidence States

| State | Meaning |
| ----- | ------- |
| PASS | Reproducible evidence satisfies the criterion for the named revision and environment. |
| FAIL | Evidence demonstrates that the criterion is not satisfied. |
| BLOCKED | Verification cannot complete because a named dependency, environment, authority, or decision is unresolved. |
| NOT EVIDENCED | Current reproducible evidence is missing, stale, incomplete, prose-only, or not bound to the claim revision/environment. |
| NOT APPLICABLE | The owning authority excludes the criterion for this claim and records rationale and fail-closed behavior where relevant. |

Missing or stale evidence defaults to NOT EVIDENCED. Configuration, wiring, deployment success, documentation status, and prior-release evidence do not imply PASS.

ACCEPTED RISK is an exception disposition, not an evidence state. It never changes an underlying FAIL, BLOCKED, or NOT EVIDENCED result to PASS.

## 3.3 Evidence Record

Every evidence record shall contain:

| Field | Required content |
| ----- | ---------------- |
| Criterion | Stable controlled gate or acceptance-criterion ID |
| Result | One evidence state from §3.2 |
| Evidence reference | Test report, CI job, audit record, exercise report, query, dashboard snapshot, or other reproducible artifact |
| Revision | Exact source/artifact/configuration revision evaluated |
| Environment | Environment and material workload/configuration identity |
| Produced at | ISO date/time |
| Producer | Accountable evidence producer |
| Reproduction | Command, procedure, or query sufficient to repeat the evaluation |
| Freshness rule | Owning authority's maximum age or rerun trigger |
| Blocker/rationale | Required for every non-PASS result |
| Sanitization | Confirmation that evidence contains no secrets or prohibited personal data |

An owning authority may require stricter fields. Evidence locations must remain access-controlled and durable for the claim's audit/retention period.

## 3.4 Freshness, Applicability, and Inheritance

Evidence from an earlier revision may be reused only through a recorded applicability decision containing:

1. changed components and trust boundaries;
2. affected criteria;
3. configuration, feature-flag, schema, dependency, and infrastructure drift;
4. environment equivalence;
5. an unchanged-control attestation;
6. explicit rationale for continued validity;
7. a reviewer distinct from the evidence producer; and
8. mandatory rerun triggers.

A trust-boundary change, schema/migration change, dependency major upgrade, environment mismatch, prior non-PASS result, or expired evidence forces a fresh evaluation unless the owning controlled authority explicitly defines a stricter rule.

Without a valid applicability decision, inherited evidence is NOT EVIDENCED for the new claim.

## 3.5 Accepted Risk

A non-waivable condition can never receive an accepted-risk disposition. A waivable non-PASS criterion may be carried only when the exception records:

- the exact criterion and underlying evidence state;
- accountable risk owner and business justification;
- compensating control and evidence that it is active;
- rollback, disablement, or containment trigger;
- approvals from all affected criterion owners;
- customer or regulator notification requirement where applicable;
- expiry no later than 30 days after approval; and
- automatic reversion to NOT READY on expiry or compensating-control failure.

Accepted risk is reported visibly in the overall decision and evidence index. It is never aggregated silently into PASS.

### Non-waivable baseline

At minimum, these conditions are non-waivable for production exposure:

- cross-organization disclosure or authorization bypass;
- known exploitable Critical or High vulnerability on the exposed path;
- production secrets in source, client bundles, logs, or evidence;
- proven data corruption or integrity loss without safe containment;
- an unvalidated restore where a recovery objective is mandatory;
- an irreversible migration without an approved, tested restore or forward-fix path; and
- inability to attribute privileged or security-sensitive actions to actor, organization, time, and correlation identity.

Owning domain authorities may add non-waivable conditions; they may not weaken this baseline.

## 3.6 Minimum Enterprise Evaluation Dimensions

Every product/release claim shall map controlled criteria and evidence across all applicable dimensions:

| Dimension | Minimum question |
| --------- | ---------------- |
| Functional and journey correctness | Do positive, adverse, failure, recovery, and concurrency paths satisfy controlled requirements? |
| Tenant and authorization isolation | Do organization, permission, ownership, job, cache, file, export, search, and integration boundaries fail closed? |
| Application security and identity | Are threat, vulnerability, identity-lifecycle, privileged-access, and secret-handling controls evidenced? |
| Availability and resilience | Are dependency failure, timeout, retry, degradation, queue/redrive, and alert behavior exercised? |
| Backup and recovery | Are required restore, integrity, RPO, RTO, rollback, and forward-fix outcomes demonstrated? |
| Performance and capacity | Does the declared workload meet latency and saturation limits without tenant starvation? |
| Observability and supportability | Can material requests, jobs, mutations, dependency failures, and incidents be diagnosed and operated? |
| Data lifecycle, privacy, and audit | Are retention, export, deletion, legal hold, residency, immutable history, and privileged access controlled where applicable? |
| Accessibility and internationalization | Do in-scope journeys meet the controlled accessibility and locale matrix? |
| Change, supply-chain, and migration safety | Are builds reproducible and are dependencies, configuration, migrations, promotion, rollback, and provenance controlled? |
| Contract and integration quality | Are schemas, errors, compatibility, idempotency, signatures, retries, rate limits, and deprecation evidenced where applicable? |
| Documentation, control, and handoff | Are authorities, traceability, procedures, owners, limits, runbooks, and support handoff current? |
| Maintainability and evolvability | Are boundaries, supported runtimes, dependency currency, upgrade paths, and rollback behavior evidenced? |

The owning controlled authority defines exact thresholds and criterion IDs. NOT APPLICABLE requires an owning rationale; a dimension cannot be omitted merely because implementation is absent.

## 3.7 Relationship to Module Evidence

MOD-002 remains the sole Module category standard. GUIDE-017 consumes module results without changing them:

| Module result | Release/capability aggregation |
| ------------- | ------------------------------ |
| PASS | May contribute PASS evidence within the exact module claim scope. |
| FAIL / BLOCKED / NOT EVIDENCED | Remains blocking for every broader claim that depends on that criterion. |
| NOT ENABLED with valid MOD-002 fail-closed evidence | May support NOT APPLICABLE only when the broader claim excludes the capability under an owning authority. |
| Out of Scope | Requires the MOD-002 authority/rationale and remains excluded only for the same scope. |

An accepted-risk decision outside the module spine does not make a module criterion PASS and does not make Module Enterprise Readiness claimable.

## 3.8 Relationship to Interface Verification

ARCH-029 §3.14 remains the active interface/API change gate. GUIDE-014 remains its planned detailed expansion until promoted under its own lifecycle.

GUIDE-017 governs only the broader evidence state, freshness, exception, and aggregation behavior. It does not add API requirements, declare contract-only interfaces implemented, or change the GUIDE-015 phase order.

## 3.9 Decision Algorithm

1. Freeze claim identity (§3.1).
2. Load all applicable controlled criteria from owning authorities.
3. Prove every criterion has exactly one current evidence result or an authority-backed NOT APPLICABLE decision.
4. Validate evidence identity, reproducibility, freshness, sanitization, and inheritance.
5. Preserve all underlying non-PASS states.
6. Evaluate approved accepted-risk dispositions separately.
7. Issue one decision:

| Decision | Rule |
| -------- | ---- |
| READY | Every applicable mandatory criterion is PASS; justified NOT APPLICABLE criteria are excluded; no accepted risks remain. |
| CONDITIONALLY READY | No non-waivable condition is non-PASS; every remaining non-PASS criterion is waivable and has a current accepted-risk disposition. |
| NOT READY | Any mandatory criterion is FAIL, BLOCKED, or NOT EVIDENCED without a valid accepted-risk disposition, or any non-waivable condition is non-PASS. |

The decision record shall list blocking criteria, accepted risks, exclusions, evidence index, decision owner, and expiry/review date.

## 3.10 Incremental Delivery

Incremental scope reduces the number of applicable criteria, not their required quality. Every production-exposed slice shall satisfy all criteria applicable to that slice.

Terms such as MVP, lite, thin, simple, beta, or good enough never relax correctness, isolation, security, audit, accessibility, recovery, evidence, or operability.

## 3.11 Current Checkout Posture

GUIDE-017 being Living means the evidence standard is approved and maintained. It does **not** mean the product or a release is ready.

This docs-first checkout has no Target product tree. Afenda-Lite runtime and product readiness therefore remain NOT EVIDENCED until an explicitly scoped claim has current reproducible evidence from the implemented Target.

---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| DOC-001 | Documentation Control Standard | Governance and lifecycle |
| DOC-002 | Documentation Register | Controlled catalogue |
| DOC-003 | Controlled Document Template | Header and structure |
| MOD-002 | Modules Index | Module evidence and Module Enterprise Readiness authority |
| ARCH-029 | Interface and API Architecture | Active interface change gate |
| GUIDE-014 | API Contract Verification Standard | Planned detailed API evidence standard |
| ARCH-028 | Turborepo Implementation Slices | Docs-first anti-contamination and implementation gate |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.0.0 | 2026-07-14 | Approved Living cross-cutting evidence and release/capability decision standard after complete guide and docs-wide integrity review; MOD-002, ARCH-029, GUIDE-014, and parked ERP boundaries retained. |
| 0.9.0 | 2026-07-14 | Review candidate extracted from reusable evidence semantics in the parked ERP requirements draft; excludes future-product ERP scope and preserves MOD-002 / ARCH-029 authority. |

---

# 6. Notes

The source scratch document remains parked and non-authoritative. Only the cross-cutting evidence and decision semantics in this guide are promoted.

GUIDE-017 does not certify Afenda-Lite or Afenda-Elite. Edition maturity does not alter the evidence rules.
