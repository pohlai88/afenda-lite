# DOC-002 Documentation Register

| Field             | Value      |
| ----------------- | ---------- |
| **ID**            | DOC-002    |
| **Category**      | Control    |
| **Version**       | 4.36.0 |
| **Status**        | Living     |
| **Control State** | Closed     |
| **Owner**         | Platform   |
| **Updated**       | 2026-07-14 |






---

# 1. Purpose

This document is the controlled catalogue of authoritative documents for this Afenda checkout (Afenda-Lite).

The catalogue shape is shared with Afenda-Elite: seven register fields, the same categories and lifecycle, and governance from [DOC-001](DOC-001-documentation-control-standard.md). Lite is the beta edition; Elite is the battle-proven edition — not a second documentation system.

It records only the metadata needed to confirm:

- whether a document exists;
- which version is current;
- who owns it; and
- whether it remains authoritative.

The register is governed by [DOC-001 Documentation Control Standard](DOC-001-documentation-control-standard.md).

---

# 2. Scope

## 2.1 In Scope

This register includes controlled documents whose IDs have been explicitly approved.

Each row contains exactly:

- ID;
- Category;
- Title;
- Version;
- Status;
- Owner; and
- Updated date.

## 2.2 Out of Scope

This register does not contain:

- file paths;
- slugs;
- tags;
- keywords;
- priorities;
- supersession relationships;
- implementation progress; or
- unapproved provisional documents.

## 2.3 Allocation Gate

A new document row shall not be added unless the user has explicitly approved the document ID.

Agents may propose a candidate ID, but shall not invent, reuse, or commit an ID without approval.

---

# 3. Register

