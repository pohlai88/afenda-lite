# CA-PREFLIGHT-01 — Corporate Administration Read-Only Codex Preflight

## Mission identity

| Field | Value |
|---|---|
| Mission ID | `CA-PREFLIGHT-01` |
| Target module | `@afenda/corporate-administration` |
| Target bounded context | Corporate Administration and Statutory Registers |
| Intended implementation cut | `CA-0.5 + CA-1` |
| Mode | Read-only discovery, verification, and implementation planning |
| Authority | `docs-V2/_scratch/erp/corporate-administration/corporate-administration-integrated-implementation-authority.md`, or the attached technical spec `corporate-administration/corporate-administration.md` |
| Prohibited outcome | Starting implementation before the preflight verdict and evidence are complete |

## Objective

Inspect the current repository and produce an evidence-backed, executable plan for the first Corporate Administration vertical slice. Do **not** implement CA-1 during this mission.

The first implementation cut must eventually cover:

1. The public master-data prerequisite for resolving one effective `legal_entity` organization dimension.
2. The governed `@afenda/corporate-administration` package.
3. CA-1 persistence for:
   - `ca_legal_company`
   - `ca_company_name`
   - `ca_company_identifier`
   - `ca_company_status_history`
4. Company create, update, activate, suspend, dissolve, get, list, and as-of behavior.
5. Tenant-safe authorization, concurrency, idempotency, historical truth, and deterministic errors.
6. One atomic transaction for entity mutation, audit fact, and outbox event.
7. Real Memory and Drizzle adapters with parity.
8. Production server Actions, operator/client routes, navigation, and minimum usable UI.
9. Tests and all required governance, package, DB, event, web, tenancy, and verification lanes.

## Binding domain boundary

Treat these decisions as closed unless current disk evidence proves a direct contradiction:

- Package: `packages/erp/corporate-administration/`
- Published name: `@afenda/corporate-administration`
- Manifest id: `corporate-administration`
- Category/band: `erp` / `R1-F`
- Activation: `organization_toggle`
- Tables: `ca_*`
- CA owns the tenant's statutory legal-company registry.
- `@afenda/master-data` owns legal-entity dimensions, reusable parties, addresses, and tax registrations.
- CA must not directly write or query `md_*` internals; use a public master-data query/port.
- `@afenda/payments` owns operational payment accounts and money movement.
- `@afenda/accounting` owns journals, depreciation, and carrying values.
- Activated statutory facts are corrected by lifecycle, end dating, supersession, or reversal—not hard deletion.
- Every material mutation requires idempotency.
- Mutable roots require `expectedVersion` compare-and-swap.
- CA-1 includes usable UI and is not complete at package-only or Action-only depth.
- No stubs, shims, fake production adapters, TODO success paths, zero-test evidence, or partial completion claims.

## Operating constraints

### Absolutely do not

- Modify, create, delete, rename, format, or regenerate any repository file.
- Run `pnpm install`, dependency updates, codemods, fix modes, migration generation, or migration application.
- Run `validate:modules --write` or any command containing `--write`, `--fix`, `generate`, `push`, `migrate`, `seed`, `reset`, or destructive database actions.
- Checkout, reset, stash, clean, commit, or amend Git state.
- Apply schema changes to Neon/Postgres.
- Print secret environment-variable values.
- Start CA-1 implementation.
- Reopen an authority decision merely because a different design is personally preferred.
- Infer a repository convention from documentation when executable disk evidence is available.

### Required behavior

- Read repository-local instruction files before planning.
- Preserve all pre-existing work, including untracked files.
- Record current `HEAD`, branch, worktree state, and relation to the authority baseline without changing them.
- Distinguish current disk facts, authority requirements, inferences, gaps, and blockers.
- Cite exact file paths, symbols, commands, test names, and exit codes.
- Treat a command matching zero tests as **no evidence**.
- Treat skipped DB tests separately from an executed Neon parity lane.
- Do not expose `DATABASE_URL`, tokens, credentials, or full connection strings.
- Use current repository conventions where they satisfy the authority; identify an explicit repair where they do not.

## Preflight procedure

### Gate 0 — Repository identity and preservation

Capture:

```bash
git rev-parse --show-toplevel
git rev-parse HEAD
git branch --show-current
git status --short --branch
git diff --name-status
git diff --cached --name-status
git log -1 --format='%H%n%aI%n%s'
node --version
pnpm --version
```

