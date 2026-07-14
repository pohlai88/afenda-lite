# REST-002 Identity and Organization Resources

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | REST-002   |
| **Category** | REST       |
| **Version**  | 0.1.1      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Platform   |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This document will catalogue Identity and Organization HTTP resources so [REST-001](REST-001-rest-resources.md) can remain the REST standard and high-level index.

**Placeholder.** Not enforcement SSOT. Parent: [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md).

---

# 2. Scope

## 2.1 In Scope

Planned coverage:

- organization users;
- roles;
- invitations;
- account membership;
- ban and unban;
- password administration when portal-owned;
- organization scope.

## 2.2 Out of Scope

- Neon Auth provider internals (unless explicitly approved as Rest resources);
- Module-specific FFT RBAC routes ([FFT-REST-001](../modules/feed-farm-trade/FFT-REST-001-feed-farm-trade-resource-index.md) family);
- Full field schemas (owning Zod maps via [API-004](API-004-schema-map.md)).

---

# 3. Identity and Organization Resources

> **Status:** Placeholder — expand when identity/org HTTP catalogue is split out of REST-001.

| Resource family        | Planned entries (examples)                          | Status target   |
| ---------------------- | --------------------------------------------------- | --------------- |
| Organization users     | list, get, invite, ban, unban                       | Draft           |
| Roles / membership     | membership list, role assignment                    | Draft           |
| Invitations            | create, accept/entry handoff                        | Draft           |
| Password (portal-owned)| reset/admin flows only if portal-owned              | Conditional     |

Each future row shall use REST-001 columns: method, path, purpose, auth, cache, `api-now` | `contract-only` | `deprecated` | `retired`.

---

# 4. References

| ID       | Title                          | Relationship                |
| -------- | ------------------------------ | --------------------------- |
| DOC-001  | Documentation Control Standard | Governance                  |
| ARCH-029 | Interface and API Architecture | Parent architecture         |
| REST-001 | REST Standards and Resource Index | Parent index / standards |
| API-005  | Authentication and Authorization Contract | Authn/authz (Draft) |
| ARCH-023 | Multi-Tenancy and Platform RBAC | Living IAM inventory      |
| ARCH-026 | Authentication and Session Model | Target session model      |

---

# 5. Change Log

| Version | Date       | Summary                                         |
| ------- | ---------- | ----------------------------------------------- |
| 0.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.0   | 2026-07-13 | Draft placeholder for REST catalogue split.     |

---

# 6. Notes

**Owner:** Identity / Platform. **Priority:** High.
