# GUIDE-014 API Contract Verification Standard

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | GUIDE-014  |
| **Category** | Guide      |
| **Version**  | 0.1.1      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Backend    |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This guide is the **verification authority** for the Afenda interface contract pack. It defines what must be proven before treating an API / Action / OpenAPI change as ready — without establishing architecture (that remains [ARCH-029](../../architecture/ARCH-029-interface-api-architecture.md)).

**Placeholder.** Prefer this Guide over a separate ARCH-030 until verification practice is stable enough to promote architecture assurance.

Related how-to: [GUIDE-012 Testing API Contracts](GUIDE-012-testing-api-contracts.md) (test recipes). This document owns the **standard and evidence bar**.

---

# 2. Scope

## 2.1 In Scope

Verification coverage:

- schema tests;
- authorization matrix tests;
- route integration tests;
- Server Action tests;
- OpenAPI snapshot or compatibility tests;
- error contract tests;
- idempotency tests;
- contract-only protection tests;
- lint gates;
- release evidence.

## 2.2 Out of Scope

- Product journey E2E ownership beyond contract surfaces;
- Performance / load baselines (unless later promoted);
- Creating ARCH-030 while this Guide remains Draft (deferred).

---

# 3. API Contract Verification Standard

> **Status:** Placeholder — expand each row into required commands, fixtures, and pass criteria.

| Area | Planned requirement | Governing docs |
| ---- | ------------------- | -------------- |
| Schema tests | Canonical Zod accepts/rejects fixtures; brands only after parse | API-004 · API-003 · GUIDE-010 |
| Authorization matrix | Capability × org scope × resource ownership cases | API-005 · ARCH-023 · GUIDE-013 |
| Route integration | api-now handlers: method, status, `{ data }` / bare error | API-001 · API-002 · REST-001 · GUIDE-008 |
| Server Action tests | `ActionResult` branches; no layout-only auth | API-001 · API-002 · GUIDE-007 |
| OpenAPI snapshot / compatibility | Generate + Spectral; no silent additive-break; contract-only not live | OPEN-001 · GUIDE-011 · API-009 |
| Error contract tests | Shared vocabulary only; no alternate shapes | API-002 |
| Idempotency tests | Duplicate / conflict behavior for high-risk commands | API-006 · ARCH-029 §3.10 |
| Contract-only protection | No Route Handler scaffold for `contract-only` rows | REST-001 · ARCH-029 §3.14 |
| Lint gates | OpenAPI / contract lint non-zero = stop | OPEN-001 · RB-006 |
| Release evidence | Checklist mapped to ARCH-029 change gate | ARCH-029 §3.14 · RB-008 |

### Evidence bar (planned)

A change is verification-complete only when applicable rows above have recorded evidence (test IDs, CI job names, or checklist sign-off). `contract-only` entries do not pass the implementation gate.

---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| ARCH-029 | Interface and API Architecture | Parent architecture + change gate |
| GUIDE-012 | Testing API Contracts | How-to recipes (sibling) |
| GUIDE-013 | API Security Review Checklist | Security review subset |
| API-001 | API Boundaries | Adapter rules |
| API-002 | Error Contract | Failure vocabulary |
| OPEN-001 | OpenAPI | Machine contract |
| RB-006 | OpenAPI Drift Detection and Recovery | Ops when lint/spec fails |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 0.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.0 | 2026-07-13 | Draft placeholder; Guide preferred over ARCH-030 initially. |

---

# 6. Notes

**ARCH-030** (API Verification Architecture) remains a deferred candidate. Promote only if verification needs cross-cutting architecture authority beyond this Guide.

Do not treat this Draft as Living release blocker until expanded and promoted.
