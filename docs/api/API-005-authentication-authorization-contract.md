# API-005 Authentication and Authorization Contract

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | API-005    |
| **Category** | API        |
| **Version**  | 0.1.1      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Platform   |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This document will define the common authentication and authorization requirements for all executable Afenda interfaces (Server Actions and Route Handlers).

It exists so that [API-001](API-001-api-boundaries.md) can remain focused on the adapter security pipeline while this contract owns authn/authz vocabulary, context, and forbidden patterns.

**Placeholder.** Substantive rules are not yet authoritative. Parent: [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md).

---

# 2. Scope

## 2.1 In Scope

Planned coverage:

- authentication context;
- tenant and organization scope;
- role and capability checks;
- resource ownership;
- public endpoint exceptions;
- service-to-service authentication;
- token validation;
- session handling;
- forbidden authentication patterns;
- authorization failure behavior.

## 2.2 Out of Scope

- Neon Auth provider configuration runbooks;
- product-specific permission catalogues (belong in module / ARCH-023 living inventory);
- UI-only visibility rules as a substitute for adapter checks.

---

# 3. Authentication and Authorization Contract

> **Status:** Placeholder — expand to Living before treating as enforcement SSOT.

| Topic                         | Planned authority                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------- |
| Authn context shape           | Actor identity, session, org membership                                           |
| Tenant / org scope            | Hard `organization_id` and module entitlement gates                               |
| Capability checks             | Platform RBAC + module permission codes                                           |
| Resource ownership            | Adapter-level ownership / state validation before domain                          |
| Public exceptions             | Explicit allowlist (health, approved public links)                                |
| Service-to-service            | Machine credentials / webhook verification                                        |
| Token / session               | Validation, expiry, refresh boundaries                                            |
| Forbidden patterns            | Layout-only auth; throw-as-expected-auth; client-trusted roles                    |
| Authz failure mapping         | Map to [API-002](API-002-error-contract.md) codes / status                        |

Pipeline order of enforcement remains owned by [API-001](API-001-api-boundaries.md). This document shall not redefine adapter choice or success envelopes.

---

# 4. References

| ID       | Title                          | Relationship                                      |
| -------- | ------------------------------ | ------------------------------------------------- |
| DOC-001  | Documentation Control Standard | Governance                                        |
| ARCH-029 | Interface and API Architecture | Parent architecture                               |
| API-001  | API Boundaries                 | Adapter pipeline (sibling; not replaced by this)  |
| API-002  | Error Contract                 | Failure shapes for authz failures                 |
| ARCH-023 | Multi-Tenancy and Platform RBAC | Living tenancy + RBAC inventory                  |
| ARCH-026 | Authentication and Session Model | Target session architecture                     |

---

# 5. Change Log

| Version | Date       | Summary                                      |
| ------- | ---------- | -------------------------------------------- |
| 0.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.0   | 2026-07-13 | Draft placeholder registered (ARCH-029 gap). |

---

# 6. Notes

**Priority:** Critical.

Fill this document before expanding external REST or elevating auth rules out of API-001 prose.
