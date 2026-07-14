# MOD-002 Modules Index

| Field             | Value      |
| ----------------- | ---------- |
| **ID**            | MOD-002    |
| **Category**      | Module     |
| **Version**       | 4.0.0 |
| **Status**        | Living     |
| **Control State** | Closed     |
| **Owner**         | Platform   |
| **Updated**       | 2026-07-14 |

---

# 1. Purpose

`docs/modules/` is the home for **product-module documentation**. Every product module uses the same fixed **10-MOD spine**.

This document is the sole Living **Module category standard** for:

- module catalogue and layout;
- fixed `MOD-001`…`010` role contracts;
- acceptance-criterion (AC) ownership and ID grammar;
- evidence semantics and the structured evidence ledger;
- **Module Enterprise Readiness** claim rules; and
- document-lifecycle completeness criteria for Living module docs.

**Audience:** engineers and agents creating or revising module spines.
**Action enabled:** build consistent module packs and decide whether a readiness claim is allowed — without confusing document lifecycle with product readiness.

DOC-003 remains authoritative for the common header and six-section controlled-document shape. DOC-001 names this document as the stricter Module category standard.

**Executable module contract:** 1.0.0

The executable mirror at `.cursor/skills/afenda-elite-doc-control/module-pack-contract.json` is subordinate to this document. Its schema, validator, and scaffold commands must agree with this version and marker; it never becomes a second documentation authority.

---

# 2. Scope

## 2.1 In Scope

- Catalogue of product modules under `docs/modules/`
- Fixed ten-role spine layout and ownership
- Separation of document lifecycle from Module Enterprise Readiness
- AC ownership beside `*-MOD-001`…`008`; evidence in `*-MOD-009`; claims in `*-MOD-010`
- Structured evidence table schema and validator expectations

## 2.2 Out of Scope

- Platform tenancy / IAM facts → [ARCH-023](../architecture/ARCH-023-multi-tenancy.md)
- Platform env model → [ARCH-027](../architecture/ARCH-027-env-model.md)
- Interface / API architecture → [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md) and Living `docs/api/` contracts
- Creating `MOD-011` or depth folders (`adr/`, `ops/`, `spec/`) under module homes
- Treating Module Enterprise Readiness as Afenda-Elite product/release certification
- Implementing blocked product code to satisfy readiness criteria

## 2.3 Authority

| Concern | Authority |
| ------- | --------- |
| Documentation governance | DOC-001 |
| Register | DOC-002 |
| Header + six sections | DOC-003 |
| Module category layout, AC ownership, evidence, readiness claims | **This document (MOD-002)** |
| Module-specific product facts | Each module’s `*-MOD-001`…`010` |

---

# 3. Module Enterprise Readiness Standard

## 3.1 Module catalog

| Module | Shell id | Home | Index | Agent runtime |
|--------|----------|------|-------|---------------|
| Feed Farm Trade | `fft` | [feed-farm-trade/](feed-farm-trade/) | [FFT-MOD-010](feed-farm-trade/FFT-MOD-010-module-docs-index.md) | [FFT-MOD-008](feed-farm-trade/FFT-MOD-008-ops-runtime.md) |

Platform tenancy / RBAC (not a product-module spine): [ARCH-023](../architecture/ARCH-023-multi-tenancy.md).

## 3.2 Target layout

```text
docs/modules/
  MOD-002-modules-index.md          ← this file (catalog + Module category standard)
  <module-slug>/
    README.md                       → MOD-010
    *-MOD-001-…md … *-MOD-010-…md   ← exactly ten spine files
```

**File + header IDs** are module-qualified (`FFT-MOD-001`, …) so every module can implement the same spine roles without ID collision.

**Forbidden:** depth folders under module homes; `MOD-011` or additional spine roles; parallel Living SSOTs outside the ten files.

## 3.3 Independent axes — document lifecycle vs readiness

### Document lifecycle (DOC-001)

