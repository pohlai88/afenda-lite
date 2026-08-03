# Corporate Administration PRD Kit

> Generated from the approved Corporate Administration architecture and the canonical feature-PRD template.

## Status

All feature PRDs are **draft authoring contracts**, not implementation approvals. Architecture-derived ownership and repository rules are fixed; feature fields, detailed lifecycle guards, retention, performance targets, exact paths, and operational baselines remain explicit blockers.

## Contents

- `corporate-administration-architecture.md` — governing domain architecture
- `PRD-INDEX.md` — inventory, dependencies, and readiness matrix
- `DECISIONS.md` — shared PRD decisions and unresolved cross-feature questions
- `TRACEABILITY.md` — architecture-to-feature traceability seed
- `feature-specs/<group>/<feature>/PRD.md` — 28 individual feature PRDs

## Approval order

1. `entity-administration/establishments` as the proposed golden feature.
2. Remaining CA-1 features: company, governance bodies, officers, meetings, resolutions, authority.
3. CA-2 obligations calendar first, then statutory filings, licences and permits, compliance assurance.
4. CA-3 agreement features, all integrating with obligations calendar.
5. CA-4 resource and premises features.
6. CA-5 records features.

## Canonical rules

- Production consumers use `@afenda/corporate-administration`.
- Feature operations are owned by `operation-registry.ts`.
- Public outcomes use `Result<Data, Code>` from `@afenda/errors`.
- `@afenda/db` owns Drizzle schema and migrations.
- Memory behavior precedes Drizzle; parity is mandatory.
- Organization identity is server-trusted and enforced at the store boundary.
- Implementation, verification, activation, and enterprise readiness are separate statuses.
