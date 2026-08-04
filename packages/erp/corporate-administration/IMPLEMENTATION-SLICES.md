# Corporate Administration Delivery Slices

| Field | Value |
| --- | --- |
| Product scope | [PRD.md](PRD.md) |
| Delivery order | [DEVELOPMENT-ROADMAP.md](DEVELOPMENT-ROADMAP.md) |
| Authorized product slice | `CA-APP-01` |
| Authorized closure work | `CA-CL-01` through `CA-CL-05` |
| Not authorized | New CA-FR-007 through CA-FR-013 semantics; workspace exposure of CA-FR-006 |
| Updated | 2026-08-05 |

## CA-APP-01 — Corporate Entity Workspace

**Status:** AUTHORIZED.
**Purpose:** Ship one usable authenticated workspace using already-implemented
company, establishment, governance, officer, meeting, and resolution behavior.

### Permitted paths

```text
apps/web/
├── app/(client)/client/(workspace)/corporate-administration/**
├── features/corporate-administration/**
├── app/actions/*corporate-administration*.ts
├── lib/erp/corporate-administration*.ts
└── __tests__/corporate-administration/**

packages/erp/corporate-administration/
├── src/features/{company,establishments,governance,officers,meetings,resolutions,authority}/
└── __tests__/
```

Package changes are permitted only to repair a verified defect or add a missing
projection for this already-implemented cohort. The root facade, command
authorization token, command signatures, and `Result` contracts remain unchanged
unless new defect evidence requires a bounded correction.

### Required workflow

1. Entity register: real database list, search/filter, lifecycle/completeness,
   registered-office summary, pagination, loading, empty, denied, error, and
   unavailable states.
2. Entity create and profile: legal identity, jurisdiction, legal form, identifiers,
   financial year, activity, registered office, effective-dated facts, and history.
3. Governance: governing bodies, membership, tenure, voting rights, and visible
   incomplete/conflict states.
4. Officers: ordinary appointment, eligibility and tenure history, and supported
   departure actions. Protected appointments remain visibly unavailable when the
   platform approval verifier is unavailable.
5. Meetings and resolutions: schedule, attendance, package-derived quorum, vote,
   adopt/reject decision, actions, and historical retrieval.

### Non-negotiable boundaries

- Server Actions use trusted session organization/actor/correlation facts, call the
  root facade, and map canonical results to `ActionResult`.
- UI uses `@afenda/ui-system` and package projections only. React never calculates
  legal status, quorum, permission, approval, retry, or persistence policy.
- Production composition uses the Drizzle adapter. No mock production data, direct
  Drizzle use in UI/Actions, browser-controlled tenant identity, approval bypass,
  peer-table write, or duplicate business rule is allowed.
- CA-FR-006 through CA-FR-013 are out of scope for workspace exposure: the
  implemented `authority` capsule is not surfaced, and no new CA-FR-007 through
  CA-FR-013 semantics are added. Pending migrations 0034–0046 and 0050 are not
  applied by this slice.

### Controlled-beta acceptance

- An authenticated user can open the workspace and read real tenant-scoped entity
  data through production composition.
- An authorized user can create an entity, record a registered office, create a
  governing body and membership, perform an ordinary officer workflow, schedule a
  meeting, record attendance, and record a resolution.
- Each exposed workflow enforces authorization, server-stamped tenant identity,
  canonical errors, basic audit/history, and database persistence.
- Tenant-hostile, denied-user, validation, unavailable-approval, loading, empty,
  and failure states are tested for the exposed workflow.
- Keyboard operation, labels, focus, announcements, responsive behavior, and
  automated accessibility checks pass for exposed screens.

Passing this slice authorizes a controlled beta only. It does not change the
enterprise closure matrix or create an enterprise seal.

## Parallel closure slices

| Slice | Status | Scope and completion evidence |
| --- | --- | --- |
| CA-CL-01 Platform approvals | BLOCKED | When `PLATFORM-APPROVALS-01` exists, integrate its real production verifier. Prove version, provenance, expiry, revocation, independent approver, requester/subject/tenant/fingerprint binding, replay protection, and fail-closed behavior. |
| CA-CL-02 Adapter parity | DONE | Memory/Drizzle/Neon parity for CA-APP-01 company, establishment, governance, officer, meeting, and resolution stores/queries. Evidence (2026-08-05): `pnpm test:corporate-administration:parity` on isolated branch `ca-0-4-demo` (`br-fragrant-morning-aoywrnzr`, parent `production`, reset earlier this session); `AFENDA_DATABASE_TEST_TARGET=preview`; `REQUIRE_DATABASE_TESTS=1`. Result: passed=52 failed=0 skipped=0 files=29 duration≈170s exit=0. Includes new `__tests__/parity/resolution-workflow.parity.test.ts` (vote → resolution → action → minutes → supersession). |
| CA-CL-03 Atomicity | PARTIAL | Inject database failure around state, history, audit, outbox, and idempotency completion; prove rollback, retry, replay conflict, and concurrency behavior for exposed commands. |
| CA-CL-04 Tenant isolation | PARTIAL | Prove database-backed hostile cross-organization rejection for exposed reads, writes, references, cursors, histories, and approvals. |
| CA-CL-05 Migration and recovery | BLOCKED | Separate 0034–0046 and 0050 deployment-review lane: inventory/checksums, impact, backup/restore, staging rehearsal, compatibility, locks, approvals, verification, rollback/roll-forward, and maintenance window. No production application here. |

Closure work is evidence around the real workflow. It cannot replace delivery of
the workspace, and the workspace cannot claim an enterprise seal.

## Stop conditions

- Stop and report `BLOCKED` if the required platform capability, deployed schema,
  isolated database target, or authenticated test lane is unavailable.
- Stop and request authorization before adding a new semantic feature group, a
  migration, a package dependency, a public export, or a cross-domain write.
- Finish each slice with focused package/app tests, exact evidence, and the
  fourteen-boundary row status. Do not begin a second slice in the same mission.
