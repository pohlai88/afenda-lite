# Corporate Administration semantic registry cutover evidence

## Verdict

```text
Implementation                 COMPLETE
Semantic cutover               COMPLETE
Application kernel integration COMPLETE
Enterprise/phase closure       BLOCKED
Remaining boundary rows        9 non-DONE
Canonical operations           102 (65 commands, 37 queries)
Registered permissions         13
Registered emitted events      59
Production migrations applied  none
Commit/push                    none
```

This mission is independent of the legacy CA-2.5 closure lane. It does not
promote the module lifecycle or make CA-3.1 eligible.

## Mission contract

```yaml
semantic_registry_mission:
  target: packages/erp/corporate-administration
  concept: operations
  canonical_owner: src/<domain>/operations.ts composed by src/operation-registry/registry.ts
  permanent_facade: "@afenda/corporate-administration"
  normalization_boundary: existing command/query schemas and createCorporateAdministrationCommandFingerprint
  projections:
    - command and query identifiers
    - command and query authorization maps
    - module manifest command/query/event/permission inventories
    - durable command identity and event selection
    - command authorization policy and registry-bound execution token
    - query authorization policy
    - terminal operation diagnostics and structured-log projection
    - web Action and RSC permission selection
  consumers: package operation facades and verified app composition consumers
  compatibility: breaking for the root fingerprint helper input (commandId -> operationId), the composed runtime constructor (required observability port), query dependency projections (runtime observer required), and removal of the low-level root permission guard; command/query Result behavior preserved
  deletion_set:
    - manual command/query ID arrays
    - manual command/query authorization maps
    - manual manifest command/query/event/permission projections
    - handler-owned durable command identity and event-type literals
    - query-family permission lookup helpers
    - command-family permission lookup helpers and raw permission-map reads
    - root-exported low-level permission guard
    - command-specific observability API naming
    - company-owned durable command runner
    - duplicate production runtime wrapper
    - root-exported command/query permission maps
    - publicly exported Drizzle idempotency, outbox and transaction classes
  acceptance: package contracts, event contracts, web typecheck, focused web Actions, repository leakage check
```

## Architectural outcome

- Six domain-owned operation definition files describe ownership,
  authorization, approval, transaction, idempotency, emission, privacy,
  observability, public projection, durable identity and registered events.
- The composed registry validates duplicate operation IDs, duplicate durable
  identities, permission references, event references and complete use of the
  registered CA permission/event catalogs.
- `module-ids.ts`, `authorization.ts` and `module.manifest.ts` are projections;
  they no longer maintain operation inventories.
- After input parsing and before any reference or store read, command facades
  request authorization through one private capability. It derives permission
  from the canonical operation definition and returns a registry-bound token.
- The durable command runner accepts that token as its only source of operation
  identity and trusted request facts, then derives durable identity and event
  type. A caller cannot authorize one operation while persisting, auditing,
  emitting or observing another. Production handlers no longer declare those
  literals or interpret command permission maps.
- The durable runner is now a private, domain-neutral application kernel. It
  depends only on the runtime capability bundle, event-ID creation and the
  approval-verification capability; domain handlers retain their narrow
  store/reference dependencies.
- `registerLegalCompanyDraft` now uses the same atomic transaction boundary as
  the other durable commands, so domain persistence, audit, outbox and
  idempotency completion commit or roll back together.
- Approval policy is required registry data rather than an optional handler
  hint. The registry distinguishes `none`,
  `maker_checker_when_configured`, `maker_checker_required` and
  `maker_checker_for_protected_role`; the private command kernel alone evaluates
  those policies.
- Required approval fails closed before idempotency reservation or mutation
  when the verifier, binding IDs, exact tenant/fingerprint match, affirmative
  decision or independent approver is absent. Optional approval preserves the
  phase authority's “when configured” behavior, and protected-role appointment
  receives its domain decision explicitly from the resolved statutory office.
- The unused app-side approval verifier that always returned no decision was
  deleted. No synthetic verifier is installed as production integration.
- The duplicate production-runtime wrapper was deleted. App composition uses
  the permanent `createCorporateAdministrationRuntime` facade directly.
- Production app consumers request permission through
  `corporateAdministrationPermissionFor(operationId)`; raw command/query maps
  and the low-level permission guard are no longer root exports.
- The Drizzle adapter subpath exposes opaque factories and structural dependency
  contracts only. Idempotency, outbox and transaction implementation classes
  are private, so consumers cannot couple to constructors or class identity.
