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