Also determine:

- Whether authority baseline commit `d07f6751fe31da07a2c27814313f15ef7ff90f76` exists locally.
- Whether it is an ancestor of current `HEAD`.
- Which changed/untracked files overlap the future CA-0.5/CA-1 surface.

Rules:

- Do not reset to the authority baseline.
- An overlapping dirty file is a potential **NO-GO** until ownership and merge risk are explicit.
- Unrelated dirty files are not silently ignored; classify them as preservation constraints.

### Gate 1 — Instruction and rule stack

Locate and read applicable instruction sources, including where present:

```text
AGENTS.md
**/AGENTS.md
CODEX.md
CLAUDE.md
.github/**
.codex/**
.cursor/**
docs-V2/** governance/rule documents
package-local README and contributor guidance
```

Report the applicable precedence from repository root to each target area:

```text
packages/erp/master-data
packages/erp/corporate-administration
packages/data-plane/db
packages/data-plane/events
apps/web
scripts/validate-modules
docs-V2/modules
```

Do not claim a rule is binding unless its location/scope proves it.

### Gate 2 — Authority integrity

Locate the Corporate Administration authority. Record:

- Exact path.
- File hash.
- Title/status.
- Package, manifest, category, band, activation, table prefix, CA-1 tables, CA-0.5 prerequisite, and completion definition.
- Any direct conflict between the authority and current repository rules or architecture.

If the authority is absent, incomplete, or materially different from the approved implementation authority, verdict is **NO-GO / BLOCKED**. Do not reconstruct it from memory.

### Gate 3 — Existing Corporate Administration footprint and collision scan

Search the complete tracked worktree, excluding dependency/build/cache directories, for:

```text
corporate-administration
@afenda/corporate-administration
manifest id corporate-administration
corporate-administration.* command/query/permission IDs
ca_* schema/table/migration symbols
legal company registry implementations
company names/status history/identifier models that may already own the same facts
```

Determine one of:

- `ABSENT` — no executable CA boundary.
- `PARTIAL` — some governed/executable surface exists.
- `COLLISION` — another package owns the same statutory registry facts.
- `IMPLEMENTED` — evidence unexpectedly shows CA-1 already exists.

Do not mistake a planning document, generated register declaration, empty folder, or placeholder for implementation.

### Gate 4 — Reference implementation selection

Select the smallest set of mature peer implementations that collectively prove the patterns CA-1 needs. Prefer actual completeness over superficial naming similarity.

Inspect at least:

1. `@afenda/master-data` for public cross-domain lookup, permissions, manifest IDs, memory/Drizzle behavior, and organization-scoped facts.
2. One mature ERP package—likely Human Resources or Payroll—for package composition, domain stores, authorization, idempotency, concurrency, and parity.
3. One app feature for server Actions, session stamping, result mapping, routes, navigation, and UI states.
4. One DB/event implementation for schema registration, hard-tenant roots, migration conventions, and event schema registration.
5. One transaction-safe mutation that commits entity + audit + outbox atomically.

For each selected pattern, report:

```text
pattern purpose
exact source files/symbols
evidence of production use
evidence of tests
what CA should reuse
what CA must not copy
```

Do not use an incomplete, legacy, or stubbed package as the primary model.

### Gate 5 — Master-data prerequisite (`CA-0.5`)

Prove the current public API for organization dimensions. Determine whether a focused query already exists that can resolve exactly one effective organization dimension by `id` or `key`, constrained by:

```text
organizationId
kind = legal_entity
asOf
same-tenant behavior
not-found behavior
ambiguous-overlap behavior
```

Inspect:

- Public command/query IDs.
- Permission and authorization mapping.
- Manifest query list.
- Root exports.
- Store methods and Memory/Drizzle implementations.
- Tests for as-of, cross-tenant, and ambiguous ranges.

Classify:

- `SATISFIED` — CA can consume a public focused query without direct DB access.
- `REPAIR REQUIRED` — implement CA-0.5 before the CA package depends on it.
- `CONFLICT` — current ownership/API prevents the authority without a new decision.

The expected repair is a focused public query equivalent to `master-data.organization-dimension.get-effective`; do not prescribe a final file location until current package structure is verified.

### Gate 6 — Governance and control-plane registration

Locate and inspect the current mechanisms for:

- Module roadmap registration.
- Package catalogs.
- Workspace dependency/edge approval.
- Schema ownership declaration.
- Living ERP manifest package registration.
- Schema symbol/table mapping.
- Generated module, dependency, permission, event, and table registers.
- Package lifecycle promotion rules.

At minimum evaluate the actual current equivalents of:

```text
docs-V2/modules/MODULE-ROADMAP.yaml
packages/erp/README.md
packages/README.md
scripts/validate-modules/checks.mjs
docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml
docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml
```

Report exact required edits for CA-0.5/CA-1, which outputs are generated, and the approved generation command. Do not run write/generation commands in preflight.

### Gate 7 — Database, migrations, tenancy, and historical-truth conventions

Inspect current DB conventions and identify exact CA-1 integration points:

- Schema file/barrel pattern.
- Singular/plural table naming actually enforced.
- ID/default/timestamp/version conventions.
- `organization_id` and `legal_company_id` indexing conventions.
- Composite same-tenant foreign-key capability.
- Unique partial-index conventions.
- Numeric/date serialization conventions.
- Effective-range representation and overlap enforcement.
- Compare-and-swap implementation pattern.
- Idempotency key/fingerprint storage and unique constraints.
- Hard-tenant roots and null-tenancy audit registration.
- Schema ownership/table mutation register.
- Migration numbering, journal/meta, and test conventions.
- Current next migration position—without reserving or creating it.

Prove whether CA-1's four tables can be added without a naming/ownership collision.

### Gate 8 — Atomic entity + audit + outbox transaction

This is a hard gate. Locate the current production mechanism for committing:

```text
aggregate mutation
audit fact
outbox event
```

in one database transaction.

Inspect concrete symbols such as the repository's equivalents of:

```text
runNeonHttpTransaction
transaction-scoped store
transaction-scoped audit adapter
transaction-scoped outbox adapter
MutationPorts
UnitOfWork / UoW
```

Report:

- Exact reusable transaction API.
- How a Drizzle store is bound to the same transaction.
- How audit/outbox failures cause rollback.
- Existing failure-injection tests.
- Whether Memory semantics can faithfully model the atomic contract.
- The exact CA-1 composition shape recommended from disk evidence.

If no safe production pattern exists and the authority-compatible UoW cannot be concretely planned, verdict is **NO-GO**.

### Gate 9 — Events, permissions, authorization, and semantic errors

Inspect and map:

- Module ID constants.
- Command/query IDs and manifest parity.
- Permission constants and platform permission catalog registration.
- Fail-closed authorization ports.
- Semantic error catalog conventions and `Result` detail mapping.
- Event schema placement, naming, versioning, registration, and manifest imports.
- Event payload redaction conventions.
- Tests that prove catalog/map parity.

Produce the exact initial CA-1 surface to implement, limited to shipped behavior. Do not include future-slice IDs.

Expected CA-1 behavior includes company create/update/activate/suspend/dissolve/get/list/get-as-of plus the minimum name/identifier operations required to satisfy activation.

### Gate 10 — Package architecture and dependency graph

Verify current workspace/package conventions and propose an exact CA-1 tree based on disk evidence while preserving the authority's domain-split rule.

Determine:

- Required workspace dependencies and approved public edges.
- Package exports and subpath conventions.
- Module manifest conventions.
- `server-only` handling.
- Root barrel policy.
- Store composition pattern.
- Production adapter resolution.
- Test-only Memory exports.
- Package script conventions (`lint`, `typecheck`, `test`, `check`).
- Circular dependency risks.

Do not scaffold future CA-2–CA-7 aggregates in CA-1.

### Gate 11 — Web composition, Actions, routes, navigation, and minimum UI

Locate production patterns for:

- Session-derived `organizationId` and actor ID.
- Operator and tenant permission runners.
- `ActionResult<T>` and package `Result` mapping.
- Stable request/idempotency identity.
- Correlation IDs.
- Narrow Action schemas.
- Route/tag revalidation.
- Feature-folder composition.
- Operator and client route groups.
- Navigation module IDs and permission-gated entries.
- Loading, empty, forbidden, validation, stale-version, conflict, and server-error states.
- Route smoke, Action contract, interaction, and accessibility tests.

Produce the exact CA-1 route/action/feature file plan from current conventions. The preflight must verify whether both operator and client routes are expected to mutate or whether the client route is read-only under current product policy.