- The registry's `observabilityClass` is executable policy rather than inert
  metadata. The private command and query kernels emit exactly one terminal
  operation observation for success, governed failure or unexpected exception,
  and only governed failures carry their canonical error code.
- All 37 accepted query facades route through one private query kernel. It
  derives the required permission from the canonical operation registry,
  fails closed before store work, preserves existing `Result` and rejection
  semantics, and prevents query families from rebuilding authorization maps.
- The runtime port exposes one `recordOperation` capability rather than
  parallel command/query diagnostics APIs. The app projection derives its
  structured event namespace from the observation's registry-owned operation
  kind.
- The composed runtime now requires an opaque observability port. The production
  app projects that contract through the sealed `@afenda/logger` capability;
  CA package code acquires no logger/metrics dependency and the projection
  excludes tenant, actor, payload, approval, SQL, stack and open metadata.
- `retireCompanyName`, `retireCompanyIdentifier` and `endCompanyActivity` now
  use the common idempotency + transaction + audit + outbox boundary and emit
  registered, redacted events.
- Web Actions and the CA shell select permissions from the root package
  projections. A repository test forbids raw permission, event and durable
  identity interpretation from returning to production consumers.

## Enterprise closure item 1 — external approval verifier

```text
Status                       BLOCKED
CA verifier port             IMPLEMENTED AND FAIL-CLOSED
Production verifier adapter  ABSENT
External approval owner      ABSENT
CA-3.1 eligibility           NO
Closure item 2 eligibility   NO — closure order is serial
```

The living repository contains no approval/workflow package, approved workspace
edge, external endpoint contract, environment configuration or production
decision store that can implement `CorporateAdministrationApprovalDecisionPort`.
Scratch authority assigns generic maker-checker workflow identity to an external
Approval platform, while the enterprise inventory records shared workflow/tasks/
approvals as having no reusable owner. Application `platformWorkItem` rows are
task/outcome facts only: they do not bind approval request ID, decision ID,
canonical command fingerprint, validity window or independent approver evidence.
HR and Master Data approval records remain domain-owned and cannot be reinterpreted
as CA approval evidence.

No pass-through adapter, synthetic decision, memory fallback or direct foreign
table read was added. The verified CA port and command kernel remain unchanged and
continue to deny required approval when no external verifier is composed. A real
integration requires either an identified external approval-service contract or
an explicitly authorized prerequisite platform-approval mission. CA-3.4 cannot be
used as a shortcut because its authority depends on CA-3.1–CA-3.3, and CA-3.1 is
not eligible.

`PLATFORM-APPROVALS-01` is authorized as that separate prerequisite mission. It
does not unblock this CA boundary until a real production capability exists and
an application adapter satisfies `CorporateAdministrationApprovalDecisionPort`.

## Enterprise closure item 2 — Neon adapter parity

```text
Status                       BLOCKED
Parity suites                PRESENT
Tenant-scoped cleanup        VERIFIED ON PREVIEW FOR 13-TABLE COHORT
Parity lane                  FAIL-CLOSED
Non-production Neon target   CREATED
Configured Neon branch       br-tiny-hill-ao82jp6f (production)
Preview Neon branch          br-still-cloud-aof2rkqv
Preview parent               br-tiny-hill-ao82jp6f
Preview expiry               2026-08-09T00:15:09Z
Database writes performed    isolated preview only; tenant-scoped cleanup ran
Migrations applied           none
```

The living parity suites cover legal-company jurisdiction, company name/legal
form, company identifiers/financial year/activity, establishments and durable
legal-company behavior. They generate unique organization IDs and clean up with
organization-scoped predicates; the package boundary test rejects truncation,
unscoped deletion and swallowed cleanup errors.

Those suites perform real inserts and deletes. The only configured local Neon
connection targets the repository production branch, while the parity harness
now requires an explicit `AFENDA_DATABASE_TEST_TARGET=test|preview` disposition
before any database-backed suite can collect. The canonical lane loads
`@afenda/testing/setup/required-database`, forces database evidence on and owns
both root and nested `*.parity.test.ts` projections. The formerly misnamed
`legal-company-drizzle-parity.test.ts` suite was renamed to canonical
`legal-company-drizzle.parity.test.ts`, eliminating its false unit-lane match
without adding a special-case registry entry.

