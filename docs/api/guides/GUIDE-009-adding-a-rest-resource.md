# GUIDE-009 Adding a REST Resource

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | GUIDE-009  |
| **Category** | Guide      |
| **Version**  | 0.1.1      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Backend    |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This guide will explain **how to add** a REST resource row (and handler when api-now) without turning guides into architecture. Standards live in [REST-001](../REST-001-rest-resources.md) and [ARCH-029](../../architecture/ARCH-029-interface-api-architecture.md).

**Placeholder.**

---

# 2. Scope

## 2.1 In Scope

- Choosing the owning REST child doc (REST-002…007 or FFT-REST-*);
- Setting `api-now` vs `contract-only`;
- Method, path, auth, cache columns;
- Linking Zod schemas and OpenAPI regenerate.

## 2.2 Out of Scope

- Inventing parallel URL versions;
- Scaffolding contract-only as live handlers.

---

# 3. Implementation Guide

> **Status:** Placeholder.

| Step | Planned content | Governing doc |
| ---- | --------------- | ------------- |
| Pick catalogue | REST-002…007 or FFT-REST-001+ | REST-001 tree |
| Status | api-now vs contract-only | REST-001 · ARCH-029 |
| Shape | Plural nouns, methods, filters | REST-001 · API-008 |
| Schema | Owning Zod export | API-004 · GUIDE-010 |
| Implement | Only if api-now | GUIDE-008 |
| Compatibility | Additive vs breaking | API-009 (Draft) |

---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| ARCH-029 | Interface and API Architecture | Parent architecture |
| REST-001 | REST Standards and Resource Index | Standards + index |
| API-004 | Schema Map | Schema ownership |
| API-009 | Compatibility and Deprecation Contract | Change rules (Draft) |
| GUIDE-008 | Implementing a Route Handler | Handler recipe |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 0.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.0 | 2026-07-13 | Draft placeholder under `docs/api/guides/`. |

---

# 6. Notes

None.
