# REST-004 Declaration Resources

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | REST-004   |
| **Category** | REST       |
| **Version**  | 0.1.1      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Backend    |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This document will catalogue Declaration HTTP resources owned by the Declarations module.

**Placeholder.** Not enforcement SSOT.

---

# 2. Scope

## 2.1 In Scope

Planned coverage:

- declaration create;
- read;
- update;
- delete;
- metadata;
- question configuration;
- evidence registration;
- operator permissions.

## 2.2 Out of Scope

- Assignment / draft / submit flows ([REST-005](REST-005-assignment-submission-resources.md));
- Client directory ([REST-003](REST-003-client-resources.md)).

---

# 3. Declaration Resources

> **Status:** Placeholder.

| Resource family          | Planned entries                | Status target |
| ------------------------ | ------------------------------ | ------------- |
| Declarations             | create, read, update, delete   | Draft         |
| Metadata                 | declaration metadata           | Draft         |
| Question configuration   | operator-facing config         | Draft         |
| Evidence registration    | evidence attach / register     | Draft         |
| Operator permissions     | auth labels per row            | Draft         |

---

# 4. References

| ID       | Title                          | Relationship        |
| -------- | ------------------------------ | ------------------- |
| DOC-001  | Documentation Control Standard | Governance          |
| ARCH-029 | Interface and API Architecture | Parent architecture |
| REST-001 | REST Standards and Resource Index | Parent index     |
| API-005  | Authentication and Authorization Contract | Authz (Draft) |

---

# 5. Change Log

| Version | Date       | Summary                                     |
| ------- | ---------- | ------------------------------------------- |
| 0.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.0   | 2026-07-13 | Draft placeholder for REST catalogue split. |

---

# 6. Notes

**Owner:** Declarations module. **Priority:** High.
