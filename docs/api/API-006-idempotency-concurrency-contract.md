# API-006 Idempotency and Concurrency Contract

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | API-006    |
| **Category** | API        |
| **Version**  | 0.1.1      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Backend    |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This document will govern duplicate commands, retries, conflicting updates, and state-version checks across executable interfaces.

**Placeholder.** Substantive rules are not yet authoritative. Parent: [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md) §3.10.

---

# 2. Scope

## 2.1 In Scope

Planned coverage:

- idempotency key format;
- key scope;
- duplicate request result;
- retry behavior;
- optimistic concurrency;
- resource versioning;
- `409 CONFLICT`;
- submission locking;
- webhook replay;
- import apply;
- ERP sync enqueue;
- deposit and payment-like commands.

## 2.2 Out of Scope

- Domain-specific financial ledgers;
- Provider-specific webhook signature algorithms (belong in module packs);
- Full saga / outbox design (architecture elsewhere).

---

# 3. Idempotency and Concurrency Contract

> **Status:** Placeholder — expand to Living before external APIs or financial commands.

| Topic                    | Planned authority                                              |
| ------------------------ | -------------------------------------------------------------- |
| Idempotency key format   | Header / body field, charset, max length                       |
| Key scope                | Per actor, org, route, and time window                         |
| Duplicate result         | Replay original success vs conflict                            |
| Retry behavior           | Safe retries for clients and webhooks                          |
| Optimistic concurrency   | Version / revision / ETag / timestamp                          |
| `409 CONFLICT`           | When valid request conflicts with current state                |
| High-risk commands       | Deposit, payment, submission, allocation, invite, import, ERP  |

Adapters accept or derive keys; domain logic prevents duplicate side effects ([ARCH-029](../architecture/ARCH-029-interface-api-architecture.md)).

---

# 4. References

| ID       | Title                          | Relationship                    |
| -------- | ------------------------------ | ------------------------------- |
| DOC-001  | Documentation Control Standard | Governance                      |
| ARCH-029 | Interface and API Architecture | Parent architecture             |
| API-001  | API Boundaries                 | Adapter enforcement point       |
| API-002  | Error Contract                 | Conflict / failure mapping      |
| REST-001 | REST Resources                 | Resource-level status columns   |

---

# 5. Change Log

| Version | Date       | Summary                                      |
| ------- | ---------- | -------------------------------------------- |
| 0.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.0   | 2026-07-13 | Draft placeholder registered (ARCH-029 gap). |

---

# 6. Notes

**Priority:** Critical before external APIs or financial commands.
