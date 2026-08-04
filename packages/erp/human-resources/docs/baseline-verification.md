# Human Resources Same-Revision Baseline Verification

| Field | Value |
|---|---|
| Status | Recorded; Neon environment verified; full live evidence blocked by governed database migration drift |
| Mission | HR-0.6 — same-revision baseline verification |
| Target | `packages/erp/human-resources` |
| Audience | HR package maintainers, application integrators, platform owners, and release reviewers |
| Final snapshot | 2026-08-02T21:45:54+08:00 |
| Closure repair snapshot | 2026-08-02T22:08:33+08:00 |
| Live-evidence reassessment | 2026-08-02T22:33:38+08:00 |
| Validator cutover snapshot | 2026-08-02T22:45:11+08:00 |
| Migration-projection repair snapshot | 2026-08-02T22:50:14+08:00 |
| Migration-probe registry snapshot | 2026-08-02T22:57:12+08:00 |
| Migration-writer cutover snapshot | 2026-08-02T23:00:24+08:00 |
| Migration data-compatibility snapshot | 2026-08-02T23:04:54+08:00 |
| Git revision | `6c2e46a630c105de1e20d60bb5b1e7abf13c8b93` |
| Branch | `agent/harden-kernels-and-audit-boundaries` |
| Package digest | `0c93d8d5e8e1ffbfcc9bde5acbb3acb55417ec3cd40596e5511675c98cd63cbf` |
| Package lifecycle | `scaffolded` |
| Overall outcome | **BLOCKED — do not start Phase 1 or claim release readiness** |

> This is a Scratch verification record for one package digest in one dirty working tree. It is not a clean-commit attestation, kernel seal, deployment record, security/privacy/legal approval, module-lifecycle promotion, or launch authorization.

## 1. Decision enabled

HR-0.6 has recorded the required baseline and repaired the recorded repository-integration failures. The current validator now resolves exact workspace dependency `neon@2.38.5` through one private, shell-free CLI ingress and passes all 15 checks, including Neon Auth access and trusted-domain verification. Read-only aggregate probes also prove that the existing production data satisfies the explicit preconditions of the four data-sensitive pending migrations (`0039`, `0044`, `0045`, and `0046`). HR-ARCH-00 and Phase 0 nevertheless remain open because the governed database ledger has 12 pending forward migrations and the first live HR parity cohort fails against that stale schema. The focused live Memory/Drizzle reporting parity remains valid for its narrow scope, but it is not a substitute for the complete lane on the governed database revision.

No HR product behavior, public contract, source layout, Payroll transport, or package lifecycle was changed by the closure repair. The repair changed repository governance, tests, generator normalization, and bounded environment validation only.

## 2. Snapshot identity and worktree disposition

The kernel inspector reported 738 package files, including 507 source files and 237 test/support files. The package exposes one production entrypoint, `.`, and one isolated test entrypoint, `./testing`.

The snapshot is dirty and cannot be represented as a clean revision:

| Scope | Modified | Deleted | Untracked | Total status entries |
|---|---:|---:|---:|---:|
| Repository | 275 | 719 | 47 | 1,041 |
| `packages/erp/human-resources` | 200 | 502 | 24 | 726 |
| `docs-V2/_scratch/human-resources` | — | — | one untracked directory entry | 1 |

The HR changes comprise the feature-first relocation plus the HR-0.1–HR-0.5 contract, consumer, registry, architecture, and documentation evidence. They were preserved as found. No reset, restore, clean, deletion, staging, commit, or push was performed.

Repository-wide status is 1,063 entries at the migration-writer-cutover documentation snapshot after changing during verification and concurrent non-HR workspace activity. The HR target remained at 726 entries and retained the same digest. The current evidence is therefore a dirty-working-tree assessment, not a clean-revision attestation. Earlier HR unit, typecheck, consumer, and journey results remain recorded below; the latest reassessment adds direct Neon, migration-ledger, and live-parity evidence without promoting those earlier results to the newer Git revision.

Reproduce the full inventories with:

```powershell
git status --short
git status --short -- packages/erp/human-resources
git status --short -- docs-V2/_scratch/human-resources
node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs packages/erp/human-resources
```

Because the target is dirty and several required gates failed, this record is deliberately not a kernel `SEALED` record.

## 3. Verification matrix

