# API-008 Collection Query Contract

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | API-008    |
| **Category** | API        |
| **Version**  | 0.1.2      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Backend    |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This document will define one reusable standard for list and collection resources so pagination, filtering, and sorting are not redefined per REST family.

**Placeholder.** Substantive rules are not yet authoritative. Parent: [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md) §3.5 / §3.7. Aligns with types in [API-003](API-003-api-types.md) once refined.

---

# 2. Scope

## 2.1 In Scope

Planned coverage:

- page and page size;
- maximum page size;
- sorting;
- filtering;
- search;
- date ranges;
- response metadata;
- empty results;
- stable ordering;
- future cursor migration rules.

## 2.2 Out of Scope

- Resource-specific filter field catalogues (REST-001 / module schemas);
- GraphQL-style connection models;
- Full-text search engine selection.

---

# 3. Collection Query Contract

> **Status:** Placeholder — expand to Living so list resources share one query contract.

| Topic                | Planned authority                                              |
| -------------------- | -------------------------------------------------------------- |
| Page / pageSize      | Query params, defaults, maxima                                 |
| Sorting              | Allowed fields, direction, multi-sort rules                    |
| Filtering / search   | Operator vocabulary; reserved query keys                       |
| Date ranges          | Inclusive/exclusive bounds; timezone                           |
| Response metadata    | `{ data: { items, pagination } }` per API-001 and API-003      |
| Empty results        | HTTP 200 with empty `items` vs 404 rules                       |
| Stable ordering      | Tie-breaker fields                                             |
| Cursor migration     | Forward-compatible rules when offset pages become cursors      |

Recommended list payload shape remains under [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md) until this contract absorbs and freezes it.

---

# 4. References

| ID       | Title                          | Relationship                         |
| -------- | ------------------------------ | ------------------------------------ |
| DOC-001  | Documentation Control Standard | Governance                           |
| ARCH-029 | Interface and API Architecture | Parent architecture                  |
| API-003  | API Types                      | Shared pagination / result types     |
| REST-001 | REST Resources                 | Per-resource filter columns          |
| OPEN-001 | OpenAPI                        | Machine representation of list ops   |

---

# 5. Change Log

| Version | Date       | Summary                                      |
| ------- | ---------- | -------------------------------------------- |
| 0.1.2 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.1   | 2026-07-13 | Clarified the inherited list response envelope. |
| 0.1.0   | 2026-07-13 | Draft placeholder registered (ARCH-029 gap). |

---

# 6. Notes

**Priority:** High.

Why separate: pagination and filtering must not be repeatedly redefined inside every REST resource family.
