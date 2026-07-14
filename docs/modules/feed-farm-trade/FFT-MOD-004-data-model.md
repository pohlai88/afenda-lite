# FFT-MOD-004 Data Model

| Field             | Value           |
| ----------------- | --------------- |
| **ID**            | FFT-MOD-004     |
| **Category**      | Module          |
| **Version**       | 1.3.0 |
| **Status**        | Living          |
| **Control State** | Closed        |
| **Owner**         | Feed Farm Trade |
| **Updated**       | 2026-07-14      |
| **Spine**         | MOD-004 Data Model |

---

# 1. Purpose

Describe Feed Farm Trade data entities, relationships, tenancy rules, and migration ownership.

**Audience:** backend engineers changing FFT schema or queries.
**Action enabled:** keep org predicates and migration lanes correct without soft-tenancy residue.

---

# 2. Scope

## 2.1 In Scope

- Entity / table summary and relationships
- `organization_id` rules for FFT
- Migration lane ownership
- Deferred schema limits

## 2.2 Out of Scope

- Gate SQL evidence / promotion checklists → [FFT-MOD-008](FFT-MOD-008-ops-runtime.md)
- Platform tenancy Decision lock → [ARCH-023](../../architecture/ARCH-023-multi-tenancy.md)
- Permission codes → [FFT-MOD-005](FFT-MOD-005-auth-tenancy-rbac.md)

---

# 3. Data Model

## 3.1 Entities / tables

Trade lane rooted on events and related children (orders, allocation runs, sales members, RBAC assignments, deposits/pickup, notifications, ERP sync jobs).

| Fact | Value |
|------|-------|
| Authoritative migration lane | `013`–`023` Feed Farm Trade |
| Hot sales origin | `013_hot_sales.sql` |
| RBAC | `014_fft_rbac.sql` |

Production smoke / SQL evidence: [FFT-MOD-008](FFT-MOD-008-ops-runtime.md).

## 3.2 Relationships

- Parent **event** scopes children (orders, allocation, templates).
- Sales allowlist rows are roster data — **not** module entry SoT.
- ERP sync store is module-local (`modules/fft/domain/erp-sync-store.ts`).

## 3.3 `organization_id` rules

- Hard `organization_id = $org` on tenant roots (platform cutover / migration `027`).
- Do not reintroduce soft `(IS NULL OR = $org)` dual-mode.
- FFT child denorm of `organization_id` is **deferred** (ARCH-023 **D4**) — resolve via parent event + org-scoped getters.

## 3.4 Migration ownership

| Lane | Owner |
|------|-------|
| `013`–`023` Feed Farm Trade | FFT module |
| Platform RBAC / tenancy `025`/`027`/`028` | Platform (not FFT-only commits) |

## 3.5 Indexes / hot paths

Prefer existing getters with org arguments over ad-hoc cross-tenant queries. Index/SQL evidence for gates lives with ops runtime.

## 3.6 Deferred / limits

- Notification triggers in `023` deferred where noted in [FFT-MOD-008](FFT-MOD-008-ops-runtime.md).
- No schema-per-tenant or project-per-tenant (ARCH-023 **D5** / **R5**).

## 3.7 Enterprise requirements

Single-owner ACs for this role. Evidence: [FFT-MOD-009](FFT-MOD-009-verification.md). Standard: [MOD-002](../MOD-002-modules-index.md).

| AC-ID | Profile | Quality Dimension | Applicability | Criterion |
| --- | --- | --- | --- | --- |
| FFT-AC-004-01 | Enterprise Core | CORE-DATA | Core | Hard tenancy: `organization_id = $org` on tenant roots; no soft dual-mode; D4/D5 limits cited to ARCH-023. |
| FFT-AC-004-02 | Enterprise Core | CORE-DATA | Core | Integrity under concurrency: allocation and double-submit / window races are transaction-safe; nested writes do not create orphaned cross-tenant state. |
| FFT-AC-004-03 | Enterprise Core | CORE-DATA | Core | Retention/audit and migration ownership: FFT lane migrations and auditability of material mutations are stated; indexes/hot paths do not bypass org predicates. |
| FFT-AC-004-04 | ERP | ERP-MASTER-DATA | Core | Master and configuration data have ownership, quality rules, migration mapping, validation, reconciliation, and retention controls across organizations. |
---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| DOC-001 | Documentation Control Standard | Governance |
| MOD-002 | Modules Index | Module Enterprise Readiness standard |
| ARCH-023 | Multi-Tenancy and Platform RBAC | Tenancy SSOT |
| FFT-MOD-002 | Domain and Ownership | Code map |
| FFT-MOD-008 | Ops Runtime | Migration lane in prod |
| FFT-MOD-009 | Verification | Evidence ledger |

---

# 5. Change Log

| Version | Date       | Summary |
| ------- | ---------- | ------- |
| 1.3.0 | 2026-07-14 | Executable quality contract: profile/dimension mapping and owned ERP benchmark criteria. |
| 1.2.0   | 2026-07-14 | Wave C: enterprise requirements FFT-AC-004-01…03 (integrity/concurrency/audit). |
| 1.1.0   | 2026-07-14 | DOC-003 six-section retrofit; compact data-model ownership. |
| 1.0.1   | 2026-07-14 | Added mandatory Control State header field (Closed). |
| 1.0.0   | 2026-07-13 | Initial spine |

---

# 6. Notes

**Spine role:** MOD-004 Data Model — schema and tenancy predicates only.
