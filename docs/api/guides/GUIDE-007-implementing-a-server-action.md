# GUIDE-007 Implementing a Server Action

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | GUIDE-007  |
| **Category** | Guide      |
| **Version**  | 0.1.1      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Backend    |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This guide will explain **how to implement** a same-origin Server Action. It does not establish architecture — follow [ARCH-029](../../architecture/ARCH-029-interface-api-architecture.md) and [API-001](../API-001-api-boundaries.md).

**Placeholder.**

---

# 2. Scope

## 2.1 In Scope

- Choosing Server Action vs Route Handler;
- Zod parse at the boundary;
- Authn/authz inside the action;
- Returning `ActionResult<T>`;
- Revalidation and safe errors.

## 2.2 Out of Scope

- Architecture decisions (ARCH-029 / ADRs);
- HTTP Route Handler recipes ([GUIDE-008](GUIDE-008-implementing-a-route-handler.md));
- OpenAPI generation ([GUIDE-011](GUIDE-011-generating-and-validating-openapi.md)).

---

# 3. Implementation Guide

> **Status:** Placeholder — expand with step-by-step checklist and examples.

| Step | Planned content | Governing doc |
| ---- | --------------- | ------------- |
| Confirm adapter | Same-origin UI mutation only | ARCH-029 · API-001 |
| Define Zod input | Owning module schema | API-004 · GUIDE-010 |
| Auth pipeline | Session, org, capability, ownership | API-005 (Draft) · API-001 |
| Invoke domain | Trusted types only | API-001 |
| Map result | `ActionResult<T>` / API-002 codes | API-002 · API-003 |
| Revalidate | Path/tag as needed | ARCH-029 |

---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| ARCH-029 | Interface and API Architecture | Parent architecture |
| API-001 | API Boundaries | Adapter pipeline |
| API-002 | Error Contract | Failure shapes |
| API-003 | API Types | `ActionResult` |
| API-005 | Authentication and Authorization Contract | Authn/authz (Draft) |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 0.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.0 | 2026-07-13 | Draft placeholder under `docs/api/guides/`. |

---

# 6. Notes

Former phase-task content that once used GUIDE-007 stays retired. This ID is the Server Action implementation guide.
