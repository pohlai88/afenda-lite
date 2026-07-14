# GUIDE-012 Testing API Contracts

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | GUIDE-012  |
| **Category** | Guide      |
| **Version**  | 0.1.2      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Backend    |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This guide will explain **how to test** API contracts (Zod, Actions, Route Handlers, OpenAPI alignment) without redefining architecture. Parent: [ARCH-029](../../architecture/ARCH-029-interface-api-architecture.md).

**Placeholder.**

---

# 2. Scope

## 2.1 In Scope

- Schema unit tests;
- Action / handler contract tests;
- Error vocabulary assertions;
- OpenAPI lint / generate checks;
- Golden fixtures for success and error envelopes.

## 2.2 Out of Scope

- Full E2E product journeys (`testing/README.md` when present);
- Load / chaos testing strategy.

---

# 3. Implementation Guide

> **Status:** Placeholder.

| Layer | Planned checks | Governing doc |
| ----- | -------------- | ------------- |
| Zod | Accept / reject fixtures | API-004 · GUIDE-010 |
| Action | `ActionResult` branches | API-001 · API-002 |
| Route Handler | `{ data }` + bare errors | API-001 · API-002 |
| Authz | Forbidden / unauthorized | API-005 (Draft) |
| OpenAPI | Generate + Spectral | GUIDE-011 · OPEN-001 |
| Idempotency | Duplicate / conflict | API-006 (Draft) |

---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| ARCH-029 | Interface and API Architecture | Parent architecture |
| GUIDE-014 | API Contract Verification Standard | Verification authority / evidence bar (Draft) |
| API-001 | API Boundaries | Adapter rules |
| API-002 | Error Contract | Failure assertions |
| OPEN-001 | OpenAPI | Machine contract |
| GUIDE-011 | Generating and Validating OpenAPI | Generate / lint |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 0.1.2 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.1 | 2026-07-13 | Removed a premature link to the not-yet-present testing index. |
| 0.1.0 | 2026-07-13 | Draft placeholder under `docs/api/guides/`. |

---

# 6. Notes

None.