| ID           | Category     | Title                                      | Version | Status | Owner    | Updated    |
| ------------ | ------------ | ------------------------------------------ | ------- | ------ | -------- | ---------- |
| DOC-001      | Control      | Documentation Control Standard             | 2.4.0   | Living | Platform | 2026-07-14 |
| DOC-002      | Control      | Documentation Register                     | 4.34.0 | Living | Platform | 2026-07-14 |
| DOC-003      | Control      | Controlled Document Template               | 1.4.0   | Living | Platform | 2026-07-14 |
| ARCH-029     | Architecture | Interface and API Architecture             | 1.2.5   | Living | Platform | 2026-07-14 |
| ARCH-031     | Architecture | Technology Stack Catalogue                 | 1.0.0   | Living | Platform | 2026-07-14 |
| API-001      | API          | API Boundaries                             | 1.2.3   | Living | Backend  | 2026-07-14 |
| API-002      | API          | Error Contract                             | 1.2.2   | Living | Backend  | 2026-07-14 |
| API-003      | API          | API Types                                  | 2.0.1   | Living | Backend  | 2026-07-14 |
| API-004      | API          | Schema Map                                 | 1.1.3   | Living | Backend  | 2026-07-14 |
| API-005      | API          | Authentication and Authorization Contract  | 0.1.1   | Draft  | Platform | 2026-07-14 |
| API-006      | API          | Idempotency and Concurrency Contract       | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| API-007      | API          | API Observability and Correlation Contract | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| API-008      | API          | Collection Query Contract                  | 0.1.2   | Draft  | Backend  | 2026-07-14 |
| API-009      | API          | Compatibility and Deprecation Contract     | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| REST-001     | REST         | REST Resources                             | 2.0.1   | Living | Backend  | 2026-07-14 |
| REST-002     | REST         | Identity and Organization Resources        | 0.1.1   | Draft  | Platform | 2026-07-14 |
| REST-003     | REST         | Client Resources                           | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| REST-004     | REST         | Declaration Resources                      | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| REST-005     | REST         | Assignment and Submission Resources        | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| REST-006     | REST         | Public Survey and Secure-Link Resources    | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| REST-007     | REST         | Account Resources                          | 0.1.1   | Draft  | Platform | 2026-07-14 |
| FFT-REST-001 | REST         | Feed Farm Trade Resource Index             | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| OPEN-001     | OPEN         | OpenAPI                                    | 1.1.6   | Living | Backend  | 2026-07-14 |
| GUIDE-007    | Guide        | Implementing a Server Action               | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| GUIDE-008    | Guide        | Implementing a Route Handler               | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| GUIDE-009    | Guide        | Adding a REST Resource                     | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| GUIDE-010    | Guide        | Adding a Zod Contract                      | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| GUIDE-011    | Guide        | Generating and Validating OpenAPI          | 0.1.2   | Draft  | Backend  | 2026-07-14 |
| GUIDE-012    | Guide        | Testing API Contracts                      | 0.1.2   | Draft  | Backend  | 2026-07-14 |
| GUIDE-013    | Guide        | API Security Review Checklist              | 0.1.1   | Draft  | Platform | 2026-07-14 |
| GUIDE-014    | Guide        | API Contract Verification Standard         | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| GUIDE-015    | Guide        | Interface Pack Development Roadmap         | 1.0.2   | Living | Platform | 2026-07-14 |
| GUIDE-016    | Guide        | Feed Farm Trade Enterprise Acceptance      | 0.2.0   | Retired | Feed Farm Trade | 2026-07-14 |
| RB-006       | Runbook      | OpenAPI Drift Detection and Recovery       | 0.2.0   | Draft  | Backend  | 2026-07-14 |
| RB-007       | Runbook      | API Incident Response                      | 0.2.0   | Draft  | Backend  | 2026-07-14 |
| RB-008       | Runbook      | API Contract Rollback                      | 0.2.0   | Draft  | Backend  | 2026-07-14 |
| ARCH-022     | Architecture | System Overview — Turborepo                | 1.5.0   | Target | Platform | 2026-07-14 |
| ARCH-023     | Architecture | Multi-Tenancy and Platform RBAC            | 3.1.0   | Living | Platform | 2026-07-14 |
| ARCH-024     | Architecture | Package Boundaries                         | 1.2.0   | Target | Platform | 2026-07-14 |
| ARCH-025     | Architecture | Data Layer                                 | 1.2.0   | Target | Backend  | 2026-07-14 |
| ARCH-026     | Architecture | Authentication and Session Model           | 1.2.0   | Target | Platform | 2026-07-14 |
| ARCH-027     | Architecture | Environment Variable Model                 | 1.3.0   | Target | Platform | 2026-07-14 |
| ARCH-028     | Architecture | Turborepo Implementation Slices            | 1.3.0   | Target | Platform | 2026-07-14 |
| ARCH-001     | Architecture | Backend Architecture                       | 1.0.1   | Living | Backend  | 2026-07-14 |
| ARCH-002     | Architecture | Frontend Architecture                      | 1.0.1   | Living | Frontend | 2026-07-14 |
| ARCH-003     | Architecture | Multi-tenant Ecosystem                     | 2.1.1   | Superseded | Platform | 2026-07-14 |
| ARCH-004     | Architecture | Backend Layers                             | 1.0.1   | Living | Backend  | 2026-07-14 |
| ARCH-005     | Architecture | Backend Folder Map                         | 1.0.1   | Living | Backend  | 2026-07-14 |
| ARCH-006     | Architecture | Bounded Contexts                           | 1.0.1   | Living | Backend  | 2026-07-14 |
| ARCH-007     | Architecture | Ports and Adapters                         | 1.0.1   | Living | Backend  | 2026-07-14 |
| ARCH-008     | Architecture | Next.js Adapter Map                        | 1.0.1   | Living | Backend  | 2026-07-14 |
| ARCH-009     | Architecture | Modules Ownership Map                      | 1.0.1   | Living | Backend  | 2026-07-14 |
| ARCH-010     | Architecture | Backend Conventions                        | 1.0.1   | Living | Backend  | 2026-07-14 |
| ARCH-012     | Architecture | App Router Routes                          | 1.0.1   | Living | Frontend | 2026-07-14 |
| ARCH-013     | Architecture | BFF and Data Flow                          | 1.0.1   | Living | Frontend | 2026-07-14 |
| ARCH-014     | Architecture | UI Surfaces                                | 1.0.1   | Living | Frontend | 2026-07-14 |
| ARCH-015     | Architecture | AdminCN Alignment                          | 1.0.1   | Living | Frontend | 2026-07-14 |
| ARCH-016     | Architecture | Next.js Conventions                        | 1.0.1   | Living | Frontend | 2026-07-14 |
| ARCH-017     | Architecture | Frontend Folder Map                        | 1.1.2   | Living | Frontend | 2026-07-14 |
| ARCH-018     | Architecture | AdminCN Customization                      | 1.0.1   | Living | Frontend | 2026-07-14 |
| ARCH-019     | Architecture | AdminCN Frontend Preflight                 | 1.0.1   | Living | Frontend | 2026-07-14 |
| ARCH-020     | Architecture | Closed Scope Register                      | 2.0.1   | Superseded | Platform | 2026-07-14 |
| ARCH-021     | Architecture | Repository Migration Map                   | 2.0.1   | Superseded | Platform | 2026-07-14 |
| FFT-MOD-001  | Module       | Module Architecture                        | 2.3.0 | Living | Feed Farm Trade | 2026-07-14 |
| FFT-MOD-002  | Module       | Domain and Ownership                       | 1.3.0 | Living | Feed Farm Trade | 2026-07-14 |
| FFT-MOD-003  | Module       | Tech Stack                                 | 1.3.0 | Living | Feed Farm Trade | 2026-07-14 |
| FFT-MOD-004  | Module       | Data Model                                 | 1.3.0 | Living | Feed Farm Trade | 2026-07-14 |
| FFT-MOD-005  | Module       | Auth, Tenancy and RBAC                     | 1.3.0 | Living | Feed Farm Trade | 2026-07-14 |
| FFT-MOD-006  | Module       | Surfaces and Routes                        | 1.3.0 | Living | Feed Farm Trade | 2026-07-14 |
| FFT-MOD-007  | Module       | API and Adapters                           | 1.3.0 | Living | Feed Farm Trade | 2026-07-14 |
| FFT-MOD-008  | Module       | Ops Runtime                                | 1.3.0 | Living | Feed Farm Trade | 2026-07-14 |
| FFT-MOD-009  | Module       | Verification                               | 2.0.0 | Living | Feed Farm Trade | 2026-07-14 |
| FFT-MOD-010  | Module       | Module Docs Index + Roadmap                | 2.4.0 | Living | Feed Farm Trade | 2026-07-14 |
| GUIDE-001    | Guide        | Engineering Docs Entry                     | 1.2.0   | Retired | Platform | 2026-07-14 |
| GUIDE-002    | Guide        | Coding Engineering Guide                   | 1.2.0   | Retired | Platform | 2026-07-14 |
| GUIDE-003    | Guide        | Engineering Documentation Workflow         | 1.3.0   | Retired | Platform | 2026-07-14 |
| GUIDE-004    | Guide        | Engineering Drift Register                 | 1.4.0   | Retired | Platform | 2026-07-14 |
| GUIDE-006    | Guide        | Guides Index                               | 1.8.0   | Retired | Platform | 2026-07-14 |
| MOD-002      | Module       | Modules Index                              | 4.0.0 | Living | Platform | 2026-07-14 |
| RB-001       | Runbook      | Multi-org Ops                              | 1.0.1   | Living | Platform | 2026-07-14 |
| RB-005       | Runbook      | Post-lock Coding Cheat Sheet               | 1.0.1   | Living | Platform | 2026-07-14 |