| Gate | Command / scope | Outcome | Evidence |
|---|---|---|---|
| Package lint | `pnpm lint:hr` | PASS | Biome checked 731 files; no fixes applied. |
| Package typecheck | `pnpm typecheck:hr` | PASS | `tsc --noEmit -p tsconfig.json` exited 0. |
| Complete HR unit lane | `pnpm test:hr:unit` | PASS | 138 files and 1,135 tests passed. |
| Frozen contract evidence | Four focused public-contract, consumer-inventory, registry-projection, and architecture-debt specs | PASS | 4 files and 31 tests passed. |
| Feature-first residue guard | `node packages/erp/human-resources/scripts/feature-first-layout.mjs` | PASS | Reported the current feature-first layout valid; this is not proof of the final shallow target. |
| Web consumer typecheck | `pnpm --filter @afenda/web typecheck` | PASS | Direct application consumer compiled. |
| Fixture-derived web unit consumers | 33 requested consumer specs; 31 belong to the web unit lane | PASS | 31 files and 149 tests passed. The two journey specs are governed by the web-scenario lane. |
| Affected web journeys | Two fixture-derived `*journeys.test.ts` specs | **FAIL** | 1 file passed; 1 failed. Seven tests passed and one failed. The missing-employee case expected HR-local wording, while the action returned the canonical `FORBIDDEN` projection with `messageKey`. |
| Payroll consumer typecheck | `pnpm --filter @afenda/payroll typecheck` | PASS | Payroll compiled against the handoff boundary. |
| HR-to-Payroll contracts | Four Payroll handoff/manifest specs | PASS | 4 files and 34 tests passed. |
| HR/Payroll event transport | Three Events schema/handoff specs | PASS | 3 files and 15 tests passed. |
| Module governance | `pnpm validate:modules` | **FAIL** | Validator requires retired `packages/erp/human-resources/src/module.manifest.ts`; the sole current manifest is `src/composition/module.manifest.ts`. |
| Generated compensation action parity | `pnpm check:hr-compensation-actions` | **FAIL** | `apps/web/app/actions/hr-compensation.ts` is stale relative to its generator. |
| Audit writer governance | Audit `direct-writer-boundary.test.ts` | **FAIL** | All 3 tests failed: 23 current HR/Payroll writers are not reconciled, and the test reads retired HR Drizzle paths. |
| DB leave-overlap governance | DB `hr-leave-overlap-exclusion-register.test.ts` | **FAIL** | Suite could not collect because it requires removed `docs-V2/_scratch/erp/human-resources-enterprise-audit/hr-leave-overlap-exclusion-register.json`. |
| Local optional parity diagnostic | `pnpm test:hr:parity` with `CI` and `REQUIRE_DATABASE_TESTS` unset | PASS with limitation | 29 files passed, 9 skipped; 164 tests passed, 206 skipped. This was not pure Memory evidence because some suites ran Drizzle when `.env.local` supplied a database. |
| Explicit Memory-labelled parity | HR parity lane with `--testNamePattern '(memory|Memory)'` | PASS | 27 files passed, 11 skipped; 151 tests passed, 219 skipped. This proves explicitly labelled Memory cases only, not adapter-neutral cases whose names omit Memory. |
| Neon environment validation | `pnpm validate:neon-env` | **UNAVAILABLE** | Timed out after 64 seconds without a validation result. It was not retried with a larger timeout. |
| Required live Drizzle parity | `$env:REQUIRE_DATABASE_TESTS='1'; pnpm test:hr:parity` | **BLOCKED / NOT RUN** | Fail-closed prerequisite did not validate. The optional mixed run does not replace required live evidence. |
| Documentation alignment | This record, the PRD, and roadmap link and status review | PASS | All three surfaces classify HR-0.6 as recorded but blocked and preserve `scaffolded`. |

The table above preserves the original baseline. The closure-repair rerun below supersedes its repository-integration failures; required full-live evidence still prevents HR-0.6 closure.

### Closure-repair rerun

