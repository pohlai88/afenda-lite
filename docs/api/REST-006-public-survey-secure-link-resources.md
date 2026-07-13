# REST-006 Public Survey and Secure-Link Resources

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | REST-006   |
| **Category** | REST       |
| **Version**  | 0.1.1      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Backend    |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This document will catalogue public survey and secure-link HTTP resources that cross a public trust boundary.

**Placeholder.** Not enforcement SSOT. Must align with [API-005](API-005-authentication-authorization-contract.md) public exceptions.

---

# 2. Scope

## 2.1 In Scope

Planned coverage:

- public survey by slug;
- secure token access;
- token expiry;
- public submission;
- abuse protection;
- response privacy;
- rate-limit expectations.

## 2.2 Out of Scope

- Authenticated operator declaration admin ([REST-004](REST-004-declaration-resources.md));
- Authenticated client assignment flows ([REST-005](REST-005-assignment-submission-resources.md)).

---

# 3. Public Survey and Secure-Link Resources

> **Status:** Placeholder — High priority because it crosses a public trust boundary.

| Resource family   | Planned entries                      | Status target |
| ----------------- | ------------------------------------ | ------------- |
| Public survey     | get by slug                          | Draft         |
| Secure link       | token access, expiry                 | Draft         |
| Public submission | submit under token scope             | Draft         |
| Abuse controls    | rate limit, bot/abuse expectations   | Draft         |
| Privacy           | response privacy rules               | Draft         |

---

# 4. References

| ID       | Title                          | Relationship              |
| -------- | ------------------------------ | ------------------------- |
| DOC-001  | Documentation Control Standard | Governance                |
| ARCH-029 | Interface and API Architecture | Parent architecture       |
| REST-001 | REST Standards and Resource Index | Parent index           |
| API-005  | Authentication and Authorization Contract | Public exceptions |
| API-007  | API Observability and Correlation Contract | Safe logging      |

---

# 5. Change Log

| Version | Date       | Summary                                     |
| ------- | ---------- | ------------------------------------------- |
| 0.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.0   | 2026-07-13 | Draft placeholder for REST catalogue split. |

---

# 6. Notes

**Priority:** High (public trust boundary).