### Gate 12 — Testing, Vitest projects, Neon parity, and failure evidence

Inspect:

- Named Vitest project registration.
- `server-only` alias.
- Package unit-test conventions.
- Shared Memory/Drizzle parity harnesses.
- Neon test-environment detection.
- Database cleanup/isolation helpers.
- Concurrency-test patterns.
- Failure-injection/atomicity-test patterns.
- Tenancy and authorization test patterns.
- Web Action/route/a11y test conventions.

Report the exact CA-1 test matrix. Separate these lanes:

```text
unit lane
Memory parity lane
Neon/Drizzle parity lane
concurrency lane
atomicity/failure-injection lane
DB schema/migration lane
web Action/route/interaction lane
governance/tenancy/full workspace lane
```

A skipped Neon lane is `NOT RUN`, never `PASS`.

### Gate 13 — Baseline verification

Run only non-fixing, non-generating, source-preserving baseline commands that exist on the current disk. At minimum attempt the current equivalents of:

```bash
pnpm validate:modules
pnpm governance:packages
pnpm --filter @afenda/master-data check
pnpm --filter @afenda/db lint
pnpm --filter @afenda/db typecheck
pnpm --filter @afenda/events lint
pnpm --filter @afenda/events typecheck
pnpm --filter @afenda/web typecheck
pnpm audit:tenancy-nulls
```

Rules:

- Do not use `validate:modules --write`.
- Do not run DB-mutating parity tests during the read-only preflight.
- If a script does not exist, report `NOT AVAILABLE`; do not invent a substitute with different semantics.
- Capture exact commands, duration if available, exit code, matched test count where relevant, and concise failure evidence.
- Classify each failure as related, unrelated, or undetermined for CA-0.5/CA-1.
- Compare `git status` before and after. Any repository mutation caused by a supposedly read-only gate is a preflight failure and must not be auto-cleaned.

### Gate 14 — Gap, conflict, and blocker register

Create a deduplicated register with:

```text
ID
severity: P0 | P1 | P2
classification: GAP | CONFLICT | BLOCKED | BASELINE_FAILURE | RISK
requirement
disk evidence
affected CA slice
required resolution
whether implementation may start
```

Minimum P0 conditions include:

- Missing/contradictory authority.
- Overlapping unowned dirty files.
- Conflicting existing statutory-company owner.
- No safe master-data public boundary and no authority-compatible repair path.
- No concrete atomic audit/outbox transaction design.
- Unknown migration/ownership mechanism that risks ungoverned tables.
- Related baseline failures that make the selected slice unverifiable.

### Gate 15 — Executable CA-0.5 + CA-1 plan

Produce a dependency-ordered plan using exact current file paths and symbols. At minimum split it into:

1. `CA-0.5` master-data focused effective legal-entity query.
2. CA governance/catalog/edge registration.
3. DB schema, migration, tenancy roots, ownership, and permission catalog.
4. CA-1 event schemas.
5. Package shell, IDs, permissions, auth, ports, errors, shared invariants.
6. Company domain contracts and lifecycle rules.
7. Memory store and parity contract.
8. Drizzle store and atomic UoW.
9. Commands/queries and deterministic serialization.
10. App composition root and server Actions.
11. Routes, navigation, reusable feature UI, and accessible states.
12. Tests, failure injection, concurrency, reconciliation, and stabilization gates.
13. Generated-register update step—only during implementation, never preflight.
14. Final plan-to-code completeness report.

For every work package provide:

```text
purpose
exact files to create/change
dependency/precondition
behavior/invariants
required tests
verification commands
done criteria
likely merge/conflict risk
```

The plan must be implementable without reopening a settled authority decision.

## Required 16-section response

Return exactly these sections:

