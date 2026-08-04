# Corporate Administration Development Roadmap

| Field | Value |
| --- | --- |
| Product authority | [PRD.md](PRD.md) |
| Current delivery authority | [IMPLEMENTATION-SLICES.md](IMPLEMENTATION-SLICES.md) |
| Current authorization | `CA-APP-01` plus closure evidence for CA-FR-001 through CA-FR-005 |
| Enterprise posture | 7 `DONE`, 7 non-`DONE`; no enterprise seal |
| Updated | 2026-08-05 |

## Current work: two parallel tracks

### Track A — Usable controlled beta

`CA-APP-01 — Corporate Entity Workspace` is authorized now. It uses the existing
company, establishments, governance, officers, meetings, and resolutions
capabilities through the real application composition. It does not add a new
semantic feature group and does not surface the `authority` capability.

### Track B — Enterprise closure

| Closure lane | Priority | Scope |
| --- | ---: | --- |
| Platform approval integration | Blocked externally | Integrate a real verifier when `PLATFORM-APPROVALS-01` exists; keep protected actions fail-closed |
| Adapter parity | Done | CA-APP-01 memory/Drizzle/Neon parity recorded on `ca-0-4-demo` (2026-08-05; see IMPLEMENTATION-SLICES CA-CL-02) |
| Atomicity and concurrency | High | Atomicity DONE (CA-CL-03 outbox-failure cohorts). Still prove replay, conflicts, and concurrency for exposed commands |
| Tenant isolation | Done | CA-APP-01 Neon hostile cross-org evidence recorded 2026-08-05 (CA-CL-04); approval tenant binding stays with CA-CL-01 |
| Migration/recovery review | Separate lane | Validate 0034–0046 and 0050; do not apply production migrations here |
| Operational assurance | Parallel | Use the real beta workflow for accessibility, privacy, monitoring, recovery, and support evidence |

Track B is required for the enterprise seal. It does not block Track A from
shipping the existing cohort when the workflow-specific beta acceptance passes.

## Implemented but not exposed: CA-FR-006

The CA-FR-006 corporate-authority capsule is implemented at package level as the
`authority` feature: signing authority, bank mandates, powers of attorney,
delegated authority, monetary limits, grant/amend/revoke commands, and as-of
queries. Protected mandates fail closed pending platform approvals, and its
schema arrives with pending migration `0050_ca_authority_mandate.sql`.
Workspace exposure of authority mandates is a separate future authorization;
`CA-APP-01` must not surface it.

## Product expansion after the beta cohort

New semantics remain `NOT_ELIGIBLE` until the existing cohort has a usable beta
and the user authorizes one bounded feature mission. Recommended order:

1. CA-FR-007 — statutory obligations, filings, and regulatory cases
2. CA-FR-008 — legal instruments and asset-administration interests
3. CA-FR-009 — legal-group structure and related parties
4. CA-FR-010 — material agreements and corporate actions
5. CA-FR-011 — statutory records, execution evidence, and legal holds
6. CA-FR-012 — entity-administration work management
7. CA-FR-013 — reporting, reconciliation, and assurance

Each future mission must name one feature owner, preserve the root facade, use
narrow ports for adjacent domains, and prove the applicable fourteen boundaries.
It must not create placeholder features, a CA-local approval system, or a peer
ERP dependency.

## Change rule

The PRD changes product meaning. This roadmap changes order and eligibility.
`IMPLEMENTATION-SLICES.md` changes only the current delivery boundary and its
acceptance criteria. No document authorizes a production migration, enterprise
seal, commit, or push.
