# REST-007 Account Resources

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | REST-007   |
| **Category** | REST       |
| **Version**  | 0.1.1      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Platform   |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This document will catalogue Account HTTP resources for current-account profile fields owned by the portal versus the identity provider.

**Placeholder.** Expand only when portal-owned account fields exist. Not enforcement SSOT.

---

# 2. Scope

## 2.1 In Scope

Planned coverage (when portal-owned fields exist):

- current account profile;
- portal-owned fields;
- provider-owned fields;
- editable versus read-only attributes;
- account update schema;
- security boundaries.

## 2.2 Out of Scope

- Organization user admin ([REST-002](REST-002-identity-organization-resources.md));
- Neon Auth UI-only flows with no portal-owned fields.

---

# 3. Account Resources

> **Status:** Placeholder — creation gate: portal-owned account fields must exist before Living promotion.

| Resource family | Planned entries                         | Status target |
| --------------- | --------------------------------------- | ------------- |
| Current account | get profile                             | Conditional   |
| Account update  | patch portal-owned fields only          | Conditional   |
| Field matrix    | portal-owned vs provider-owned          | Conditional   |

---

# 4. References

| ID       | Title                          | Relationship        |
| -------- | ------------------------------ | ------------------- |
| DOC-001  | Documentation Control Standard | Governance          |
| ARCH-029 | Interface and API Architecture | Parent architecture |
| REST-001 | REST Standards and Resource Index | Parent index     |
| REST-002 | Identity and Organization Resources | Sibling org IAM |
| ARCH-026 | Authentication and Session Model | Session / account |

---

# 5. Change Log

| Version | Date       | Summary                                     |
| ------- | ---------- | ------------------------------------------- |
| 0.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.0   | 2026-07-13 | Draft placeholder for REST catalogue split. |

---

# 6. Notes

**Priority:** Create only when portal-owned account fields exist. Keep Draft until that gate opens.
