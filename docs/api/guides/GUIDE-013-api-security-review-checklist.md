# GUIDE-013 API Security Review Checklist

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | GUIDE-013  |
| **Category** | Guide      |
| **Version**  | 0.1.1      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Platform   |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This guide will provide a **review checklist** for API / Action security before merge or release. It implements review practice against [ARCH-029](../../architecture/ARCH-029-interface-api-architecture.md) and [API-005](../API-005-authentication-authorization-contract.md) — it does not invent a parallel security architecture.

**Placeholder.**

---

# 2. Scope

## 2.1 In Scope

Checklist coverage planned:

- trust boundary validation;
- authn context present;
- org / tenant scope;
- capability checks;
- resource ownership;
- public exception justification;
- secrets / diagnostic leakage;
- cache posture on authenticated responses;
- idempotency for high-risk commands.

## 2.2 Out of Scope

- Pen-test methodology;
- Neon Auth provider configuration runbooks.

---

# 3. Security Review Checklist

> **Status:** Placeholder — expand to a copy-paste PR checklist.

| Check | Pass criteria (planned) | Authority |
| ----- | ----------------------- | --------- |
| Adapter security | Auth inside Action/RH, not layout-only | ARCH-029 · API-001 |
| Input | Zod at boundary | API-001 · API-004 |
| Scope | Org / module entitlement enforced | API-005 · ARCH-023 |
| Ownership | Resource ownership validated | API-005 |
| Public | Explicit allowlist only | API-005 · REST-006 |
| Errors | Safe client body; no secrets | API-002 |
| Cache | No public CDN on auth data | ARCH-029 |
| Idempotency | High-risk commands covered | API-006 |
| OpenAPI | No live claim for contract-only | OPEN-001 · REST-001 |

---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| ARCH-029 | Interface and API Architecture | Parent architecture |
| API-001 | API Boundaries | Pipeline |
| API-002 | Error Contract | Safe errors |
| API-005 | Authentication and Authorization Contract | Authn/authz (Draft) |
| API-006 | Idempotency and Concurrency Contract | High-risk commands (Draft) |
| ARCH-023 | Multi-Tenancy and Platform RBAC | Living IAM |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 0.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.0 | 2026-07-13 | Draft placeholder under `docs/api/guides/`. |

---

# 6. Notes

None.