---

# 4. References

| ID      | Title                          | Relationship                                      |
| ------- | ------------------------------ | ------------------------------------------------- |
| DOC-001 | Documentation Control Standard | Governs this register                             |
| DOC-003 | Documentation Structure Standard | Header and section shape                        |
---

# 5. Change Log

| Version | Date       | Summary                                                                                                                                         |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.36.0 | 2026-07-14 | ARCH-023 → 3.1.0 DOC-003 six-section retrofit (Decision lock content unchanged); cleared system-pack STRUCTURE-DRIFT residual. |
| 4.35.0 | 2026-07-14 | System-pack integrity remediation: ARCH-022→1.5.0; ARCH-024…026→1.2.0; ARCH-027→1.3.0; ARCH-028→1.3.0; ARCH-023 structure grandfather retained (DOC-001 §3.8 Review needed until material revision). |
| 4.34.0 | 2026-07-14 | Registered Living ARCH-031 Technology Stack Catalogue as the derived stack-discovery authority. |
| 4.33.0 | 2026-07-14 | Synchronized MOD-002 4.0.0 and FFT-MOD-001…010 executable Core/ERP quality-contract retrofit. |
| 4.32.0  | 2026-07-14 | Evidence reconstruction: FFT-MOD-009 → 1.3.0 / FFT-MOD-010 → 2.3.0; Core rows BLOCKED at HEAD `764287d` (product tree absent); claim remains Not claimable. |
| 4.31.0  | 2026-07-14 | Bounded reopen: confirmed FFT-MOD-001 (2.2.0) / FFT-MOD-002…005 (1.2.0) / GUIDE-016 (0.2.0 Retired) already matched headers; recorded `docs/guides/archive` integrity baseline **29 known findings** (5 VERSION-DRIFT + 24 REFERENCE-BROKEN on GUIDE-001…004/006 — leave untouched; DOC-001 §3.7 Control State exemption). Wave 3 skill rename closed (`doc-control` / `doc-integrity`). |
| 4.30.0  | 2026-07-14 | Wave D: Retired GUIDE-016 → `docs/guides/archive/` (0.2.0); active authority MOD-002 + FFT-MOD-001…010; ID non-recyclable. |
| 4.29.0  | 2026-07-14 | Wave C: FFT-MOD-001…008 enterprise requirements (single-owner ACs); versions 001→2.2.0, 002…008→1.2.0. |
| 4.28.0  | 2026-07-14 | Wave B: FFT-MOD-009 1.2.0 structured evidence ledger; FFT-MOD-010 2.2.0 Module Enterprise Readiness Not claimable (inherited PASS vacated). |
| 4.27.0  | 2026-07-14 | Wave A: DOC-001 2.4.0 names MOD-002 as Module category standard; MOD-002 3.0.0 Module Enterprise Readiness (lifecycle ≠ readiness). |
| 4.26.0  | 2026-07-14 | Registered Draft GUIDE-016 Feed Farm Trade Enterprise Acceptance; linked from FFT-MOD-009/010. |
| 4.25.0  | 2026-07-14 | Synced FFT-MOD-001…010 after DOC-003 six-section retrofit and enterprise compact enrich (Living spine). |
| 4.24.0  | 2026-07-14 | Relocated RB-006…008 to `docs/api/runbooks/` (composed Draft 0.2.0); DOC-001 2.3.0 co-location exception; platform RB-001/005 stay in `docs/runbooks/`. |
| 4.23.0  | 2026-07-14 | Moved Retired GUIDE-001…004/006 into docs/guides/archive/ (not Living stubs in guides root). |
| 4.22.0  | 2026-07-14 | Hard-deleted GUIDE-001…004/006 files; IDs stay Retired in register (no stub files — no-stub ban). |
| 4.21.0  | 2026-07-14 | Retired GUIDE-001…004 and GUIDE-006 (duplication with DOC-*/AGENTS/skills); ARCH-028 absorbed Target vs checkout drift. |
| 4.20.0  | 2026-07-14 | Registered ARCH-017 (frontend folder map; renumbered from colliding ARCH-029) and all previously unregistered controlled docs under docs/ (option A). |
| 4.19.0  | 2026-07-14 | Synced Version/Updated for docs/-wide Control State header retrofit (phases A–D); Control State remains header-only. |
| 4.18.0  | 2026-07-14 | Aligned DOC-001 2.2.0 and DOC-003 1.4.0: Control State is a mandatory document header field, still not an eighth register column. |
| 4.17.0  | 2026-07-13 | Aligned DOC-001 2.1.0 and DOC-003 1.3.0 with the explicit Control State model while keeping the register to seven fields. |
| 4.16.0  | 2026-07-13 | Aligned DOC-001 2.0.0 and DOC-003 1.2.0 with the controlled-document close/reopen gate. |
| 4.15.0  | 2026-07-13 | Reconciled the API audit: guide-home exception, active evidence bar, list envelope, OpenAPI provenance, structures, link, title, and recipe ownership. |
| 4.14.1  | 2026-07-13 | ARCH-029 → 1.2.2 (README reading sequence vs GUIDE-015 development order). |
| 4.14.0  | 2026-07-13 | Registered Living GUIDE-015 Interface Pack Development Roadmap (locked by Jack Wee); ARCH-029 → 1.2.1. |
| 4.13.0  | 2026-07-13 | ARCH-029 → 1.2.0 (API pack sync); API-001 → 1.2.1 (parent + public-exception align). |
| 4.12.1  | 2026-07-13 | Aligned ARCH-029 to 1.1.5 (creation sequence Phases 1–5 in Notes; not a Guide). |
| 4.12.0  | 2026-07-13 | Registered Draft GUIDE-014 API Contract Verification Standard; ARCH-030 deferred. |
| 4.11.0  | 2026-07-13 | Registered Draft GUIDE-007…013 under `docs/api/guides/`; OpenAPI recipes → GUIDE-011; OPEN-001 → 1.1.4. |
| 4.10.0  | 2026-07-13 | Registered Draft RB-006…008 (API ops runbooks); reserved RB-009 for webhook replay; aligned ARCH-029 to 1.1.2. |
| 4.9.1   | 2026-07-13 | Aligned ARCH-029 to 1.1.1 (deferred ADR-001…007 candidates; no ADR files). |
| 4.9.0   | 2026-07-13 | Registered Draft REST-002…007, FFT-REST-001, GUIDE-007; bumped REST-001 to 1.2.1 and OPEN-001 to 1.1.3. |
| 4.8.0   | 2026-07-13 | Registered Living ARCH-029; registered Draft placeholders API-005…API-009 (interface optimization backlog).                                     |
| 4.7.0   | 2026-07-13 | Aligned DOC-001 to 1.6.0 and DOC-003 to 1.1.0 (user-approved shared Lite/Elite documentation control).                                           |
| 4.6.0   | 2026-07-13 | Registered DOC-003; aligned DOC-001 to version 1.5.0; corrected lifecycle compatibility for Target architecture documents; standardized titles. |
| 4.5.0   | 2026-07-13 | Removed ADR register rows; retained ARCH-023 as the sole living tenancy and platform-RBAC authority.                                            |
| 4.4.1   | 2026-07-13 | Retargeted documentation after post-commit audit.                                                                                               |
| 4.4.0   | 2026-07-13 | Removed the former `docs/adr/` directory.                                                                                                       |
| 3.0.0   | 2026-07-13 | Reset the register to explicitly agreed controlled documents.                                                                                   |

