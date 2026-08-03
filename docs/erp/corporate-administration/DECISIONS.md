# Corporate Administration Shared PRD Decisions

## Inherited decisions

| ID | Decision | Authority |
| --- | --- | --- |
| CA-PD-001 | Feature groups classify; individual features own mutable business meaning | Domain architecture |
| CA-PD-002 | Package root is the only production business API | Domain architecture |
| CA-PD-003 | Feature-owned `operation-registry.ts` is the canonical operation source | Domain architecture |
| CA-PD-004 | `@afenda/db` owns Drizzle schemas and migrations | Repository and domain architecture |
| CA-PD-005 | Memory-first behavior and memory–Drizzle parity are mandatory | Domain architecture |
| CA-PD-006 | Organization identity is server-trusted and store-enforced | Domain architecture / ARCH-023 |
| CA-PD-007 | State, audit, and required outbox effects commit atomically | Domain architecture |
| CA-PD-008 | Approval execution belongs to the platform approval capability | Domain architecture |
| CA-PD-009 | Investor, accounting, procurement, payment, HR, IT-security, and generic-file facts remain external | Domain architecture |

## Resolved ownership decisions

| ID | Decision |
| --- | --- |
| CA-PD-010 | `access-resources` owns physical credential lifecycle; `premises-access` stores grants and references only |
| CA-PD-011 | `officers` owns person-bound compliance facts; compliance administration owns entity-bound obligations |
| CA-PD-012 | `obligations-calendar` is the shared renewal and deadline engine |
| CA-PD-013 | `service-subscriptions` owns administrative entitlement; financial and technical consequences remain external |
| CA-PD-014 | `administrative-assets` owns administrative custody; Asset Accounting owns valuation and depreciation |

## Cross-feature questions requiring one domain-level decision

| ID | Question | Blocks |
| --- | --- | --- |
| CA-PQ-001 | Which canonical error code represents an unavailable required approval verifier? | Approval-required operations |
| CA-PQ-002 | What person and external-party reference contracts are approved? | Officers, meetings, authority, agreements, assignments |
| CA-PQ-003 | What common date, identifier, pagination, and evidence-reference primitives are canonical? | All PRDs |
| CA-PQ-004 | Which privacy classifications and retention defaults apply by record class? | All PRDs and activation |
| CA-PQ-005 | What exact repository paths currently compose feature registries and facade capabilities? | Exact manifests and implementation slices |
| CA-PQ-006 | What are the evidence-backed volume, latency, and service-level targets? | Non-functional approval and operational readiness |

## Feature-level decisions pending approval — `establishments`

Implemented provisionally in code (Slices 1–4, memory-only) ahead of formal
approval to make the golden feature concrete for review. **Not approved.**
Verification is blocked until each row below is approved, revised, or
rejected. See
`feature-specs/entity-administration/establishments/evidence/slice-04-provisional-memory-implementation.md`
for the full discrepancy matrix and test evidence.

| ID | Proposed decision | Resolves | Status |
| --- | --- | --- | --- |
| CA-FD-EST-01 | Status vocabulary `draft, active, suspended, closed` (closed terminal); transitions draft→{active,closed}, active→{suspended,closed}, suspended→{active,closed} | FQ-01 (establishments PRD) | **approved 2026-08-03 (owner directive)** |
| CA-FD-EST-02 | Aggregate fields: id, organizationId, legalCompanyId, establishmentType (`registered_office\|branch\|representative_office`), jurisdictionCode, registrationIdentifier (+normalized), displayName, status, registeredFrom, version, created/updated actor+timestamp | FQ-02 (establishments PRD) | **approved 2026-08-03 (owner directive)** |
| CA-FD-EST-03 | Natural key `(organizationId, normalizedRegistrationIdentifier)`; normalization = trim + NFC + strip `[\s._-]` + uppercase | FQ-02 (establishments PRD) | **approved 2026-08-03 (owner directive)** |
| CA-FD-EST-04 | `activate` fails closed with `SERVICE_UNAVAILABLE` (no mutation) when no approval verifier is configured, and `FORBIDDEN` (no mutation) when the verifier declines; `suspend`/`close` remain permission-only per PRD §8.2 | CA-PQ-001 (partial — only the fail-closed *behavior*, not the canonical code itself) | **approved 2026-08-03 (owner directive)** |

CA-PQ-001 itself remains fully open: `SERVICE_UNAVAILABLE` is this
implementation's fail-closed default, not a proposed answer to the
cross-feature question. If the domain-level decision on CA-PQ-001 differs,
`requireCorporateAdministrationApproval` in
`packages/erp/corporate-administration/src/kernel/execution/approval.ts`
changes to match.
