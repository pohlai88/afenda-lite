# GUIDE-010 Adding a Zod Contract

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | GUIDE-010  |
| **Category** | Guide      |
| **Version**  | 0.1.1      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Backend    |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This guide will explain **how to add** a Zod schema as the executable interface contract. Authority: [API-004](../API-004-schema-map.md), [API-003](../API-003-api-types.md), [ARCH-029](../../architecture/ARCH-029-interface-api-architecture.md).

**Placeholder.**

---

# 2. Scope

## 2.1 In Scope

- Module ownership and export map updates;
- Input vs wire vs domain types;
- Brands after validation;
- Sharing schemas with Actions and Route Handlers;
- Avoiding hand-written parallel interfaces.

## 2.2 Out of Scope

- OpenAPI generator internals ([GUIDE-011](GUIDE-011-generating-and-validating-openapi.md));
- Business rule implementation in domain.

---

# 3. Implementation Guide

> **Status:** Placeholder.

| Step | Planned content | Governing doc |
| ---- | --------------- | ------------- |
| Own module | Place under `modules/*/schemas` | API-004 |
| Infer types | Prefer Zod inference | API-003 · ARCH-029 |
| Brands | After parse / trusted lookup | API-003 |
| Wire dates | ISO strings | ARCH-029 · API-003 |
| Map row | Update API-004 catalogue | API-004 |
| Consumers | Action / RH import same schema | API-001 |

---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| ARCH-029 | Interface and API Architecture | Parent architecture |
| API-003 | API Types | Serialization / brands |
| API-004 | Schema Map | Ownership map |
| API-001 | API Boundaries | Boundary parse |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 0.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.0 | 2026-07-13 | Draft placeholder under `docs/api/guides/`. |

---

# 6. Notes

None.
