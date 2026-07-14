# GUIDE-015 Interface Pack Development Roadmap

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | GUIDE-015  |
| **Category** | Guide      |
| **Version**  | 1.0.2      |
| **Status**   | Living     |
| **Control State** | Closed     |
| **Owner**    | Platform   |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This document is the **locked development roadmap** for the Afenda interface and API documentation pack.

It records the ordered creation and revision sequence for architecture, contracts, resource catalogues, module REST indexes, operations runbooks, and implementation guides. It does **not** establish interface architecture — that remains [ARCH-029](../../architecture/ARCH-029-interface-api-architecture.md).

## Decision lock

| Field | Value |
| ----- | ----- |
| **Locked by** | Jack Wee (`jackwee@ai-bos.io` / `pohlai88`) |
| **Locked on** | 2026-07-13 |
| **Scope** | Phases 1–5 below; registered document IDs named in this roadmap |
| **Rule** | Do **not** reorder phases, skip Phase 1 refine, invent parallel SSOTs, or promote Draft placeholders to Living without completing prior-phase substance — unless Jack Wee explicitly reopens this lock |

Agents and maintainers shall treat this roadmap as binding program order for the interface pack.

---

# 2. Scope

## 2.1 In Scope

- Ordered phases for creating or revising interface-pack documents;
- Mapping each roadmap item to its registered ID and path;
- Lock / reopen rules for this program.

## 2.2 Out of Scope

- Architectural principles (ARCH-029);
- Executable contract rules (API-* / REST-* / OPEN-*);
- FFT product feature gates beyond “derive FFT-REST children when gates open”;
- General product roadmap outside the interface documentation pack.

---

# 3. Development Roadmap

Placeholders may already exist as Draft. **Create or revise** means promote substance and authority in phase order — not invent a second catalogue.

## Phase 1 — Governance alignment

Create or revise **first**:

| ID | Document | Path / note |
| -- | -------- | ----------- |
| ARCH-029 | Interface and API Architecture | `docs/architecture/ARCH-029-interface-api-architecture.md` |
| API-001 | Adapter Boundaries and Security Pipeline | `docs/api/API-001-api-boundaries.md` |
| API-002 | Error Contract | `docs/api/API-002-error-contract.md` |
| API-003 | API Types | `docs/api/API-003-api-types.md` |
| API-004 | Schema Ownership Map | `docs/api/API-004-schema-map.md` |
| REST-001 | REST Standards and Resource Index | `docs/api/REST-001-rest-resources.md` (evolve toward standards + index) |
| OPEN-001 | OpenAPI Governance | `docs/api/OPEN-001-openapi.md` |
| — | Reduce `docs/api/README.md` to navigation | Navigation only; no architecture SSOT |

**Exit criteria:** Living Phase 1 docs agree with ARCH-029; README is navigation-only; no contradictory public-exception or envelope rules.

## Phase 2 — Missing cross-cutting contracts

Create / expand **next**:

| ID | Document |
| -- | -------- |
| API-005 | Authentication and Authorization Contract |
| API-006 | Idempotency and Concurrency Contract |
| API-007 | API Observability and Correlation Contract |
| API-008 | Collection Query Contract |
| API-009 | Compatibility and Deprecation Contract |

**Exit criteria:** Each is Living (or Accepted) with substance sufficient that API-001 does not remain the sole authn/authz/idempotency/observability/query/compatibility authority.

## Phase 3 — Resource family documents

Create / expand **as implementation demand appears**:

| ID | Document |
| -- | -------- |
| REST-002 | Identity and Organization Resources |
| REST-003 | Client Resources |
| REST-004 | Declaration Resources |
| REST-005 | Assignment and Submission Resources |
| REST-006 | Public Survey and Secure-Link Resources |

`REST-007` Account Resources remains gated until portal-owned account fields exist (not a Phase 3 unlock by default).

**Exit criteria:** REST-001 holds standards + index; domain rows live in the owning REST-00N catalogue.

## Phase 4 — Module APIs

| ID | Document | Rule |
| -- | -------- | ---- |
| FFT-REST-001 | Feed Farm Trade Resource Index | Create / expand the index first |
| FFT-REST-002…007 | Detailed FFT resource documents | Derive **only** when the corresponding program gates open |

**Exit criteria:** FFT is not an indefinite appendix inside REST-001; children appear only under gate approval.

## Phase 5 — Operations and implementation guides

Create / expand:

| Need | Registered ID | Path |
| ---- | ------------- | ---- |
| OpenAPI generation guide | GUIDE-011 | `docs/api/guides/GUIDE-011-generating-and-validating-openapi.md` |
| API testing guide | GUIDE-012 | `docs/api/guides/GUIDE-012-testing-api-contracts.md` |
| Verification standard (evidence bar) | GUIDE-014 | `docs/api/guides/GUIDE-014-api-contract-verification-standard.md` |
| Incident runbook | RB-007 | `docs/api/runbooks/RB-007-api-incident-response.md` |
| Rollback runbook | RB-008 | `docs/api/runbooks/RB-008-api-contract-rollback.md` |
| API security review checklist | GUIDE-013 | `docs/api/guides/GUIDE-013-api-security-review-checklist.md` |

Also in this phase when needed: RB-006 (OpenAPI drift — `docs/api/runbooks/RB-006-openapi-drift-detection-recovery.md`), GUIDE-007…010 (Action / RH / REST / Zod how-tos). `RB-009` webhook replay only when webhooks exist (create under `docs/api/runbooks/`).

**Exit criteria:** Ops and how-to guides are Living enough to support Phase 1–2 contracts without embedding recipes in OPEN-001 or ARCH-029.

---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-002 | Documentation Register | Catalogue of IDs |
| ARCH-029 | Interface and API Architecture | Parent architecture (not replaced by this roadmap) |
| GUIDE-006 | Guides Index | **Retired** — use docs/guides/README.md + docs/api/guides |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.0.2 | 2026-07-14 | Phase 5 paths for RB-006…008 → `docs/api/runbooks/` (API pack standalone). |
| 1.0.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 1.0.0 | 2026-07-13 | Living roadmap locked by Jack Wee — Phases 1–5 for the interface documentation pack. |

---

# 6. Notes

Reopen or amend this lock only with explicit approval from **Jack Wee**. Editorial path fixes that do not change phase order do not require a lock reopen; phase reorder, skip, or parallel SSOT does.
