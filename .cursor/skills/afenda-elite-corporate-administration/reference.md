# Corporate Administration — reference

## Authority

| Path | Role |
| --- | --- |
| `packages/erp/corporate-administration/PRD.md` | Permanent product requirements, ownership boundary, and acceptance authority |
| `packages/erp/corporate-administration/DEVELOPMENT-ROADMAP.md` | Delivery sequence, eligibility gates, and requirement traceability |
| `packages/erp/corporate-administration/IMPLEMENTATION-SLICES.md` | Bounded missions, permitted code paths, prohibited changes, and acceptance criteria |
| `packages/erp/corporate-administration/README.md` | Living package capability and runtime summary |
| `packages/erp/corporate-administration/src/composition/module.manifest.ts` | Governed module projection |
| `packages/erp/corporate-administration/src/kernel/emissions/mutation-tables.ts` | CA sole-mutator inventory |
| `packages/data-plane/db/src/schema/corporate-administration.ts` | Drizzle schema host |

## Capability map

| Capability group | CA ownership |
| --- | --- |
| Legal-company registry | statutory identity, jurisdiction, names, forms, identifiers, activities, financial year, lifecycle |
| Establishments | registered offices, branches, representative offices, foreign registrations, premises |
| Governance | bodies, memberships, statutory officers, declarations, conflicts, meetings, quorum, voting, resolutions, actions |
| Corporate authority | delegations, mandates, signatories, powers of attorney, company-seal custody and use |
| Statutory compliance | obligations, filings, regulatory cases, deadlines, acknowledgements, exceptions |
| Legal instruments | legal title, registrations, intellectual property, insurance, charges, licences, permits, masked bank registrations |
| Structure and agreements | legal-entity graph, related parties, material agreements, non-securities corporate actions |
| Records and administration | statutory records, execution evidence, legal holds, calendars, cases, tasks, reminders |
| Assurance and operations | bounded reporting, reconciliation, evidence packs, recovery, deployment verification |

Only the first three living feature groups—legal company/establishments,
governance/officers, and meetings/resolutions—are implemented. `CA-APP-01` may
expose that cohort as a controlled beta. The remaining capability groups stay
ineligible until individually authorized; enterprise closure remains separate.

## Explicit Investor Relations ownership

Investor Relations—not Corporate Administration—owns securities, capital, investors, shareholders, holdings, certificates, beneficial ownership, and distributions. No CA command, table, or adapter may become a second implementation of those concepts.

## Execution model

- Package exports durable domain capabilities and validates one composed runtime.
- Application composition builds production ports once.
- Per-command options carry trusted organization, actor, correlation, idempotency, causation, and authorization facts.
- Command/query semantics derive from the domain operation registry.
- No production fallback adapter is resolved inside the package.
- Foreign facts arrive through approved public ports, registered events, or governed projections.
- Features own their schemas, rules, commands, queries, narrow store contracts, and adapters under `src/features`; shared semantics live in `src/kernel`; application-facing assembly lives in `src/composition`.

## Status vocabulary

- `Implemented`: living behavior exists but acceptance may remain incomplete.
- `Verified`: the named evidence has passed.
- `Pending evidence`: behavior or required proof remains incomplete.
- `BLOCKED`: an external prerequisite prevents safe implementation or verification.
- `NOT_ELIGIBLE`: entry criteria are unmet; do not scaffold or implement.
