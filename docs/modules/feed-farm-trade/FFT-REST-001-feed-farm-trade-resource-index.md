# FFT-REST-001 Feed Farm Trade Resource Index

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | FFT-REST-001 |
| **Category** | REST       |
| **Version**  | 0.1.1      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Backend    |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This document is the module-owned REST index for Feed Farm Trade (FFT).

FFT shall not remain indefinitely as an appendix inside [REST-001](../../api/REST-001-rest-resources.md). This index owns the FFT HTTP catalogue spine because FFT has its own RBAC, gated delivery phases, ERP sync, allocation, deposits, pickup, import, and operational commands.

**Placeholder.** Not enforcement SSOT. Parent architecture: [ARCH-029](../../architecture/ARCH-029-interface-api-architecture.md). Module spine: [FFT-MOD-007](FFT-MOD-007-api-and-adapters.md).

---

# 2. Scope

## 2.1 In Scope

- Index of FFT REST document candidates;
- Pointers to Living module docs for adapters and RBAC;
- Derivation rule for child FFT-REST documents.

## 2.2 Out of Scope

- Platform Declarations REST families (REST-002…007);
- Creating child FFT-REST documents before the related feature is approved for implementation;
- OpenAPI machine files (OPEN-* / future FFT OPEN split).

---

# 3. Feed Farm Trade Resource Index

> **Status:** Placeholder index. Child documents are **reserved**, not created yet.

| Candidate ID   | Document                              | Create when                                      |
| -------------- | ------------------------------------- | ------------------------------------------------ |
| FFT-REST-001   | Feed Farm Trade Resource Index (this) | Now (Draft placeholder)                          |
| FFT-REST-002   | Trade Event and Order Resources       | Events/orders HTTP implementation approved       |
| FFT-REST-003   | Allocation Resources                  | Allocation HTTP implementation approved          |
| FFT-REST-004   | Deposit and Pickup Resources          | Deposit/pickup HTTP implementation approved      |
| FFT-REST-005   | Import Resources                      | Import HTTP implementation approved              |
| FFT-REST-006   | Trade RBAC Resources                  | Trade RBAC HTTP surface approved                 |
| FFT-REST-007   | ERP Synchronization Resources         | ERP sync HTTP / enqueue surface approved         |

### Creation rule

Do **not** create FFT-REST-002…007 immediately.

1. Keep this index as the module REST home.
2. Derive a child document only when the corresponding feature is approved for implementation.
3. Register the child ID in [DOC-002](../../_control/DOC-002-documentation-register.md) only when the file is created (user-approved ID).

Until then, contract-only FFT paths may continue to appear under [REST-001](../../api/REST-001-rest-resources.md) with an explicit pointer here.

---

# 4. References

| ID          | Title                          | Relationship                    |
| ----------- | ------------------------------ | ------------------------------- |
| DOC-001     | Documentation Control Standard | Governance                      |
| ARCH-029    | Interface and API Architecture | Parent interface architecture   |
| REST-001    | REST Standards and Resource Index | Platform REST standard/index |
| FFT-MOD-007 | API and adapters               | Module adapter authority        |
| FFT-MOD-005 | Auth / tenancy / RBAC          | FFT RBAC                        |
| FFT-MOD-008 | Ops runtime                    | Gates / phase delivery          |

---

# 5. Change Log

| Version | Date       | Summary                                              |
| ------- | ---------- | ---------------------------------------------------- |
| 0.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.0   | 2026-07-13 | Draft placeholder index; child IDs reserved only.    |

---

# 6. Notes

FFT-REST-002…007 IDs are reserved in this index for planning. They are **not** registered in DOC-002 until files exist.
