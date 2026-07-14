# API-009 Compatibility and Deprecation Contract

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | API-009    |
| **Category** | API        |
| **Version**  | 0.1.1      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Backend    |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This document will translate [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md) compatibility principles into executable contract rules for additive vs breaking change, deprecation, and release evidence.

**Placeholder.** Substantive rules are not yet authoritative.

---

# 2. Scope

## 2.1 In Scope

Planned coverage:

- additive versus breaking change;
- field removal;
- enum changes;
- endpoint retirement;
- deprecation metadata;
- consumer notification;
- migration periods;
- OpenAPI deprecation markers;
- release evidence.

## 2.2 Out of Scope

- Product roadmap sequencing;
- Marketing release notes;
- Parallel URL versioning (`/api/v1`, `/api/v2`) unless a future architecture decision approves it.

---

# 3. Compatibility and Deprecation Contract

> **Status:** Placeholder — expand to Living before external consumers.

| Topic                      | Planned authority                                           |
| -------------------------- | ----------------------------------------------------------- |
| Additive changes           | Optional fields, new endpoints, safe detail fields          |
| Breaking changes           | Removals, type changes, auth changes, path/method changes   |
| Enum evolution             | Unknown-value consumers; removal rules                      |
| Endpoint retirement        | `deprecated` → `retired` lifecycle                          |
| Deprecation metadata       | Replacement, dates, consumers, migration instructions       |
| OpenAPI markers            | `deprecated: true` and document cross-links                 |
| Release evidence           | Impact analysis, regeneration, tests, approval gate         |

One active HTTP contract version remains the default ([ARCH-029](../architecture/ARCH-029-interface-api-architecture.md) §3.1.6).

---

# 4. References

| ID       | Title                          | Relationship                    |
| -------- | ------------------------------ | ------------------------------- |
| DOC-001  | Documentation Control Standard | Governance                      |
| ARCH-029 | Interface and API Architecture | Parent architecture             |
| REST-001 | REST Resources                 | Resource status columns         |
| OPEN-001 | OpenAPI                        | Machine deprecation markers     |
| API-001  | API Boundaries                 | Adapter / envelope stability    |
| API-002  | Error Contract                 | Error-code meaning stability    |

---

# 5. Change Log

| Version | Date       | Summary                                      |
| ------- | ---------- | -------------------------------------------- |
| 0.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.0   | 2026-07-13 | Draft placeholder registered (ARCH-029 gap). |

---

# 6. Notes

**Priority:** High before external consumers.