`Draft → Review → Living` (and other DOC-001 statuses as applicable).

A Living module document may accurately report `FAIL`, `BLOCKED`, or `NOT EVIDENCED` results. The Living gate for module docs validates **documentation completeness and authority alignment only**. It never implies implementation readiness or a Module Enterprise Readiness claim.

### Module Enterprise Readiness (this standard)

Three independent dimensions — **not** DOC-002 register fields:

| Dimension | Allowed values |
| --------- | -------------- |
| Applicability | `Core` · `Conditional` · `Out of Scope` |
| Activation | `Enabled` · `Disabled` · `Uncontracted` |
| Evidence | `PASS` · `FAIL` · `BLOCKED` · `NOT EVIDENCED` · `NOT ENABLED` |

**Claim name:** Module Enterprise Readiness. Passing one module does **not** certify Afenda-Elite, the entire Afenda product, or a release.

### Claim rules

1. Every `Core` criterion must be `Enabled` and `PASS`.
2. An `Enabled` Conditional criterion must be `PASS`.
3. A `Disabled` or `Uncontracted` Conditional criterion may be `NOT ENABLED` only when fail-closed behavior has recorded evidence; otherwise it is `NOT EVIDENCED`.
4. `Out of Scope` requires an owning rationale/authority and is excluded from the claim.
5. Any mandatory `FAIL`, `BLOCKED`, or `NOT EVIDENCED` blocks a readiness claim.
6. Do not infer `PASS` from prose, historical claims, wiring, or MVP narrative. Missing or stale runtime evidence defaults to `NOT EVIDENCED`.

### Quality profiles and dimensions

Every pack activates **Enterprise Core**. Optional profiles are declared by the exact MOD-010 marker `**Quality profiles:** <comma-separated profiles>`. Feed Farm Trade activates **Enterprise Core, ERP**. Each active dimension requires at least one AC in its sole owning role.

| Profile | Quality dimension | Sole owner |
| --- | --- | --- |
| Enterprise Core | CORE-ARCH | MOD-001 |
| Enterprise Core | CORE-PROCESS | MOD-002 |
| Enterprise Core | CORE-PLATFORM | MOD-003 |
| Enterprise Core | CORE-DATA | MOD-004 |
| Enterprise Core | CORE-SECURITY | MOD-005 |
| Enterprise Core | CORE-EXPERIENCE | MOD-006 |
| Enterprise Core | CORE-INTEGRATION | MOD-007 |
| Enterprise Core | CORE-OPERATIONS | MOD-008 |
| ERP | ERP-PROCESS-CONTROLS; ERP-REPORTING | MOD-002 |
| ERP | ERP-CONFIG-ALM | MOD-003 |
| ERP | ERP-MASTER-DATA | MOD-004 |
| ERP | ERP-SOD-COMPLIANCE | MOD-005 |
| ERP | ERP-LOCALIZATION | MOD-006 |
| ERP | ERP-CLEAN-CORE-INTEGRATION | MOD-007 |
| ERP | ERP-CUTOVER-OPERATIONS | MOD-008 |

A dimension may be Out of Scope only when MOD-009 records `Activation=Uncontracted`, `Evidence=NOT ENABLED`, reproducible fail-closed evidence, and an authority-backed rationale.

## 3.4 Document-completeness criteria for Living (not readiness)

A Living `*-MOD-*` document is documentation-complete when:

1. DOC-003 header fields and numbered sections `#1`…`#6` are present.
2. Role ownership matches §3.5 — no duplicate ownership of locks, flags, production state, MVP narrative, requirements, evidence rows, or claims across sibling MODs.
3. Header Version / Updated ↔ latest Change Log row ↔ DOC-002 register row.
4. Control State is Closed after verified work (or correctly Reopened with note while editing).
5. Cross-references point at owning authorities; platform facts remain in ARCH/API docs.

Meeting these criteria does **not** authorize a Module Enterprise Readiness claim.