`AFENDA_DATABASE_TEST_TARGET` is not persisted with an isolated test
disposition. Before the preview branch existed, the parity command selected all
16 files, executed only four pure/memory files (7 tests), and rejected all 12
database-backed suites during collection before database mutations could run.
The read-only `pnpm validate:neon-env` probe timed out after 124 seconds without
a result.
An isolated preview branch was created from production with a seven-day expiry
and a bounded scale-to-zero compute. A read-only probe confirmed the inherited
`neondb` database exposes 13 `ca_*` tables. The canonical parity lane then
selected 16 files and 27 tests: 4 files / 8 tests passed, while all 12
database-backed files / 19 tests failed during organization-scoped cleanup
because the inherited schema does not contain `ca_governance_membership`.
Scenario mutation bodies were not reached. This is evidence of schema/test
posture drift, not adapter parity or atomicity. Production migrations 0034–0046
remain outside this lane and were not applied to either branch.

The cleanup cohort was then corrected to match the exact inherited 13-table CA
schema: the undeployed migration-0034 governance tables were removed from both
cleanup paths and the cleanup ledger, and the duplicate company-status deletion
was removed. Missing relations still fail loudly; no conditional skip or error
swallowing was added. The rerun reached all database scenario bodies and improved
to 12/16 files and 22/27 tests passing. Five failures now expose real contract
gaps: two jurisdiction-overlap outcome/detail mismatches, zero successful
identifier-successor attempts, and two lifecycle atomicity cases that fail
closed with `FORBIDDEN` before reaching their intended transaction assertions.
Adapter-parity closure is therefore still not claimed.

The five executable failures were then resolved without changing the semantic
command kernel or weakening approval policy. Jurisdiction overlap now has one
CA-owned outcome factory used by rule checks, command prechecks and an exact,
allowlisted `23P01` constraint normalization; unknown exclusion constraints
still fail closed as `INTERNAL_ERROR` and database details remain private.
Identifier supersession now serializes on the shared predecessor and performs
its predecessor CAS plus replacement insert in one guarded statement. A stale
CAS deliberately selects the already-existing predecessor primary key, causing
canonical `23505` conflict translation and whole-transaction rollback even
when the intended successor-once index is absent. The activation scenarios now
assert the authoritative behavior: both single and simultaneous activation
attempts without a real external approval verifier return `FORBIDDEN` and leave
status, outbox and receipt state unchanged.

A read-only preview catalog probe found a separate deployment-integrity defect:
the migration journal contains entry `26`, but
`ca_company_identifier_recorded_range_check` still uses strict `<` instead of
the migration/living-schema `<=`, and
`ca_company_identifier_supersedes_once_uidx` is absent. No migration was applied
or repaired here. The successor concurrency fixture advances the command clock
by one second so adapter locking/CAS behavior is proven independently of that
known schema drift. The final isolated-preview parity run is green for the
supported 13-table cohort: 16 files and 27 tests passed. Boundary 11 remains
`BLOCKED` because broader governance/officer/meeting/resolution database parity
is absent and the deployment-integrity defect belongs to the prohibited
migration-review lane.

## Event contract additions

- `corporate_administration.legal_company.name_retired.v1`
- `corporate_administration.legal_company.identifier_retired.v1`
- `corporate_administration.legal_company.activity_ended.v1`

Their `@afenda/events` schemas are strict and reject undeclared sensitive
identifier fields.

## Verification