1. **Executive verdict** — `GO`, `CONDITIONAL GO`, or `NO-GO` for `CA-0.5 + CA-1`.
2. **Repository identity** — root, branch, `HEAD`, authority-baseline relation, Node/pnpm.
3. **Worktree preservation assessment** — clean/dirty files, overlap, before/after status.
4. **Instruction and rule stack** — scoped instructions and precedence.
5. **Authority integrity** — path/hash, binding decisions confirmed, conflicts.
6. **Existing CA footprint and ownership collision** — `ABSENT`, `PARTIAL`, `COLLISION`, or `IMPLEMENTED`.
7. **Reference patterns selected** — exact files/symbols and why they are authoritative.
8. **Master-data CA-0.5 readiness** — current API, gap, exact repair surface.
9. **Governance/control-plane readiness** — registrations, generators, package lifecycle.
10. **DB/migration/tenancy readiness** — conventions, migration position, CA-1 table plan.
11. **Atomicity readiness** — transaction/UoW/audit/outbox design and evidence.
12. **Package/event/permission/error surface** — exact CA-1 public surface only.
13. **Web/UI integration readiness** — composition, Actions, routes, navigation, UX/a11y.
14. **Test and baseline-gate evidence** — command table with exact exit codes and zero-test handling.
15. **Preflight completeness matrix and blocker register**.
16. **Executable CA-0.5 + CA-1 implementation plan** — ordered work packages and final start instruction.

## Preflight completeness matrix

Use these statuses only:

- `PASS` — current disk evidence is sufficient to implement safely.
- `REPAIR_REQUIRED` — a known, authority-compatible prerequisite must be implemented in the selected cut.
- `BASELINE_FAILURE` — pre-existing failing gate; scope and relation are proven.
- `CONFLICT` — authority and current implementation/rule disagree materially.
- `BLOCKED` — evidence cannot be obtained or a prerequisite has no safe resolution path.
- `NOT_APPLICABLE` — explicitly excluded by the authority.

Include at least these rows:

| Requirement | Status | Disk evidence | Implementation impact | Start decision |
|---|---|---|---|---|
| Authority located and intact |  |  |  |  |
| Current HEAD/baseline relation known |  |  |  |  |
| Worktree overlap classified |  |  |  |  |
| Instruction stack read |  |  |  |  |
| CA footprint/collision scan complete |  |  |  |  |
| Mature peer patterns selected |  |  |  |  |
| Master-data focused legal-entity lookup |  |  |  |  |
| Public dependency edge feasible |  |  |  |  |
| Governance registration mechanism known |  |  |  |  |
| DB schema/migration convention known |  |  |  |  |
| Tenancy/ownership registration known |  |  |  |  |
| CAS/idempotency/effective-date pattern known |  |  |  |  |
| Atomic audit/outbox design proven |  |  |  |  |
| Permission/auth/event registration known |  |  |  |  |
| Package/export/test conventions known |  |  |  |  |
| Web Action/session/result patterns known |  |  |  |  |
| Operator/client route policy known |  |  |  |  |
| Vitest/Neon/parity mechanism known |  |  |  |  |
| Baseline gates captured |  |  |  |  |
| Exact CA-0.5 + CA-1 plan produced |  |  |  |  |

## Verdict rules

### `GO`

Use only when:

- No unresolved authority conflict exists.
- No overlapping worktree risk blocks safe changes.
- The CA footprint and ownership boundaries are known.
- CA-0.5 is satisfied or has a precise authority-compatible repair included first.
- Atomic audit/outbox transaction design is concrete.
- Migration, tenancy, ownership, permissions, events, package, web, and testing paths are known.
- Related baseline gates are green, or there is no pre-existing related failure.
- The implementation plan contains exact files, tests, and gates.

### `CONDITIONAL GO`

Use when implementation can safely start but one or more of these are true:

- CA-0.5 is a known first repair.
- A DB/Neon lane cannot run because a safe test database is unavailable.
- An unrelated pre-existing baseline failure exists and is precisely isolated.
- Unrelated dirty work exists but does not overlap the selected files and preservation rules are explicit.

State every condition. Conditional items remain incomplete evidence and cannot later be reported as green without execution.

### `NO-GO`

Use when any P0 conflict/blocker remains, especially:

- Authority missing or contradictory.
- Overlapping dirty files cannot be safely preserved.
- Another executable boundary owns the same statutory facts.
- Required master-data boundary cannot be added safely.
- Entity/audit/outbox atomicity cannot be designed from current infrastructure.
- Governance/migration/ownership mechanisms are unknown.
- Related baseline failures make implementation or verification unreliable.

## Final instruction

End the response with one of these exact lines:

```text
START AUTHORIZED: CA-0.5 must be implemented first, followed by CA-1 under the attached plan.
```

```text
START AUTHORIZED: CA-1 may begin directly under the attached plan because CA-0.5 is already satisfied.
```

```text
START NOT AUTHORIZED: resolve P0 blockers listed above before changing code.
```

Do not implement code in this preflight mission.
