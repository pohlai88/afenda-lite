# Corporate Administration Architecture-to-PRD Traceability

| Architecture responsibility | Owning feature PRD | Cross-feature relationship |
| --- | --- | --- |
| Legal identity, jurisdiction, names, identifiers, activities, lifecycle, and chronology | `entity-administration/company` | None; authoritative owner |
| Registered offices, branches, representative offices, registrations, and status history | `entity-administration/establishments` | None; authoritative owner |
| Parent, subsidiary, controlled-entity, and administrative legal relationships | `entity-administration/group-structure` | None; authoritative owner |
| Boards, committees, constitution, membership structure, and body lifecycle | `governance-administration/governance-bodies` | None; authoritative owner |
| Statutory offices, appointments, declarations, eligibility, conflicts, and disqualifications | `governance-administration/officers` | None; authoritative owner |
| Notice, agenda, attendance, quorum, adjournment, and closure | `governance-administration/meetings` | None; authoritative owner |
| Voting, written decisions, adoption, rejection, supersession, and implementation references | `governance-administration/resolutions` | None; authoritative owner |
| Delegations, signing mandates, bank mandates, powers of attorney, and limits | `governance-administration/authority` | None; authoritative owner |
| Shared deadline, notice-period, renewal-window, ownership, and escalation engine | `compliance-administration/obligations-calendar` | None; authoritative owner |
| Filing requirements, preparation, submission, acknowledgement, and evidence | `compliance-administration/statutory-filings` | Registers deadlines and renewal windows into `obligations-calendar` |
| Licences, permits, registrations, certificates, conditions, and renewals | `compliance-administration/licences-permits` | Registers deadlines and renewal windows into `obligations-calendar` |
| Administrative reviews, exceptions, remediation, and evidence completeness | `compliance-administration/compliance-assurance` | None; authoritative owner |
| Administrative vendor, service, support, and facility agreements | `agreement-administration/administrative-agreements` | Registers deadlines and renewal windows into `obligations-calendar` |
| Phone, internet, Zoom, SaaS, utilities, recurring service entitlement, assignment, renewal, and termination | `agreement-administration/service-subscriptions` | Registers deadlines and renewal windows into `obligations-calendar` |
| Policies, coverage periods, insured subjects, renewal, and claims references | `agreement-administration/insurance` | Registers deadlines and renewal windows into `obligations-calendar` |
| Deeds, guarantees, declarations, undertakings, and formal instruments | `agreement-administration/legal-instruments` | Registers deadlines and renewal windows into `obligations-calendar` |
| Administrative identity, custody, location, condition, transfer, loss, and retirement from use | `resource-administration/administrative-assets` | None; authoritative owner |
| Allocation and return of devices, lines, equipment, and administrative resources | `resource-administration/resource-assignments` | References `administrative-assets` or `access-resources` |
| Sole ownership of key, badge, access-card issue, custody, return, loss, and revocation | `resource-administration/access-resources` | None; authoritative owner |
| Counts, confirmations, discrepancies, missing resources, and evidence | `resource-administration/physical-verification` | None; authoritative owner |
| Administrative premises identity and responsible company | `premises-administration/premises` | None; authoritative owner |
| Lease or occupancy period, usable areas, and administrative occupancy facts | `premises-administration/occupancy` | None; authoritative owner |
| Cleaning, security, internet, utilities, waste, and maintenance-service arrangements | `premises-administration/facility-services` | None; authoritative owner |
| Premises-level access grants referencing access resources; no credential lifecycle ownership | `premises-administration/premises-access` | References credentials owned by `access-resources` |
| Controlled versions, classification, approval state, access policy, and supersession | `records-administration/controlled-records` | None; authoritative owner |
| Registered corporate documents and governed file references | `records-administration/document-register` | None; authoritative owner |
| Retention rules, legal holds, review, and approved disposal | `records-administration/retention-disposal` | None; authoritative owner |
| Compiled evidence for audits, filings, renewals, and governance events | `records-administration/evidence-packs` | None; authoritative owner |

## Common architecture requirements inherited by every PRD

- Package-root facade only.
- Feature-owned operation registry composed into module registry and manifest.
- Canonical `Result<Data, Code>` outcomes.
- Trusted organization context and tenancy-safe absence.
- Authorization and approval fail closed.
- State, audit, and outbox atomicity.
- Idempotent replay without duplicate effects.
- `@afenda/db` schema and migration ownership.
- Memory-first behavior and Drizzle parity.
- No empty planned capabilities or overstated lifecycle status.