## 3.5 Fixed role contracts (MOD-001…010)

| Role | Owns | Must not own |
| ---- | ---- | ------------ |
| **MOD-001** | Architecture and failure boundaries; product locks for the module | MVP claims; evidence rows; ops checklists |
| **MOD-002** (spine) | Business journey, actors, capability/domain ownership | Platform tenancy rewrite; evidence ledger |
| **MOD-003** | Runtime support, dependencies, environments, flags, resource budgets | Secret values; platform-wide env policy (link ARCH-027) |
| **MOD-004** | Integrity, transactions/concurrency, retention/audit, migrations/indexes | Authz matrices; readiness claim |
| **MOD-005** | Tenancy, identity, authorization, least privilege, abuse and audit controls | Platform IAM redesign (link ARCH-023) |
| **MOD-006** | User journeys, routes, accessibility, responsive UI, i18n, loading/error/empty states | Domain mutation contracts |
| **MOD-007** | Schemas/contracts, Actions/RH, idempotency, adapters, timeout/retry behavior | Duplicate API-001/002 (link them) |
| **MOD-008** | Production state, observability, SLO/signals, recovery, rollback, operations | Requirement redefinition; evidence ledger |
| **MOD-009** | Evidence and result state only — structured evidence table + verify commands | Redefining AC text owned by 001–008 |
| **MOD-010** | Readiness summary, gaps, roadmap, and claims only | Copying full requirement lists or evidence rows |

### Required sections by role (documentation shape)

- **001:** Context · Responsibilities and boundaries · Components · Data/request flow · Key decisions · Failure modes · Operational considerations · Known limits · **Enterprise requirements**
- **002:** Bounded context · Ubiquitous language · Code/doc ownership · Forbidden renames · Business journey · **Enterprise requirements**
- **003:** Runtime · Frameworks/UI · Data access · Auth dependency · Flags/env · Local vs prod · Budgets · **Enterprise requirements**
- **004:** Entities · Relationships · `organization_id` rules · Migrations · Indexes · Integrity/concurrency · **Enterprise requirements**
- **005:** Identity · Org resolution · Platform vs module permissions · Gates · Deny behavior · Abuse/audit · **Enterprise requirements**
- **006:** Route map · Layout/shell · Surfaces · A11y/responsive/i18n · Journey states · **Enterprise requirements**
- **007:** Actions map · Route Handlers · Result/error types · Ports/adapters · Idempotency/retry · **Enterprise requirements**
- **008:** Production state · Allowed/forbidden · Observability/SLO · Recovery/rollback · Verify pointers · **Enterprise requirements**
- **009:** Commands · Structured evidence table · Integration-chain evidence view · Done definition
- **010:** Status snapshot · Agent read order · Catalog · Readiness aggregation · Gaps/roadmap · Claims

## 3.6 AC ownership and executable requirement contract

Product requirements live once beside their owning facts in `*-MOD-001`…`008` under **Enterprise requirements**. AC-ID format is `<MODULE>-AC-<ROLE>-<NN>`; ROLE is `001`…`008` and must match the owning MOD.

Every requirements table uses exactly:

| AC-ID | Profile | Quality Dimension | Applicability | Criterion |
| --- | --- | --- | --- | --- |
| `<MODULE>-AC-<ROLE>-<NN>` | Active profile | Contract dimension owned by ROLE | `Core` · `Conditional` · `Out of Scope` | Testable, non-placeholder requirement |

Duplicate ACs, inactive profiles, wrong dimension owners, and `TODO`/`TBD` placeholders fail validation. MOD-009 references each AC exactly once and MOD-010 summarizes only.

## 3.7 Structured evidence table (MOD-009)

Every Living `*-MOD-009` includes exactly one table with these columns in order:

| AC-ID | Owner MOD | Profile | Quality Dimension | Applicability | Activation | Evidence | Evidence Reference | Evidence Revision | Evidence Date | Blocker / Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

