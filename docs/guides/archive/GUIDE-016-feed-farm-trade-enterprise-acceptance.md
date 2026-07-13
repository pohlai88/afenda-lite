# GUIDE-016 Feed Farm Trade Enterprise Acceptance

| Field             | Value           |
| ----------------- | --------------- |
| **ID**            | GUIDE-016       |
| **Category**      | Guide           |
| **Version**       | 0.2.0           |
| **Status**        | Retired         |
| **Control State** | Closed          |
| **Owner**         | Feed Farm Trade |
| **Updated**       | 2026-07-14      |
| **Location**      | `docs/guides/archive/` |
| **Superseded by** | [MOD-002](../../modules/MOD-002-modules-index.md) · owning FFT-MOD-001…008 · [FFT-MOD-009](../../modules/feed-farm-trade/FFT-MOD-009-verification.md) · [FFT-MOD-010](../../modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) |

---

# 1. Purpose

**Archive notice.** This guide is **Retired**. It must not be treated as Living authority for Module Enterprise Readiness, AC ownership, or evidence.

**Why retired:** reusable acceptance rules and FFT criteria now live in the fixed 10-MOD Module category standard and the FFT spine.

**Successors:**

| Concern | Living authority |
| ------- | ---------------- |
| Module category standard / claim rules | [MOD-002](../../modules/MOD-002-modules-index.md) |
| Single-owner product requirements | FFT-MOD-001…008 Enterprise requirements |
| Evidence ledger | [FFT-MOD-009](../../modules/feed-farm-trade/FFT-MOD-009-verification.md) |
| Readiness claim aggregation | [FFT-MOD-010](../../modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) |

**Forbidden:** Restoring this file to `docs/guides/` as Draft/Living SSOT; recycling the GUIDE-016 ID; teaching Doc-ready/Domain E2E matrices from this archive as current.

---

# 2. Scope

## 2.1 In Scope

- Historical migration crosswalk proving every reusable rule and former FFT AC row has a destination
- Archive metadata for DOC-002

## 2.2 Out of Scope

- Active acceptance procedures (use MOD-002 + FFT spine)
- Changing FFT product locks or reopening 2B–2D

---

# 3. Migration crosswalk

## 3.1 Reusable rules → MOD-002

| Former GUIDE-016 topic | Destination |
| ---------------------- | ----------- |
| Shared Doc-ready / structure bar | MOD-002 §3.4 document-completeness (lifecycle independent of readiness) |
| Fullstack / evidence rubric axes | MOD-002 §3.3 Applicability · Activation · Evidence |
| Claim / fail-fast readiness rules | MOD-002 §3.3 claim rules |
| AC ownership beside facts | MOD-002 §3.6 |
| Evidence ledger schema | MOD-002 §3.7 |
| Fixed 10-MOD roles | MOD-002 §3.5 |
| Anti-Afenda-Elite certification | MOD-002 §3.3 / §6 |

## 3.2 Former Domains E2E / Doc-ready → owning FFT MOD

| Former IDs (GUIDE-016) | Owning requirement | Evidence |
| ---------------------- | ------------------ | -------- |
| D-001-* / E-001-* | FFT-AC-001-01…03 in [FFT-MOD-001](../../modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) | FFT-MOD-009 |
| D-002-* / E-002-* | FFT-AC-002-01…02 in [FFT-MOD-002](../../modules/feed-farm-trade/FFT-MOD-002-domain-and-ownership.md) | FFT-MOD-009 |
| D-003-* / E-003-* | FFT-AC-003-01…03 in [FFT-MOD-003](../../modules/feed-farm-trade/FFT-MOD-003-tech-stack.md) | FFT-MOD-009 |
| D-004-* / E-004-* | FFT-AC-004-01…03 in [FFT-MOD-004](../../modules/feed-farm-trade/FFT-MOD-004-data-model.md) | FFT-MOD-009 |
| D-005-* / E-005-* | FFT-AC-005-01…04 in [FFT-MOD-005](../../modules/feed-farm-trade/FFT-MOD-005-auth-tenancy-rbac.md) | FFT-MOD-009 |
| D-006-* / E-006-* | FFT-AC-006-01…03 in [FFT-MOD-006](../../modules/feed-farm-trade/FFT-MOD-006-surfaces-and-routes.md) | FFT-MOD-009 |
| D-007-* / E-007-* | FFT-AC-007-01…03 in [FFT-MOD-007](../../modules/feed-farm-trade/FFT-MOD-007-api-and-adapters.md) | FFT-MOD-009 |
| D-008-* / E-008-* | FFT-AC-008-01…04 in [FFT-MOD-008](../../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) | FFT-MOD-009 |
| D-009-* / E-009-* | Verification commands + structured evidence role (not product ACs) → [FFT-MOD-009](../../modules/feed-farm-trade/FFT-MOD-009-verification.md) | same |
| D-010-* / E-010-* | Readiness claim + roadmap (not product ACs) → [FFT-MOD-010](../../modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) | aggregates FFT-MOD-009 |
| §3.2 Integration chain | FFT-MOD-009 §3.6 integration-chain evidence view | FFT-MOD-009 |
| §3.13 Ready candidates | Remain planning notes in FFT-MOD-010 / module README — no new registered docs by this retirement |

**Unresolved rows:** none.

---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| MOD-002 | Modules Index | Successor category standard |
| FFT-MOD-001…010 | Feed Farm Trade spine | Successor requirements / evidence / claims |
| DOC-001 | Documentation Control Standard | Retirement / archive rules |
| DOC-002 | Documentation Register | Retired catalogue row |

---

# 5. Change Log

| Version | Date       | Summary |
| ------- | ---------- | ------- |
| 0.2.0   | 2026-07-14 | Retired and archived; migration crosswalk complete; ID non-recyclable. |
| 0.1.0   | 2026-07-14 | Draft enterprise acceptance guideline for FFT-MOD-001…010. |

---

# 6. Notes

Archived on 2026-07-14 under `docs/guides/archive/`. Former body content is superseded by the living crosswalk destinations above; do not copy archived matrices into PR reviews.