| Gate | Outcome | Evidence |
|---|---|---|
| Module governance | PASS | `pnpm validate:modules` loaded all 13 manifests, matched 7 generated registers, and proved all 22 negative fixtures. Manifest and authorization paths now derive from the existing module metadata registry; no duplicate root manifests were created. |
| Generated compensation action parity | PASS | `pnpm check:hr-compensation-actions` reported the 31-action output current. The generator now emits the single import form that Biome canonicalizes. |
| Canonical error projection journey | PASS | `pnpm test:web:scenario -- hr-self-service-journeys` passed 1 file and 5 tests. The consumer asserts `errorResult.fail("FORBIDDEN")` and no longer owns public wording. |
| Audit writer governance | PASS | The focused audit lane passed 1 file and 3 tests. The governed ledger names all current HR and Payroll atomic writers, exact write/preparation/guard/metadata fan-out, and the living generated SQL callsite; retired paths and the empty legacy allowlist remain absent. |
| Deleted Scratch dependencies | PASS | The obsolete leave-overlap register test and the core-organization exclusion-register helper/assertions were deleted. Executable migration checks, HR leave guards, Memory/Drizzle behavior, and explicit live tests remain the code-owned evidence; the removed Scratch audit pack was not recreated. |
| Explicit local parity gate | PASS | With `CI` and `REQUIRE_DATABASE_TESTS` unset, focused reporting parity passed the Memory case and skipped the Drizzle case: 1 passed, 1 skipped. |
| Focused required live parity | PASS with limitation | With `REQUIRE_DATABASE_TESTS=1`, the same reporting parity ran both adapters: 2 tests passed, including the Drizzle reconciliation. The complete required parity lane, concurrency, failure-injection, and tenant-hostility matrix remain outstanding. |
| Neon environment validation | PARTIAL / BLOCKED | The bounded validator completed in 46 seconds: 12 checks passed, including product/cloud identity, branch access, PITR, protected branch, snapshot inventory, compute, pooler host, and a 115 ms `SELECT 1`. Three Neon CLI-backed checks timed out: Neon Auth access, org-wide project list, and trusted domains. No secret value was logged. |
| Focused formatting and type safety | PASS | Biome checked all 8 changed source/test scripts. Web, audit, and DB typechecks passed. |

### Live-evidence reassessment

| Gate | Outcome | Evidence |
|---|---|---|
| Deterministic Neon environment validation | PASS | The retained current implementation pins `neon@2.38.5`, resolves its declared `neon/cli` entrypoint, executes through Node without a shell, carries the API key only through environment, and applies a bounded process timeout. `pnpm validate:neon-env` completed in 18.5 seconds with 15 checks passed and 0 failed; the focused Auth audit separately passed 3 of 3 checks. No secret value was logged. |
| Governed migration reconciliation | **FAIL — release blocker** | The repaired `pnpm --filter @afenda/db db:migration-status` projection now distinguishes contiguous application from later identities: 47 journal entries, 35 ledger rows, contiguous application only through `0033_schema_reconciliation`, 12 pending migrations, 1 identity applied beyond the gap, 0 unknown rows, and 0 divergent identities. The prior “applied through 0041” wording was removed because it concealed the gap. Pending entries include HR reliability (`0039`, `0040`), platform access/claim leasing (`0042`, `0043`), and Payroll range/output constraints (`0044`–`0046`). The DDL probe registry was normalized to current journal tags, retired HR tags were removed, and read-only live probes returned `ddlApplied: false` for all 12 pending identities; ledger backfill is therefore not permitted. The unregistered, unguarded, non-transactional `apply-migrations.mjs` path was deleted; the guarded transactional package command is now the sole migration writer. The DB package passed lint, typecheck, and all 58 files / 239 executed tests; 13 tests remained intentionally skipped by the existing suite. All 47 repository hook-policy tests passed, including the ad-hoc `apply-*.mjs` denial. |
| Pending-migration data compatibility | PASS — read-only precondition evidence | Aggregate-only production probes found zero HR reliability work items, zero orphan dead letters, zero earning/deduction/statutory rules with inverted or overlapping effective ranges, and zero active assignment range conflicts. Payroll cutover probes found zero runs, run employees, payslips, adjustments, reconciliations, or legacy reversed runs; both required organization-scoped uniqueness constraints are present. No row contents or identifiers were read into evidence. These results authorize no write by themselves; they prove only that the current data does not block the guarded forward migrations. The migration SQL remains the canonical fail-closed enforcement boundary, so no parallel preflight API was introduced. |
| Complete required live HR lane | **INCONCLUSIVE / TIMED OUT** | The registered 38-file fail-closed lane exceeded the single bounded 600-second run without a final result. It was not silently retried or granted a larger timeout. A subsequent broad collection attempt also stalled; only its exact orphaned process tree was terminated. |
| Live parity cohort 1 | **FAIL — environment/schema contract** | A non-overlapping 9-file cohort completed in 145.7 seconds with 12 failures. Direct PostgreSQL error `42703` proves the live `platform_domain_event` table lacks canonical column `claim_token`, which is defined by schema owner `packages/data-plane/db/src/schema/platform.ts` and migration `0043_event_claim_lease.sql`. Several organization/position setups also returned failure before their assertions. The remaining 29 files were deliberately paused because results against the known stale database revision would not be release evidence. |

The package digest remains unchanged because the reassessment did not edit `packages/erp/human-resources`. The dirty repository has 1,063 status entries while the HR target remains at 726; this is still not clean-revision evidence. No migration, data repair, ledger write, or other external-state change was performed during this reassessment.

## 4. Frozen semantic evidence

