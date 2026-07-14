# API-007 API Observability and Correlation Contract

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | API-007    |
| **Category** | API        |
| **Version**  | 0.1.1      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Backend    |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This document will define how every Server Action and HTTP request is traced safely end-to-end without leaking secrets to clients.

**Placeholder.** Substantive rules are not yet authoritative. Parent: [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md) §3.11.

---

# 2. Scope

## 2.1 In Scope

Planned coverage:

- request IDs;
- correlation IDs;
- structured logging;
- actor and tenant context;
- latency;
- external dependency calls;
- unexpected errors;
- safe client correlation references;
- audit event relationship;
- log redaction.

## 2.2 Out of Scope

- Vendor APM product selection;
- Full audit-store schema (platform audit architecture);
- Product analytics event schemas.

---

# 3. API Observability and Correlation Contract

> **Status:** Placeholder — expand to Living for High-priority observability baseline.

| Topic                         | Planned authority                                           |
| ----------------------------- | ----------------------------------------------------------- |
| Request / correlation IDs     | Generation, propagation, response headers                   |
| Structured logs               | Required fields; severity for expected vs unexpected        |
| Actor / tenant context        | Safe fields in logs (no secrets)                            |
| Latency / dependency spans    | Adapter and outbound call timing                            |
| Unexpected errors             | Internal diagnostics + safe client reference                |
| Audit relationship            | When correlation IDs appear on audit rows                   |
| Redaction                     | Tokens, passwords, PII, SQL, connection strings             |

Expected validation or authorization failures shall not be logged as system defects ([ARCH-029](../architecture/ARCH-029-interface-api-architecture.md)).

---

# 4. References

| ID       | Title                          | Relationship              |
| -------- | ------------------------------ | ------------------------- |
| DOC-001  | Documentation Control Standard | Governance                |
| ARCH-029 | Interface and API Architecture | Parent architecture       |
| API-001  | API Boundaries                 | Adapter logging boundary  |
| API-002  | Error Contract                 | Safe client error shapes  |
| API-005  | Authentication and Authorization Contract | Actor context (Draft) |

---

# 5. Change Log

| Version | Date       | Summary                                      |
| ------- | ---------- | -------------------------------------------- |
| 0.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.0   | 2026-07-13 | Draft placeholder registered (ARCH-029 gap). |

---

# 6. Notes

**Priority:** High.
