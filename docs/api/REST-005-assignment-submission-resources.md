# REST-005 Assignment and Submission Resources

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | REST-005   |
| **Category** | REST       |
| **Version**  | 0.1.1      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Backend    |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This document will catalogue Assignment and Submission HTTP resources for the Declarations module, including draft, submit, lock, and resubmit policy.

**Placeholder.** Not enforcement SSOT. Cross-links [API-006](API-006-idempotency-concurrency-contract.md) for idempotency.

---

# 2. Scope

## 2.1 In Scope

Planned coverage:

- assignment detail;
- draft;
- submit;
- lock;
- resubmit policy;
- ownership;
- idempotency;
- submission status.

## 2.2 Out of Scope

- Declaration definition CRUD ([REST-004](REST-004-declaration-resources.md));
- Public survey / secure-link submission ([REST-006](REST-006-public-survey-secure-link-resources.md)).

---

# 3. Assignment and Submission Resources

> **Status:** Placeholder.

| Resource family | Planned entries                         | Status target |
| --------------- | --------------------------------------- | ------------- |
| Assignments     | detail, ownership                       | Draft         |
| Drafts          | get / put / patch draft body            | Draft         |
| Submit / lock   | submit, lock, resubmit policy           | Draft         |
| Status          | submission status                       | Draft         |
| Idempotency     | keys / conflict → API-006               | Draft         |

Today’s api-now draft XHR path remains catalogued in [REST-001](REST-001-rest-resources.md) until rows migrate here.

---

# 4. References

| ID       | Title                          | Relationship        |
| -------- | ------------------------------ | ------------------- |
| DOC-001  | Documentation Control Standard | Governance          |
| ARCH-029 | Interface and API Architecture | Parent architecture |
| REST-001 | REST Standards and Resource Index | Parent index     |
| API-006  | Idempotency and Concurrency Contract | Duplicate submit / lock |
| REST-004 | Declaration Resources          | Parent declaration  |

---

# 5. Change Log

| Version | Date       | Summary                                     |
| ------- | ---------- | ------------------------------------------- |
| 0.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.0   | 2026-07-13 | Draft placeholder for REST catalogue split. |

---

# 6. Notes

**Owner:** Declarations module. **Priority:** High.