---

# 6. Notes

`ARCH-023` is the current living source of truth for multi-tenancy and platform RBAC (DOC-003 six-section form from 3.1.0). Decision lock R1–R7 / D4·D5 must not be reopened without separate explicit approval.

`ARCH-029` is the Living parent authority for interface and API architecture. **GUIDE-015** is the locked Phases 1–5 development roadmap (Jack Wee). `API-005`…`API-009`, `REST-002`…`REST-007`, `FFT-REST-001`, `GUIDE-007`…`GUIDE-014`, and `RB-006`…`RB-008` are Draft until expanded / promoted per their owning roadmaps. API guides live under `docs/api/guides/`. API runbooks live under `docs/api/runbooks/`. Non-API guides live under `docs/guides/` when Living. **GUIDE-016** is **Retired** (archived); Module Enterprise Readiness authority is [MOD-002](../modules/MOD-002-modules-index.md) + FFT-MOD-001…010. `ARCH-030` (verification architecture) is deferred while GUIDE-014 remains the API verification Guide.

`FFT-REST-002`…`FFT-REST-007`, `OPEN-002`…`OPEN-005`, `ADR-001`…`ADR-007`, `RB-009` (webhook replay), and `ARCH-030` (verification architecture) are **reserved in planning docs only** — not registered until created under the approved derivation / creation gates.

