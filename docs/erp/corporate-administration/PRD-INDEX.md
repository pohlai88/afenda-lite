# Corporate Administration PRD Index

## Feature inventory

| Phase | Feature group | Feature | Architecture responsibility | PRD status |
| --- | --- | --- | --- | --- |
| CA-1 | `entity-administration` | [`company`](feature-specs/entity-administration/company/PRD.md) | Legal identity, jurisdiction, names, identifiers, activities, lifecycle, and chronology | draft |
| CA-1 | `entity-administration` | [`establishments`](feature-specs/entity-administration/establishments/PRD.md) | Registered offices, branches, representative offices, registrations, and status history | draft |
| CA-1 | `entity-administration` | [`group-structure`](feature-specs/entity-administration/group-structure/PRD.md) | Parent, subsidiary, controlled-entity, and administrative legal relationships | draft |
| CA-1 | `governance-administration` | [`governance-bodies`](feature-specs/governance-administration/governance-bodies/PRD.md) | Boards, committees, constitution, membership structure, and body lifecycle | draft |
| CA-1 | `governance-administration` | [`officers`](feature-specs/governance-administration/officers/PRD.md) | Statutory offices, appointments, declarations, eligibility, conflicts, and disqualifications | draft |
| CA-1 | `governance-administration` | [`meetings`](feature-specs/governance-administration/meetings/PRD.md) | Notice, agenda, attendance, quorum, adjournment, and closure | draft |
| CA-1 | `governance-administration` | [`resolutions`](feature-specs/governance-administration/resolutions/PRD.md) | Voting, written decisions, adoption, rejection, supersession, and implementation references | draft |
| CA-1 | `governance-administration` | [`authority`](feature-specs/governance-administration/authority/PRD.md) | Delegations, signing mandates, bank mandates, powers of attorney, and limits | draft |
| CA-2 | `compliance-administration` | [`obligations-calendar`](feature-specs/compliance-administration/obligations-calendar/PRD.md) | Shared deadline, notice-period, renewal-window, ownership, and escalation engine | draft |
| CA-2 | `compliance-administration` | [`statutory-filings`](feature-specs/compliance-administration/statutory-filings/PRD.md) | Filing requirements, preparation, submission, acknowledgement, and evidence | draft |
| CA-2 | `compliance-administration` | [`licences-permits`](feature-specs/compliance-administration/licences-permits/PRD.md) | Licences, permits, registrations, certificates, conditions, and renewals | draft |
| CA-2 | `compliance-administration` | [`compliance-assurance`](feature-specs/compliance-administration/compliance-assurance/PRD.md) | Administrative reviews, exceptions, remediation, and evidence completeness | draft |
| CA-3 | `agreement-administration` | [`administrative-agreements`](feature-specs/agreement-administration/administrative-agreements/PRD.md) | Administrative vendor, service, support, and facility agreements | draft |
| CA-3 | `agreement-administration` | [`service-subscriptions`](feature-specs/agreement-administration/service-subscriptions/PRD.md) | Phone, internet, Zoom, SaaS, utilities, recurring service entitlement, assignment, renewal, and termination | draft |
| CA-3 | `agreement-administration` | [`insurance`](feature-specs/agreement-administration/insurance/PRD.md) | Policies, coverage periods, insured subjects, renewal, and claims references | draft |
| CA-3 | `agreement-administration` | [`legal-instruments`](feature-specs/agreement-administration/legal-instruments/PRD.md) | Deeds, guarantees, declarations, undertakings, and formal instruments | draft |
| CA-4 | `resource-administration` | [`administrative-assets`](feature-specs/resource-administration/administrative-assets/PRD.md) | Administrative identity, custody, location, condition, transfer, loss, and retirement from use | draft |
| CA-4 | `resource-administration` | [`resource-assignments`](feature-specs/resource-administration/resource-assignments/PRD.md) | Allocation and return of devices, lines, equipment, and administrative resources | draft |
| CA-4 | `resource-administration` | [`access-resources`](feature-specs/resource-administration/access-resources/PRD.md) | Sole ownership of key, badge, access-card issue, custody, return, loss, and revocation | draft |
| CA-4 | `resource-administration` | [`physical-verification`](feature-specs/resource-administration/physical-verification/PRD.md) | Counts, confirmations, discrepancies, missing resources, and evidence | draft |
| CA-4 | `premises-administration` | [`premises`](feature-specs/premises-administration/premises/PRD.md) | Administrative premises identity and responsible company | draft |
| CA-4 | `premises-administration` | [`occupancy`](feature-specs/premises-administration/occupancy/PRD.md) | Lease or occupancy period, usable areas, and administrative occupancy facts | draft |
| CA-4 | `premises-administration` | [`facility-services`](feature-specs/premises-administration/facility-services/PRD.md) | Cleaning, security, internet, utilities, waste, and maintenance-service arrangements | draft |
| CA-4 | `premises-administration` | [`premises-access`](feature-specs/premises-administration/premises-access/PRD.md) | Premises-level access grants referencing access resources; no credential lifecycle ownership | draft |
| CA-5 | `records-administration` | [`controlled-records`](feature-specs/records-administration/controlled-records/PRD.md) | Controlled versions, classification, approval state, access policy, and supersession | draft |
| CA-5 | `records-administration` | [`document-register`](feature-specs/records-administration/document-register/PRD.md) | Registered corporate documents and governed file references | draft |
| CA-5 | `records-administration` | [`retention-disposal`](feature-specs/records-administration/retention-disposal/PRD.md) | Retention rules, legal holds, review, and approved disposal | draft |
| CA-5 | `records-administration` | [`evidence-packs`](feature-specs/records-administration/evidence-packs/PRD.md) | Compiled evidence for audits, filings, renewals, and governance events | draft |

## Cross-feature dependency rules

- `obligations-calendar` is the sole shared deadline, notice-period, renewal-window, and escalation engine.
- `access-resources` solely owns key, badge, and access-card custody lifecycle; `premises-access` owns grants by reference only.
- `officers` owns person-bound declarations, conflicts, eligibility, and disqualifications; compliance features own entity-bound obligations.
- `administrative-assets` owns custody and condition, not financial valuation or depreciation.
- `service-subscriptions` owns internal administrative entitlement, not invoices, payments, accounting, SSO, or technical credentials.
- Records features own governance and references, not generic binary storage.

## PRD approval gate

Each PRD must replace all blocking questions with approved values, verify actual repository paths, finalize record fields and lifecycle transitions, finalize operations and permissions, and identify evidence-backed targets before implementation may begin.