### Public facade

The public-contract fixture digest is `96b40d9a668bb1b0984fc0f6dd3e913798757b0673324d53a0c0157e8af3ca58`.

| Entrypoint | Owner | Symbols | Capabilities |
|---|---|---:|---:|
| `.` | Production | 2,806 | 23 |
| `./testing` | Testing only | 13 | 0 |

The root remains the only production business facade. `./testing` is limited to test construction and parity harnesses.

### Consumer inventory

The consumer fixture records 1,441 references across 109 files: 1,406 allowed, 2 testing-entrypoint uses allowlisted, 33 requiring manual review, and 0 classified as forbidden. This inventory is a freeze of observed consumers, not approval of every filesystem-reading or generated reference.

### Canonical registries

The registry fixture contains 560 operations—360 commands and 200 queries—121 events, and 16 explicit temporal-policy overrides. Authorization, transaction, idempotency, audit/emission, privacy, observability, and temporal projections remain derived from their canonical registries rather than consumer-owned maps.

## 5. Architecture debt baseline

Every category retains a target of zero. The measured counts are debt, never an allowlist:

| Category | Observed | Target |
|---|---:|---:|
| Directory depth | 487 | 0 |
| Feature → composition imports | 31 | 0 |
| Feature → facade imports | 0 | 0 |
| Production → testing imports | 2 | 0 |
| Feature composite-store references | 29 | 0 |
| Cross-feature imports | 136 | 0 |
| Reciprocal feature cycles | 5 | 0 |
| Feature adapters naming the composite store | 28 | 0 |
| Consumer deep imports | 0 | 0 |
| Tests reading retired paths | 18 | 0 |

The package therefore does not satisfy the final `src/<approved-owner>/<file>` shallow target even though the retired layer-first roots are absent.

## 6. Required closure repairs

These repairs belong to the continuing HR-0.6 closure mission. They do not authorize feature work or a structural cutover.

1. **Closed — module governance.** The accepted manifest and authorization source paths are owned by the existing module metadata registry; no duplicate facade was added.
2. **Closed — audit ownership.** All detected current writers are governed by exact atomic-write contracts; retired-path readers and blanket legacy allowances are absent.
3. **Closed — ghost audit registers.** Tests no longer load deleted Scratch audit JSON. Executable code, migrations, and parity own the surviving invariants.
4. **Closed — error projection.** The web journey consumes the canonical `@afenda/errors` projection.
5. **Closed — compensation generation.** The generator and checked action agree after canonical import normalization.
6. **Closed — parity gating.** HR Drizzle describes require the explicit live-evidence gate, and the DB invariant suite uses the same fail-closed posture.
7. **Closed — reproducible Neon environment evidence.** The retained pinned CLI ingress, 25 focused tests, 3-check Auth audit, and current 15-check validator run provide reproducible same-revision evidence without a floating package resolver or shell execution.
8. **Closed — migration operator capability cutover.** The guarded, direct-URL, additive-policy, single-transaction `db:migrate` path is the sole migration writer. The stale unregistered `apply-migrations.mjs` implementation and retired DDL-probe tags are deleted, current probe tags are journal-validated, and repository hooks reject ad-hoc `apply-*.mjs` execution.
9. **Open — governed database revision.** Apply the 12 pending identities through the guarded transactional forward-migration procedure using an operator-supplied direct migration URL, then prove the ledger has zero pending, unknown, divergent, or out-of-order identities. Do not use ledger backfill: all 12 read-only DDL probes prove the governed artifacts are absent. Read-only aggregate probes found no current data incompatibility for the four data-sensitive migrations, but this is not migration authorization. The operational database change was not performed by this verification.
10. **Open — complete live evidence.** After the governed database revision is current, run all 38 registered Drizzle parity, concurrency, rollback, tenant-hostility, and failure-injection files against one recorded snapshot. Do not treat cohort results from the stale schema as product defects or release evidence without independent reproduction on the governed revision.

Run the remaining complete matrix against one final recorded repository snapshot and package digest. Only then may HR-ARCH-00 and Phase 0 be considered for closure.

## 7. Readiness boundary

This record proves substantial package-local behavior and a stable HR-to-Payroll boundary. It also proves that repository integration is currently inconsistent. It does not establish production scale, recovery execution, migration rehearsal, accessibility, Malaysia or Vietnam legal/privacy compliance, independent assurance, deployment, release approval, or lifecycle promotion.

## 8. Related documents

- [Human Resources Product Requirements](human-resources-prd.md)
- [Human Resources Development Roadmap](development-roadmap.md)
- [`@afenda/human-resources` package README](../../../packages/erp/human-resources/README.md)
