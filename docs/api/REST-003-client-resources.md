# REST-003 Client Resources

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | REST-003   |
| **Category** | REST       |
| **Version**  | 0.1.1      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Backend    |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This document will catalogue Client HTTP resources for the Declarations / Client domain, keeping [REST-001](REST-001-rest-resources.md) as the standard and index only.

**Placeholder.** Not enforcement SSOT.

---

# 2. Scope

## 2.1 In Scope

Planned coverage:

- client list;
- client detail;
- client invitation;
- registration removal;
- onboarding status;
- allowed filters.

## 2.2 Out of Scope

- Declaration CRUD ([REST-004](REST-004-declaration-resources.md));
- Assignment / submission ([REST-005](REST-005-assignment-submission-resources.md));
- Public survey / secure-link ([REST-006](REST-006-public-survey-secure-link-resources.md)).

---

# 3. Client Resources

> **Status:** Placeholder.

| Resource family     | Planned entries                         | Status target |
| ------------------- | --------------------------------------- | ------------- |
| Clients             | list, detail                            | Draft         |
| Client invitations  | create / resend                         | Draft         |
| Registration        | removal                                 | Draft         |
| Onboarding          | status                                  | Draft         |
| Collection query    | allowed filters → [API-008](API-008-collection-query-contract.md) | Draft |

---

# 4. References

| ID       | Title                          | Relationship        |
| -------- | ------------------------------ | ------------------- |
| DOC-001  | Documentation Control Standard | Governance          |
| ARCH-029 | Interface and API Architecture | Parent architecture |
| REST-001 | REST Standards and Resource Index | Parent index     |
| API-008  | Collection Query Contract      | List filters (Draft)|

---

# 5. Change Log

| Version | Date       | Summary                                     |
| ------- | ---------- | ------------------------------------------- |
| 0.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.0   | 2026-07-13 | Draft placeholder for REST catalogue split. |

---

# 6. Notes

**Owner:** Declarations or Client domain. **Priority:** Medium.