The validator joins every requirement to exactly one evidence row and rejects missing or orphan rows. `PASS` requires reference, revision, and ISO date. `NOT ENABLED` also requires reproducible fail-closed reference, revision, date, and rationale. Non-PASS rows require Blocker / Rationale. Structural validation may pass while readiness remains Not claimable.

### Integration-chain evidence view

MOD-009 may include a cross-cutting view that references sibling ACs without redefining them.

## 3.8 Scaffold and promotion rule

Use the contract-driven dry run first:

```powershell
npm run plan:module-pack -- -- --prefix INV --slug inventory --title "Inventory" --owner Platform --profiles "Enterprise Core,ERP"
```

`npm run scaffold:module-pack -- -- --prefix INV --slug inventory --title "Inventory" --owner Platform --profiles "Enterprise Core,ERP" --apply` may write only under `docs/scratch/module-packs/<slug>/`, refuses overwrite, and remains non-authoritative. Promotion requires approved IDs, a MOD-002 catalogue update, DOC-002 registration, bounded reopen, movement to `docs/modules/<slug>/`, validation, and closure. Exactly ten spine files remain mandatory; depth folders and MOD-011 are forbidden.

---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| DOC-001 | Documentation Control Standard | Names this document as Module category standard |
| DOC-002 | Documentation Register | Catalogue |
| DOC-003 | Controlled Document Template | Header and six-section shape |
| ARCH-023 | Multi-tenancy | Platform IAM / tenancy SSOT |
| ARCH-027 | Env model | Platform env SSOT |
| ARCH-029 | Interface API architecture | Platform interface parent |
| Microsoft Dynamics implementation/data/testing guidance | Enterprise ERP benchmark | Non-authoritative quality input |
| SAP clean-core guidance | Upgrade-safe extension benchmark | Non-authoritative quality input |
| ISO/IEC 25010:2023 | Product quality model | Non-authoritative quality input |

---

The benchmark inputs are [Microsoft implementation strategy](https://learn.microsoft.com/en-us/dynamics365/guidance/implementation-guide/implementation-strategy), [data guidance](https://learn.microsoft.com/en-us/dynamics365/guidance/implementation-guide/data-management), [testing strategy](https://learn.microsoft.com/en-us/dynamics365/guidance/implementation-guide/testing-strategy), [SAP clean core](https://help.sap.com/docs/build-process-automation/sap-build-process-automation/clean-core), and [ISO/IEC 25010:2023](https://www.iso.org/standard/78176.html). MOD-002 remains the authority.

---

# 5. Change Log

| Version | Date       | Summary |
| ------- | ---------- | ------- |
| 4.0.0 | 2026-07-14 | Executable contract 1.0.0; Core/ERP profiles; five/eleven-column interfaces; deterministic scaffold and validation rules. |
| 3.0.0   | 2026-07-14 | Module Enterprise Readiness standard: lifecycle ≠ readiness; fixed 10-MOD role contracts; AC ownership/ID grammar; structured evidence ledger schema; claim rules; DOC-003 six-section retrofit. |
| 2.1.2   | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 2.1.1   | 2026-07-13 | Guideline links → ARCH-023 + MOD-005 (no ADR stubs) |
| 2.1.0   | 2026-07-13 | Spine-only module homes — depth folders forbidden |
| 2.0.0   | 2026-07-13 | 10-MOD spine guideline; FFT under `feed-farm-trade/` |
| 1.0.0   | 2026-07-13 | Scaffolded modules folder |

---

# 6. Notes

**Retired acceptance overlays:** module-specific enterprise acceptance guides must not compete with this standard. GUIDE-016 is Retired under `docs/guides/archive/` (ID non-recyclable); active authority is MOD-002 + owning `*-MOD-001`…`010`.

**Afenda-Lite vs Afenda-Elite:** this Module category standard is shared. Edition maturity does not change the ten roles, evidence schema, or claim rules. A single module’s readiness claim never certifies an edition release.