| Command | Exit | Result |
|---|---:|---|
| `pnpm --filter @afenda/corporate-administration lint` | 0 | 218 files checked |
| `pnpm --filter @afenda/corporate-administration typecheck` | 0 | TypeScript clean |
| `pnpm --filter @afenda/corporate-administration check` | 0 | aggregate lint + typecheck + test gate completed in 164.7s |
| `pnpm --filter @afenda/corporate-administration test` | 0 | 54 files passed, 1 environment-gated file skipped; 291 passed, 18 skipped, including registry-bound command authorization, query authorization/diagnostics and recurrence coverage |
| focused command authorization/approval/observability/boundary contracts | 0 | 5 files / 32 tests passed; registry permission derivation, denial, provider exception, opaque token use and public-surface deletion proved |
| focused external-approval package contracts | 0 | 3 files / 13 tests passed; required approval, SoD, binding and absence of a synthetic production verifier remain fail-closed |
| focused web lifecycle approval boundary | 0 | 1 file / 3 tests passed; approval failure remains safely projected and unauthorized tenant work is rejected |
| Neon target posture inspection | 0 | `DATABASE_URL` is present; branch `br-tiny-hill-ao82jp6f` is production; no explicit test-target disposition is configured; no secret value printed |
| Neon preview branch creation | 0 | created `br-still-cloud-aof2rkqv` from production parent `br-tiny-hill-ao82jp6f`; read/write endpoint; automatic expiry `2026-08-09T00:15:09Z`; no local env rewrite |
| Neon preview schema probe | 0 | `neondb` reachable as `neondb_owner`; 13 inherited `ca_*` tables; secrets redacted |
| `pnpm test:corporate-administration:parity` (preview) | 1 | branch `br-still-cloud-aof2rkqv`; 16 files selected; 4 passed / 12 failed; 27 tests total; 8 passed / 19 failed; database suites stopped in scoped cleanup on missing `ca_governance_membership`; duration 102.88s |
| focused cleanup boundary contract | 0 | 1 file / 20 tests passed; deployed cohort excludes migration-0034 governance tables, cleanup remains scoped/non-destructive, duplicate status deletion rejected |
| `pnpm --filter @afenda/corporate-administration typecheck` (cleanup repair) | 0 | TypeScript clean after cleanup import/sequence correction |
| `pnpm test:corporate-administration:parity` (preview rerun) | 1 | branch `br-still-cloud-aof2rkqv`; 16 files selected; 12 passed / 4 failed; 27 tests total; 22 passed / 5 failed; duration 115.47s; failures are jurisdiction overlap normalization, identifier successor concurrency and lifecycle authorization/atomicity expectations |
| preview identifier schema probe | 0 | journal entry `26` present, but deployed recorded-range constraint remains strict `<` and `ca_company_identifier_supersedes_once_uidx` is absent; read-only, secrets redacted |
| focused infrastructure translator | 0 | 1 file / 14 tests passed; exact jurisdiction exclusion constraint maps to the CA-owned overlap outcome, unknown `23P01` remains `INTERNAL_ERROR` |
| focused preview parity repair | 0 | 3 files / 7 tests passed; jurisdiction race, guarded identifier successor CAS and approval fail-closed/no-residue behavior green |
| `pnpm test:corporate-administration:parity` (final preview rerun) | 0 | branch `br-still-cloud-aof2rkqv`; 16 files / 27 tests passed; duration 73.49s; supported inherited 13-table cohort green |
| `pnpm validate:neon-env` | 124 | read-only validation timed out without a summary; not recorded as passing |
| `pnpm --filter @afenda/testing lint` | 0 | 18 files checked |
| `pnpm --filter @afenda/testing typecheck` | 0 | TypeScript clean |
| `pnpm --filter @afenda/testing test` | 0 | 2 files / 39 tests passed; CA lane projection is registry-derived |
| `pnpm --filter @afenda/testing protect:check` | 0 | intentional testing-policy digest refreshed and current |
| `pnpm --filter @afenda/corporate-administration test -- package-boundary` | 0 | 1 file / 20 tests passed; parity runner requires database evidence and an explicit safe target |
| `pnpm test:corporate-administration:parity` | 1 | safe refusal: 16 files selected; 4 pure files / 7 tests passed; all 12 database-backed suites rejected before execution because no `test|preview` target is declared |
| `pnpm check:testing-governance` | 1 | CA lane ambiguity resolved; blocked only by two unrelated UI-system test files outside every declared lane |
| `pnpm --filter @afenda/web typecheck` | 0 | TypeScript clean across the app consumer graph |
| `pnpm --filter @afenda/web test -- corporate-administration-runtime-observability` | 0 | 1 file / 4 projections passed; command terminal outcomes and query success map to the structured logger contract |
| `pnpm check:logger-boundary` | 0 | sealed logger leaf and consumer boundary remain valid |
| `pnpm test:logger-boundary` | 0 | 3/3 boundary mutation tests passed |
| focused CA identity + lifecycle web Actions | 1 | 2 files executed; 13 tests passed and one inherited shell mock test failed because `createCorporateAdministrationGovernanceDependencies` is absent from its mock |
| focused opaque-adapter contracts | 0 | 4 files; 40 passed, 15 environment-gated tests skipped; factories remain callable and concrete class exports are rejected |
| focused CA web Vitest set | 1 | 18 files / 65 tests passed; one inherited CA-2.5 shell mock test failed because `createCorporateAdministrationGovernanceDependencies` is absent from its mock |
| `pnpm --filter @afenda/events lint` | 0 | 48 files checked |
| `pnpm --filter @afenda/events typecheck` | 0 | TypeScript clean |
| `pnpm --filter @afenda/events test` | 0 | 11 files / 58 tests passed |
| semantic surface inspector | 0 | 219 files; 138 source files; 83 test/support files; digest `f0ef8529dfc906c35ded26e5a5c8e351e9e3268a6180cbe74521a3c319bb4004`; package-private command authorization token, no distributed command/query permission interpreter, no public low-level guard, no forbidden logger/metrics package edge and no public Drizzle runtime class export |
| `pnpm validate:modules --write` | 1 | CA command/query registers regenerated from the manifest while preserving unrelated HR-derived content; blocked only by three pre-existing bare `@afenda/metrics` imports outside CA |
| `pnpm governance:packages` | 1 | delegates to the same unrelated metrics failure |
| `pnpm check:docs-trunk-ban` | 0 | 0/6 banned trunks present |
| `git diff --check` | 0 | clean |