`ARCH-022` and `ARCH-024` through `ARCH-028` describe approved target-state architecture and remain non-current until implemented or promoted to `Living`.

DOC-001 is the shared Afenda documentation control baseline (Lite beta · Elite battle-proven). This register lists documents for the Lite checkout only.

GUIDE-001…004 and GUIDE-006 are **Retired** and archived under `docs/guides/archive/`. GUIDE-016 is **Retired** and archived under the same folder (migration crosswalk complete). IDs must not be recycled. Engineering entry is `docs/README.md` + DOC-001/003 + AGENTS.md; API how-tos remain under `docs/api/guides/`; Target vs checkout drift lives in ARCH-028. Module Enterprise Readiness is MOD-002 + module spines.

**Known integrity baseline (`docs/guides` full audit):** **29 known findings** on archived GUIDE-001…004/006 only (5 `VERSION-DRIFT` header↔Change-Log + 24 `REFERENCE-BROKEN`). Do **not** treat these as open rename or register debt; do **not** “fix” by editing archived guides unless a material revision is explicitly authorized. Missing **Control State** on those five archives remains permitted under DOC-001 §3.7 until material revision. GUIDE-016 archive header matches this register (`0.2.0` / `Retired`).

Under DOC-001 §3.5.1 / §3.7, every controlled document header shall declare **Control State** (`Open` · `Closed` · `Reopened`) distinct from lifecycle **Status**. Lifecycle Status remains in this seven-field catalogue; Control State is header-only and must not be added as an eighth register column. The documentation validator requires and validates the header field for `docs/_control/**` and for any document that already declares it.

Everything else remains unregistered until its ID is explicitly approved.