The full web test command exceeded the 240-second command budget without a test
summary. It is not recorded as passing.

## Fourteen-boundary matrix

| # | Boundary | Status | Evidence | Remaining condition |
|---:|---|---|---|---|
| 1 | Authority and ownership | DONE | domain definitions + composed registry + contract test | none for this concept |
| 2 | Catalog and dependency governance | BLOCKED | CA manifest/events reconcile in `validate:modules` | three unrelated metrics imports keep repository gate red |
| 3 | Public package contracts | DONE | root projections, fingerprint cutover, required opaque observability port, opaque Drizzle factories, package and app typechecks | none for this concept |
| 4 | Reference and peer boundaries | DONE | operation-registry boundary test; no deep imports or peer writes | none |
| 5 | Schema and migrations | NOT_APPLICABLE | no schema or migration changed | production migrations remain a separate prohibited lane |
| 6 | Tenancy and data isolation | PARTIAL | session-stamped web consumers and existing package tenant contracts | no new Neon cross-tenant execution in this mission |
| 7 | Authorization, approvals and SoD | PARTIAL | exhaustive permission projections; registry-driven command-token and query authorization; fail-closed approval kernels; SoD, denial-before-work and binding tests; external-owner inventory | no external approval owner, endpoint/configuration or production verifier exists; required operations remain denied rather than bypassed |
| 8 | Domain behavior and historical truth | PARTIAL | existing package domain suite remains green | mission did not re-prove every CA historical-truth scenario |
| 9 | Idempotency, concurrency and atomicity | PARTIAL | durable handlers share the private application kernel; preview proves jurisdiction overlap and identifier-successor serialization/CAS rollback; approval-required activation fails closed with no residue | activation rollback/race after a valid external approval remains blocked by `PLATFORM-APPROVALS-01`; broader failure-injection evidence remains incomplete |
| 10 | Events, audit and privacy | DONE | 59-event parity, strict schemas, events 58/58, redaction rejection and exception-observation leakage tests | none for this concept |
| 11 | Adapter parity and database semantics | BLOCKED | canonical fail-closed parity lane ran on isolated preview `br-still-cloud-aof2rkqv`; supported inherited 13-table cohort is green at 16/16 files and 27/27 tests | broader governance/officer/meeting/resolution parity remains absent; preview catalog proves recorded-range/successor-index deployment drift that must be handled by the separate migration-review lane |
| 12 | App composition and Server Actions | DONE | app consumers pass the composed runtime capability instead of store-only projections; command/query logger projection, focused app contract and web typecheck pass | none for this semantic cutover; legacy CA-2.5 closure remains a separate lane |
| 13 | UI, journeys and accessibility | NOT_APPLICABLE | no UI behavior introduced by the registry cutover | CA phase UI closure remains separate |
| 14 | Operations and production readiness | BLOCKED | registry-driven structured operation diagnostics, logger boundaries, docs-trunk and diff gates are green | Prometheus domain-operation metrics, repository governance, Neon, migration/recovery and production lanes are not green |

## Migration impact

No migration or schema file was changed or applied. Production migrations
0034-0046 were not touched. Payroll and Human Resources were not modified by
this mission.

## Remaining conditions

1. Identify the external approval service and provide its stable verification
   contract through the authorized `PLATFORM-APPROVALS-01` prerequisite mission.
2. Repair the unrelated metrics import violations in their own authorized lane
   before claiming repository governance green.
3. Reconcile the five real preview failures as separate bounded behavior slices,
   beginning with authorization-aware lifecycle atomicity fixtures without
   changing the verified authorization kernel.
4. Add database-backed adversarial two-organization evidence before claiming
   tenancy isolation or proceeding to recovery lanes.
